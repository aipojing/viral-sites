import { DurableObject } from 'cloudflare:workers'
import type { NextQuestionEnv } from './env'
import { deriveCapability, equalCapability, isValidTokenFormat, randomSecret } from './tokens'
import type {
  ChainEntry,
  ChainStatus,
  CloseChainInput,
  CreateChainInput,
  CreateChainResult,
  PublicChain,
  Slot,
  SubmitBatonInput,
  SubmitBatonResult,
} from './types'

export type ChainErrorCode =
  | 'invalid_token'
  | 'chain_not_found'
  | 'chain_advanced'
  | 'chain_expired'
  | 'chain_cancelled'

// 错误信息只携带稳定 code，API 层据此映射 HTTP 状态与前端文案；
// 跨 DO RPC 传递时 code 字段可能丢失，message 永远是 code 本身。
export class ChainError extends Error {
  constructor(public readonly code: ChainErrorCode) {
    super(code)
  }
}

const WAITING_TTL_MS = 7 * 86_400_000
const COMPLETED_TTL_MS = 90 * 86_400_000
const FINAL_SLOT = 6
const BATON_SLOTS = [2, 3, 4, 5, 6] as const

type ChainRow = {
  slug: string
  status: ChainStatus
  next_slot: number | null
  chain_secret: string | null
  created_at: number
  updated_at: number
  expires_at: number
}

type EntryRow = {
  slot: number
  nickname: string
  answer: string | null
  question: string
  submitted_at: number
  redacted: number
}

type SubmissionRow = {
  response_json: string
}

function toPublicEntry(row: EntryRow): ChainEntry {
  const slot = row.slot as Slot
  if (row.redacted === 1) {
    return { slot, nickname: '', answer: null, question: '', submittedAt: row.submitted_at, redacted: true }
  }
  return {
    slot,
    nickname: row.nickname,
    answer: row.answer,
    question: row.question,
    submittedAt: row.submitted_at,
    redacted: false,
  }
}

export class NextQuestionChain extends DurableObject<NextQuestionEnv> {
  constructor(ctx: DurableObjectState, env: NextQuestionEnv) {
    super(ctx, env)
    const sql = this.ctx.storage.sql
    sql.exec(`CREATE TABLE IF NOT EXISTS chain (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      slug TEXT NOT NULL,
      status TEXT NOT NULL,
      next_slot INTEGER,
      chain_secret TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`)
    sql.exec(`CREATE TABLE IF NOT EXISTS entries (
      slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 6),
      nickname TEXT NOT NULL,
      answer TEXT,
      question TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      redacted INTEGER NOT NULL DEFAULT 0 CHECK (redacted IN (0, 1))
    )`)
    sql.exec(`CREATE TABLE IF NOT EXISTS submissions (
      request_id TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`)
  }

  async create(
    slug: string,
    input: Omit<CreateChainInput, 'installationId'>,
    now: number,
  ): Promise<CreateChainResult> {
    const firstRead = this.readChainRow()
    if (firstRead) return this.replayOrCreate(input.requestId)

    const chainSecret = randomSecret()
    const ownerToken = await deriveCapability(chainSecret, 'owner')
    const batonToken = await deriveCapability(chainSecret, 'baton:2')

    // HMAC 的 await 会释放输入门：写入前必须重新读取当前状态。
    const row = this.readChainRow()
    if (row) return this.replayOrCreate(input.requestId)

    const expiresAt = now + WAITING_TTL_MS
    const result: CreateChainResult = {
      chain: {
        slug,
        status: 'waiting',
        nextSlot: 2,
        entries: [
          {
            slot: 1,
            nickname: input.nickname,
            answer: null,
            question: input.question,
            submittedAt: now,
            redacted: false,
          },
        ],
        createdAt: now,
        updatedAt: now,
        expiresAt,
      },
      ownerToken,
      batonToken,
    }
    this.ctx.storage.transactionSync(() => {
      const sql = this.ctx.storage.sql
      sql.exec(
        'INSERT INTO chain (singleton, slug, status, next_slot, chain_secret, created_at, updated_at, expires_at) VALUES (1, ?, ?, 2, ?, ?, ?, ?)',
        slug,
        'waiting',
        chainSecret,
        now,
        now,
        expiresAt,
      )
      sql.exec(
        'INSERT INTO entries (slot, nickname, answer, question, submitted_at, redacted) VALUES (1, ?, NULL, ?, ?, 0)',
        input.nickname,
        input.question,
        now,
      )
      sql.exec(
        'INSERT INTO submissions (request_id, response_json, created_at) VALUES (?, ?, ?)',
        input.requestId,
        JSON.stringify(result),
        now,
      )
    })
    await this.ctx.storage.setAlarm(expiresAt)
    return result
  }

