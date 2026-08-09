import { getDailyId } from './daily-id'
import { isValidVerdict, type VerdictResult } from './verdict'

const VERDICT_ENDPOINT = '/api/ai-judge/verdict'
/** 前端兜底超时：略长于 Worker 侧 8 秒截止，避免抢在降级结果返回前掐断 */
const REQUEST_TIMEOUT_MS = 9500

export interface JudgeSubmission {
  nickname: string
  intro: string
}

export type VerdictOutcome =
  | { status: 'ok'; result: VerdictResult }
  | { status: 'refused' } // 422 输入命中禁区：本官不审此案
  | { status: 'rate_limited' } // 429 今日次数已用完
  | { status: 'paused' } // 503 衙门下班（预算熔断）
  | { status: 'error' } // 网络错误 / 超时 / 非法响应

interface ErrorBody {
  code?: string
}

function parseErrorCode(body: unknown): string {
  if (body && typeof body === 'object' && typeof (body as ErrorBody).code === 'string') {
    return (body as ErrorBody).code as string
  }
  return ''
}

export async function requestVerdict(submission: JudgeSubmission): Promise<VerdictOutcome> {
  let response: Response
  try {
    response = await fetch(VERDICT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nickname: submission.nickname,
        intro: submission.intro,
        dailyId: getDailyId(),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    return { status: 'error' }
  }

  if (response.status === 200) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return { status: 'error' }
    }
    const candidate = body as Partial<VerdictResult>
    if (
      candidate &&
      isValidVerdict(candidate.verdict) &&
      (candidate.source === 'model' || candidate.source === 'cache' || candidate.source === 'fallback')
    ) {
      return { status: 'ok', result: { verdict: candidate.verdict, source: candidate.source } }
    }
    return { status: 'error' }
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // 非 JSON 错误体按通用错误处理
  }

  if (response.status === 422) return { status: 'refused' }
  if (response.status === 429 && parseErrorCode(body) === 'rate_limited') return { status: 'rate_limited' }
  if (response.status === 503 && parseErrorCode(body) === 'court_closed') return { status: 'paused' }
  return { status: 'error' }
}
