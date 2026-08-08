// 测试基座：node:sqlite 是真实的 SQLite 引擎，与 Durable Object SQLite 使用同一方言，
// 用来在 Vitest（node 环境、无 workerd）中驱动 NextQuestionChain。仅被测试文件引用，
// wrangler 不会打包本文件。
import { DatabaseSync } from 'node:sqlite'
import { NextQuestionChain } from './question-chain'
import type { NextQuestionEnv } from './env'

interface TestCursor {
  toArray(): Record<string, unknown>[]
  one(): Record<string, unknown>
  rowsRead: number
  rowsWritten: number
}

function makeCursor(rows: Record<string, unknown>[], rowsRead: number, rowsWritten: number): TestCursor {
  return {
    toArray: () => rows,
    one: () => {
      if (rows.length !== 1) throw new Error(`one() 期望恰好 1 行，实际 ${rows.length}`)
      return rows[0]
    },
    rowsRead,
    rowsWritten,
  }
}

export interface TestSqlStorage {
  exec(query: string, ...bindings: unknown[]): TestCursor
  transactionSync<T>(callback: () => T): T
  close(): void
}

export function makeTestSqlStorage(): TestSqlStorage {
  const db = new DatabaseSync(':memory:')
  return {
    exec(query: string, ...bindings: unknown[]) {
      const statement = db.prepare(query)
      if (/^\s*(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(query)) {
        const rows = statement.all(...(bindings as never[])) as Record<string, unknown>[]
        return makeCursor(rows, rows.length, 0)
      }
      const result = statement.run(...(bindings as never[]))
      return makeCursor([], 0, Number(result.changes))
    },
    transactionSync<T>(callback: () => T): T {
      db.exec('BEGIN IMMEDIATE')
      try {
        const value = callback()
        db.exec('COMMIT')
        return value
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    close() {
      db.close()
    },
  }
}

export interface TestDurableObjectContext {
  storage: {
    sql: TestSqlStorage
    transactionSync<T>(callback: () => T): T
    getAlarm(): number | null
    setAlarm(time: number | Date): void
    deleteAlarm(): void
  }
  scheduledAlarm(): number | null
}

export function makeTestDurableObjectContext(): TestDurableObjectContext {
  const sql = makeTestSqlStorage()
  let alarm: number | null = null
  return {
    storage: {
      sql,
      transactionSync: (callback) => sql.transactionSync(callback),
      getAlarm: () => alarm,
      setAlarm: (time) => {
        alarm = typeof time === 'number' ? time : time.getTime()
      },
      deleteAlarm: () => {
        alarm = null
      },
    },
    scheduledAlarm: () => alarm,
  }
}

export interface TestChainHarness {
  chain: NextQuestionChain
  ctx: TestDurableObjectContext
}

export function makeTestChain(env: Partial<NextQuestionEnv> = {}): TestChainHarness {
  const ctx = makeTestDurableObjectContext()
  const chain = new NextQuestionChain(
    ctx as unknown as DurableObjectState,
    env as NextQuestionEnv,
  )
  return { chain, ctx }
}