  async getPublic(now: number): Promise<PublicChain | null> {
    const row = this.readChainRow()
    if (!row) return null
    if (row.status === 'deleted' || row.status === 'expired') {
      return this.tombstone(row)
    }
    if (row.status !== 'completed' && now >= row.expires_at) {
      return { ...this.tombstone(row), status: 'expired' }
    }
    return this.buildPublic(row)
  }

  async submitBaton(token: string, input: SubmitBatonInput, now: number): Promise<SubmitBatonResult> {
    let row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    this.assertBatonLive(row, now)

    const stored = this.readSubmission(input.requestId)
    if (stored) return JSON.parse(stored) as SubmitBatonResult

    if (!isValidTokenFormat(token) || row.chain_secret === null) {
      throw new ChainError('invalid_token')
    }
    // 所有 HMAC 派生都在重读状态之前完成；重读之后只做同步判断与同步写入。
    const secret = row.chain_secret
    const derived = new Map<number, string>()
    for (const slot of BATON_SLOTS) {
      derived.set(slot, await deriveCapability(secret, `baton:${slot}`))
    }

    row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    this.assertBatonLive(row, now)
    if (row.status !== 'waiting' || row.next_slot === null) throw new ChainError('chain_advanced')

    const currentSlot = row.next_slot as Slot
    const expected = derived.get(currentSlot)
    if (!expected || !equalCapability(token, expected)) {
      for (let slot = 2; slot < currentSlot; slot += 1) {
        const used = derived.get(slot)
        if (used && equalCapability(token, used)) throw new ChainError('chain_advanced')
      }
      throw new ChainError('invalid_token')
    }

    const participantToken = await deriveCapability(secret, `participant:${currentSlot}`)
    row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    this.assertBatonLive(row, now)
    if (row.status !== 'waiting' || row.next_slot !== currentSlot) throw new ChainError('chain_advanced')

    const status: ChainStatus = currentSlot === FINAL_SLOT ? 'returned' : 'waiting'
    const nextSlot: Slot | null = currentSlot === FINAL_SLOT ? 1 : ((currentSlot + 1) as Slot)
    const nextBatonToken = currentSlot === FINAL_SLOT ? null : (derived.get(currentSlot + 1) ?? null)
    const expiresAt = now + WAITING_TTL_MS

    const result = this.ctx.storage.transactionSync((): SubmitBatonResult => {
      const sql = this.ctx.storage.sql
      sql.exec(
        'INSERT INTO entries (slot, nickname, answer, question, submitted_at, redacted) VALUES (?, ?, ?, ?, ?, 0)',
        currentSlot,
        input.nickname,
        input.answer,
        input.question,
        now,
      )
      sql.exec(
        'UPDATE chain SET status = ?, next_slot = ?, updated_at = ?, expires_at = ? WHERE singleton = 1',
        status,
        nextSlot,
        now,
        expiresAt,
      )
      const freshRow = this.readChainRow()
      if (!freshRow) throw new ChainError('chain_not_found')
      const built: SubmitBatonResult = {
        chain: this.buildPublic(freshRow),
        participantToken,
        nextBatonToken,
      }
      sql.exec(
        'INSERT INTO submissions (request_id, response_json, created_at) VALUES (?, ?, ?)',
        input.requestId,
        JSON.stringify(built),
        now,
      )
      return built
    })
    await this.ctx.storage.setAlarm(expiresAt)
    return result
  }

