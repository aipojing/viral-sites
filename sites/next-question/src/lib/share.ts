import type { PublicChain } from '../../worker/types'

const EXCERPT_MAX_CODE_POINTS = 24
const MAX_EXCERPTS = 6

export async function shareOrCopy(input: {
  title: string
  text: string
  url: string
}): Promise<'share' | 'copy'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(input)
      return 'share'
    } catch (error) {
      // 用户在系统分享面板取消（AbortError）时降级为复制链接
      const name = error instanceof Error ? error.name : ''
      if (name !== 'AbortError') return copyUrl(input.url)
    }
  }
  return copyUrl(input.url)
}

async function copyUrl(url: string): Promise<'copy'> {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // 剪贴板不可用时由界面展示链接供手动复制
  }
  return 'copy'
}

function truncateToCodePoints(value: string, max: number): string {
  const points = Array.from(value)
  if (points.length <= max) return value
  return `${points.slice(0, max).join('')}…`
}

// 结果卡只放摘录：最多 6 条，每条不超过 24 个 code points。
export function resultExcerpts(chain: PublicChain): readonly string[] {
  return chain.entries.slice(0, MAX_EXCERPTS).map((entry) => {
    if (entry.redacted) return '该内容已撤回'
    return truncateToCodePoints(entry.answer ?? '', EXCERPT_MAX_CODE_POINTS)
  })
}
