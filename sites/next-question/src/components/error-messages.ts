// 前端文案与服务端错误码一一对应；不向用户暴露 token、slug 或内部细节。
export const ERROR_MESSAGES: Record<string, string> = {
  validation_failed: '内容有点不合规格，改短一点再试',
  invalid_token: '这不是当前可用的接力棒',
  chain_not_found: '这条问题不存在',
  chain_advanced: '这一棒已经被别人接走了',
  chain_expired: '这条接力已经过期',
  chain_cancelled: '有一棒撤回了问题，这条接力停在这里',
  rate_limited: '今天发出的问题有点多，晚点再来',
  timeout: '网络好像开小差了，稍后再试',
  network_error: '网络好像开小差了，稍后再试',
  invalid_response: '网络好像开小差了，稍后再试',
  internal_error: '刚才出了点小状况，稍后再试',
}

export function errorMessageOf(code: string | undefined): string {
  if (!code) return ERROR_MESSAGES.internal_error
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.internal_error
}
