import { DurableObject } from 'cloudflare:workers'
import type { AiJudgeEnv } from './env'

export type AuthorizeResult = { ok: true } | { ok: false; reason: 'rate_limited' }

export type ReserveResult =
  | { ok: true; reservationId: string; budgetRatio: number }
  | { ok: false; reason: 'budget_paused'; budgetRatio: number }

/**
 * 每日预算预留与每日身份次数。Task 4 用真实原子状态实现替换本空实现；
 * 替换前任何调用都会得到保守的拒绝结果。
 */
export class JudgeGate extends DurableObject<AiJudgeEnv> {
  async authorize(_identityHash: string): Promise<AuthorizeResult> {
    return { ok: false, reason: 'rate_limited' }
  }

  async reserveBudget(_maxCostFen: number): Promise<ReserveResult> {
    return { ok: false, reason: 'budget_paused', budgetRatio: 1 }
  }

  async settle(_reservationId: string, _actualCostFen: number): Promise<void> {
    // 空实现
  }

  async cancel(_reservationId: string): Promise<void> {
    // 空实现
  }
}
