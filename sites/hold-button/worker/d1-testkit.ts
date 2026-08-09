// 测试基座：node:sqlite 是真实的 SQLite 引擎，与 D1 使用同一方言，
// 用来在 Vitest（node 环境、无 workerd）中验证 migration、唯一约束与 trigger。
// 仅被测试文件引用，wrangler 不会打包本文件。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

interface TestD1Statement {
  bind(...values: unknown[]): TestD1Statement
  run(): Promise<{ success: boolean; meta: { changes: number } }>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>
}

export interface TestD1Database {
  prepare(sql: string): TestD1Statement
  exec(sql: string): Promise<void>
}

export function makeTestD1(): TestD1Database {
  const db = new DatabaseSync(':memory:')
  return {
    prepare(sql: string): TestD1Statement {
      let values: unknown[] = []
      const statement: TestD1Statement = {
        bind(...next: unknown[]) {
          values = next
          return statement
        },
        async run() {
          const prepared = db.prepare(sql)
          const result = prepared.run(...(values as never[]))
          return { success: true, meta: { changes: Number(result.changes) } }
        },
        async all<T = Record<string, unknown>>() {
          const prepared = db.prepare(sql)
          return { results: prepared.all(...(values as never[])) as T[] }
        },
        async first<T = Record<string, unknown>>(column?: string) {
          const prepared = db.prepare(sql)
          const rows = prepared.all(...(values as never[])) as Record<string, unknown>[]
          const [head] = rows
          if (!head) return null
          return (column ? head[column] : head) as T
        },
      }
      return statement
    },
    async exec(sql: string) {
      db.exec(sql)
    },
  }
}

/** 把 migrations 目录下的初始化脚本应用到测试库，不触碰任何远程数据库 */
export async function applyHoldMigrations(db: TestD1Database): Promise<void> {
  const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '../migrations/0001_init.sql')
  const sql = readFileSync(migrationPath, 'utf8')
  await db.exec(sql)
}
