import { describe, expect, it } from 'vitest'
import { applyHoldMigrations, makeTestD1 } from './d1-testkit'

const RUN_COLUMNS =
  'INSERT INTO runs (nonce, day_key, duration_bucket, device_type, trusted, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)'

describe('hold-button D1 数据模型', () => {
  it('同 nonce 第二次插入失败，直方图只增加一次', async () => {
    const db = makeTestD1()
    await applyHoldMigrations(db)

    await db.prepare(RUN_COLUMNS).bind('nonce-1', '2026-08-09', 42, 'touch', 1, 1_000).run()
    await expect(
      db.prepare(RUN_COLUMNS).bind('nonce-1', '2026-08-09', 42, 'touch', 1, 2_000).run(),
    ).rejects.toThrow()

    const row = await db
      .prepare(
        'SELECT run_count FROM daily_histogram WHERE day_key = ? AND device_type = ? AND duration_bucket = ?',
      )
      .bind('2026-08-09', 'touch', 42)
      .first<{ run_count: number }>()
    expect(row?.run_count).toBe(1)
  })

  it('trusted=0 的隔离成绩不进直方图', async () => {
    const db = makeTestD1()
    await applyHoldMigrations(db)

    await db.prepare(RUN_COLUMNS).bind('nonce-2', '2026-08-09', 99, 'desktop', 0, 1_000).run()

    const total = await db
      .prepare('SELECT COALESCE(SUM(run_count), 0) AS total FROM daily_histogram WHERE day_key = ?')
      .bind('2026-08-09')
      .first<{ total: number }>()
    expect(total?.total).toBe(0)
  })

  it('可信成绩同桶累加、不同桶分开', async () => {
    const db = makeTestD1()
    await applyHoldMigrations(db)

    await db.prepare(RUN_COLUMNS).bind('nonce-a', '2026-08-09', 30, 'touch', 1, 1_000).run()
    await db.prepare(RUN_COLUMNS).bind('nonce-b', '2026-08-09', 30, 'touch', 1, 2_000).run()
    await db.prepare(RUN_COLUMNS).bind('nonce-c', '2026-08-09', 31, 'touch', 1, 3_000).run()

    const same = await db
      .prepare('SELECT run_count FROM daily_histogram WHERE day_key = ? AND duration_bucket = ?')
      .bind('2026-08-09', 30)
      .first<{ run_count: number }>()
    expect(same?.run_count).toBe(2)
  })

  it('非法 device_type 与越界时长桶被 CHECK 拒绝', async () => {
    const db = makeTestD1()
    await applyHoldMigrations(db)

    await expect(
      db.prepare(RUN_COLUMNS).bind('nonce-x', '2026-08-09', 30, 'console', 1, 1_000).run(),
    ).rejects.toThrow()
    await expect(
      db.prepare(RUN_COLUMNS).bind('nonce-y', '2026-08-09', 1_500, 'touch', 1, 1_000).run(),
    ).rejects.toThrow()
  })

  it('sessions 表拒绝非法 device_type', async () => {
    const db = makeTestD1()
    await applyHoldMigrations(db)

    await expect(
      db
        .prepare('INSERT INTO sessions (nonce, started_at_ms, expires_at_ms, device_type) VALUES (?, ?, ?, ?)')
        .bind('nonce-s', 1_000, 2_000, 'vr')
        .run(),
    ).rejects.toThrow()
  })
})
