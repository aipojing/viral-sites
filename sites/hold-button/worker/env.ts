// 绑定与密钥全部由主站 sites/home/wrangler.jsonc 声明（HOLD_ 前缀）。
// 未配置生产资源时全部为 undefined，handler 必须走明确的开发态降级（scores_disabled），
// 而不是报错或伪造成绩。
export interface HoldButtonEnv {
  HOLD_DB?: D1Database
  HOLD_SUBMIT_LIMITER?: RateLimit
  HOLD_SESSION_SECRET?: string
  /** 成本熔断开关：只有字符串 'true' 时开放服务端成绩，否则前端纯本地模式 */
  HOLD_SCORES_ENABLED?: string
}