  async close(token: string, input: CloseChainInput, now: number): Promise<PublicChain> {
    let row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    if (row.status === 'deleted') throw new ChainError('chain_not_found')
    if (row.status === 'expired' || now >= row.expires_at) throw new ChainError('chain_expired')
    if (row.status === 'cancelled') throw new ChainError('chain_cancelled')

    const stored = this.readSubmission(input.requestId)
    if (stored) return JSON.parse(stored) as PublicChain

    if (row.status === 'completed') throw new ChainError('chain_advanced')
    if (!isValidTokenFormat(token) || row.chain_secret === null) {
      throw new ChainError('invalid_token')
    }
    const ownerToken = await deriveCapability(row.chain_secret, 'owner')

    row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    if (row.status === 'deleted') throw new ChainError('chain_not_found')
    if (row.status === 'expired' || now >= row.expires_at) throw new ChainError('chain_expired')
    if (row.status === 'cancelled') throw new ChainError('chain_cancelled')
    if (row.status !== 'returned') throw new ChainError('chain_advanced')
    if (!equalCapability(token, ownerToken)) throw new ChainError('invalid_token')

    const expiresAt = now + COMPLETED_TTL_MS
    const chain = this.ctx.storage.transactionSync((): PublicChain => {
      const sql = this.ctx.storage.sql
      sql.exec('UPDATE entries SET answer = ? WHERE slot = 1', input.answer)
      sql.exec(
        'UPDATE chain SET status = ?, next_slot = NULL, updated_at = ?, expires_at = ? WHERE singleton = 1',
        'completed',
        now,
        expiresAt,
      )
      const freshRow = this.readChainRow()
      if (!freshRow) throw new ChainError('chain_not_found')
      const built = this.buildPublic(freshRow)
      sql.exec(
        'INSERT INTO submissions (request_id, response_json, created_at) VALUES (?, ?, ?)',
        input.requestId,
        JSON.stringify(built),
        now,
      )
      return built
    })
    await this.ctx.storage.setAlarm(expiresAt)
    return chain
  }

  async redact(token: string, slot: Slot, requestId: string, now: number): Promise<PublicChain> {
    let row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    if (row.status === 'deleted') throw new ChainError('chain_not_found')
    if (row.status === 'expired' || now >= row.expires_at) throw new ChainError('chain_expired')

    const stored = this.readSubmission(requestId)
    if (stored) return JSON.parse(stored) as PublicChain

    if (!isValidTokenFormat(token) || row.chain_secret === null) {
      throw new ChainError('invalid_token')
    }
    const secret = row.chain_secret
    const participantToken = await deriveCapability(secret, `participant:${slot}`)
    const ownerToken = slot === 1 ? await deriveCapability(secret, 'owner') : null

    row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    if (row.status === 'deleted') throw new ChainError('chain_not_found')
    if (row.status === 'expired' || now >= row.expires_at) throw new ChainError('chain_expired')

    const hasEntry = this.ctx.storage.sql
      .exec<EntryRow>('SELECT slot FROM entries WHERE slot = ?', slot)
      .toArray()
    if (hasEntry.length === 0) throw new ChainError('invalid_token')

    const allowed =
      equalCapability(token, participantToken) ||
      (ownerToken !== null && equalCapability(token, ownerToken))
    if (!allowed) throw new ChainError('invalid_token')

    // 当前尚未被回答的问题：waiting 时是第 nextSlot-1 席留下的问题，returned 时是第 6 席的 Q6。
    const cancelsChain =
      (row.status === 'waiting' && row.next_slot !== null && slot === row.next_slot - 1) ||
      (row.status === 'returned' && slot === FINAL_SLOT)
    const wasCompleted = row.status === 'completed'

    const chain = this.ctx.storage.transactionSync((): PublicChain => {
      const sql = this.ctx.storage.sql
      sql.exec('UPDATE entries SET redacted = 1 WHERE slot = ?', slot)
      // 清空幂等缓存，防止旧响应在重试中重新泄露已撤回文本
      sql.exec('DELETE FROM submissions')
      if (cancelsChain) {
        sql.exec(
          'UPDATE chain SET status = ?, next_slot = NULL, updated_at = ?, expires_at = ? WHERE singleton = 1',
          'cancelled',
          now,
          now + WAITING_TTL_MS,
        )
      } else if (!wasCompleted) {
        sql.exec(
          'UPDATE chain SET updated_at = ?, expires_at = ? WHERE singleton = 1',
          now,
          now + WAITING_TTL_MS,
        )
      } else {
        sql.exec('UPDATE chain SET updated_at = ? WHERE singleton = 1', now)
      }
      const freshRow = this.readChainRow()
      if (!freshRow) throw new ChainError('chain_not_found')
      const built = this.buildPublic(freshRow)
      // 清掉旧响应后登记本次撤回响应，保证相同 requestId 的幂等重试
      sql.exec(
        'INSERT INTO submissions (request_id, response_json, created_at) VALUES (?, ?, ?)',
        requestId,
        JSON.stringify(built),
        now,
      )
      return built
    })
    if (cancelsChain || !wasCompleted) {
      await this.ctx.storage.setAlarm(now + WAITING_TTL_MS)
    }
    return chain
  }

