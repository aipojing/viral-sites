/**
 * 纠错入口的纯逻辑部分：
 * - 部署环境提供 VITE_CORRECTION_URL 时跳人工审核表单（method='form'）
 * - 变量缺失时降级为「复制纠错信息」（method='copy'），绝不伪装成已提交
 * 复制内容只含 relation id、候选 labels 和用户主动填写的说明，不含关系链原文
 */

export function getCorrectionUrl(env: Record<string, unknown> = import.meta.env): string | null {
  const raw = env.VITE_CORRECTION_URL
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

export function buildCorrectionText(
  entryId: string,
  labels: readonly string[],
  note: string,
): string {
  const lines = [
    '【亲戚称呼计算器 · 纠错】',
    `条目：${entryId}`,
    `当前称呼：${labels.join(' / ')}`,
  ]
  const trimmedNote = note.trim()
  if (trimmedNote !== '') lines.push(`我的说明：${trimmedNote}`)
  return lines.join('\n')
}
