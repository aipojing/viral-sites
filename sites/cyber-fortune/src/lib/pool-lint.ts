import { CONTENT_BLACKLIST } from '../content/blacklist'
import type { Pools } from '../content/pools'

export interface LintViolation {
  where: string
  text: string
  rule: 'blacklist' | 'length' | 'duplicate' | 'conflict-integrity'
}

const MAX_POEM_LINE = 8
const MAX_ITEM_TEXT = 8
const MAX_PERSON_TEXT = 12

function checkBlacklist(where: string, text: string): LintViolation[] {
  return CONTENT_BLACKLIST.filter((word) => text.includes(word)).map(() => ({
    where,
    text,
    rule: 'blacklist' as const,
  }))
}

function checkLength(where: string, text: string, max: number): LintViolation[] {
  return Array.from(text).length > max ? [{ where, text, rule: 'length' }] : []
}

function checkDuplicates(where: string, texts: readonly string[]): LintViolation[] {
  const seen = new Set<string>()
  const out: LintViolation[] = []
  for (const text of texts) {
    if (seen.has(text)) out.push({ where, text, rule: 'duplicate' })
    seen.add(text)
  }
  return out
}

export function lintPools(pools: Pools): LintViolation[] {
  const violations: LintViolation[] = []

  for (const poem of pools.poems) {
    for (const line of poem.lines) {
      violations.push(...checkBlacklist(`poems/${poem.id}`, line))
      violations.push(...checkLength(`poems/${poem.id}`, line, MAX_POEM_LINE))
    }
  }
  for (const item of pools.yi) {
    violations.push(...checkBlacklist(`yi/${item.id}`, item.text))
    violations.push(...checkLength(`yi/${item.id}`, item.text, MAX_ITEM_TEXT))
  }
  for (const item of pools.ji) {
    violations.push(...checkBlacklist(`ji/${item.id}`, item.text))
    violations.push(...checkLength(`ji/${item.id}`, item.text, MAX_ITEM_TEXT))
  }
  for (const person of pools.people) {
    violations.push(...checkBlacklist(`people/${person.id}`, person.text))
    violations.push(...checkLength(`people/${person.id}`, person.text, MAX_PERSON_TEXT))
  }

  violations.push(...checkDuplicates('yi', pools.yi.map((i) => i.text)))
  violations.push(...checkDuplicates('ji', pools.ji.map((i) => i.text)))
  violations.push(...checkDuplicates('people', pools.people.map((i) => i.text)))
  violations.push(
    ...checkDuplicates('poems', pools.poems.map((p) => p.lines.join('，'))),
  )

  const yiIds = new Set(pools.yi.map((i) => i.id))
  const jiIds = new Set(pools.ji.map((i) => i.id))
  for (const pair of pools.conflicts) {
    if (!yiIds.has(pair.yi) || !jiIds.has(pair.ji)) {
      violations.push({
        where: 'conflicts',
        text: `${pair.yi}×${pair.ji}`,
        rule: 'conflict-integrity',
      })
    }
  }

  return violations
}