  async deleteChain(token: string, requestId: string, now: number): Promise<void> {
    let row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    if (row.status === 'deleted') return

    if (!isValidTokenFormat(token) || row.chain_secret === null) {
      throw new ChainError('invalid_token')
    }
    const ownerToken = await deriveCapability(row.chain_secret, 'owner')

    row = this.readChainRow()
    if (!row) throw new ChainError('chain_not_found')
    if (row.status === 'deleted') return
    if (!equalCapability(token, ownerToken)) throw new ChainError('invalid_token')

    this.ctx.storage.transactionSync(() => {
      const sql = this.ctx.storage.sql
      sql.exec('DELETE FROM entries')
      sql.exec('DELETE FROM submissions')
      sql.exec(
        'UPDATE chain SET status = ?, next_slot = NULL, chain_secret = NULL, updated_at = ? WHERE singleton = 1',
        'deleted',
        now,
      )
    })
    await this.ctx.storage.deleteAlarm()
  }

  async alarm(): Promise<void> {
    const now = Date.now()
    const row = this.readChainRow()
    if (!row || row.status === 'deleted' || row.status === 'expired') return
    if (now < row.expires_at) {
      await this.ctx.storage.setAlarm(row.expires_at)
      return
    }
    this.ctx.storage.transactionSync(() => {
      const sql = this.ctx.storage.sql
      sql.exec('DELETE FROM entries')
      sql.exec('DELETE FROM submissions')
      sql.exec(
        'UPDATE chain SET status = ?, next_slot = NULL, chain_secret = NULL, updated_at = ? WHERE singleton = 1',
        'expired',
        now,
      )
    })
  }

  private assertBatonLive(row: ChainRow, now: number): void {
    if (row.status === 'deleted') throw new ChainError('chain_not_found')
    if (row.status === 'expired' || now >= row.expires_at) throw new ChainError('chain_expired')
    if (row.status === 'cancelled') throw new ChainError('chain_cancelled')
    if (row.status === 'completed' || row.status === 'returned') throw new ChainError('chain_advanced')
  }

  private replayOrCreate(requestId: string): CreateChainResult {
    const stored = this.readSubmission(requestId)
    if (stored) return JSON.parse(stored) as CreateChainResult
    throw new ChainError('chain_advanced')
  }

  private readChainRow(): ChainRow | null {
    const rows = this.ctx.storage.sql
      .exec<ChainRow>(
        'SELECT slug, status, next_slot, chain_secret, created_at, updated_at, expires_at FROM chain WHERE singleton = 1',
      )
      .toArray()
    return rows[0] ?? null
  }

  private readSubmission(requestId: string): string | null {
    const rows = this.ctx.storage.sql
      .exec<SubmissionRow>('SELECT response_json FROM submissions WHERE request_id = ?', requestId)
      .toArray()
    return rows[0]?.response_json ?? null
  }

  private buildPublic(row: ChainRow): PublicChain {
    const entries = this.ctx.storage.sql
      .exec<EntryRow>(
        'SELECT slot, nickname, answer, question, submitted_at, redacted FROM entries ORDER BY slot',
      )
      .toArray()
      .map(toPublicEntry)
    return {
      slug: row.slug,
      status: row.status,
      nextSlot: row.next_slot as Slot | null,
      entries,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
    }
  }

  private tombstone(row: ChainRow): PublicChain {
    return {
      slug: row.slug,
      status: row.status,
      nextSlot: null,
      entries: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
    }
  }
}
