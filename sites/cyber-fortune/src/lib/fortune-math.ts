import { fnv1a, pickN, pickOne, seededSequence, type SeededSequence } from '@viral/shared'
import {
  LEVELS,
  POOLS,
  POOL_VERSION,
  type FortuneLevel,
  type Poem,
  type PoolItem,
} from '../content/pools'
import { dateKeyUTC8 } from './date-utils'

export interface Fortune {
  dateKey: string
  nickname: string
  level: FortuneLevel
  poem: Poem
  yi: readonly [PoolItem, PoolItem]
  ji: readonly [PoolItem, PoolItem]
  guiren: PoolItem
  xiaoren: PoolItem
}

export function normalizeNickname(raw: string): string {
  return raw.trim().normalize('NFC').toLowerCase()
}

export function fortuneSeed(
  nickname: string,
  dateKey: string,
  version: string = POOL_VERSION,
): number {
  return fnv1a(`${normalizeNickname(nickname)}|${dateKey}|${version}`)
}

function pickLevel(next: SeededSequence): FortuneLevel {
  const total = LEVELS.reduce((sum, l) => sum + l.weight, 0)
  let roll = next() * total
  for (const level of LEVELS) {
    roll -= level.weight
    if (roll < 0) return level.id
  }
  return LEVELS[LEVELS.length - 1].id
}

export function drawFortune(nickname: string, date: Date): Fortune {
  const dateKey = dateKeyUTC8(date)
  const next = seededSequence(fortuneSeed(nickname, dateKey))

  const level = pickLevel(next)
  const poem = pickOne(next, POOLS.poems.filter((p) => p.level === level))

  const [yi1, yi2] = pickN(next, POOLS.yi, 2)
  const yiIds = new Set([yi1.id, yi2.id])
  const bannedJi = new Set(
    POOLS.conflicts.filter((pair) => yiIds.has(pair.yi)).map((pair) => pair.ji),
  )
  const jiCandidates = POOLS.ji.filter((item) => !bannedJi.has(item.id))
  const [ji1, ji2] = pickN(next, jiCandidates, 2)

  const [guiren, xiaoren] = pickN(next, POOLS.people, 2)

  return {
    dateKey,
    nickname: nickname.trim(),
    level,
    poem,
    yi: [yi1, yi2],
    ji: [ji1, ji2],
    guiren,
    xiaoren,
  }
}
