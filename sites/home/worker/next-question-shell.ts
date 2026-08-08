import type { PortalEnv } from './env'
import type { PublicChain } from '../../next-question/worker/types'

export interface ShellMeta {
  title: string
  description: string
}

// metadata 只描述状态与棒数：绝不引用昵称、问题、回答或 capability token。
export function nextQuestionMeta(chain: PublicChain | null): ShellMeta {
  if (!chain) {
    return {
      title: '下一问 · 六人问题接力',
      description: '回答上一棒，再把下一问交给一个人。六个人后，问题回到起点。',
    }
  }
  switch (chain.status) {
    case 'waiting':
      return {
        title: `一个问题已经走到第 ${chain.nextSlot} / 6 棒`,
        description: '回答上一棒，再把下一问交给一个人。',
      }
    case 'returned':
      return {
        title: '问题已经回到起点',
        description: '六个人已经接力完成，只等出发的人回答最后一问。',
      }
    case 'completed':
      return {
        title: '一个问题走过六个人，又回到了起点',
        description: '一条六人问题接力的完整闭环。',
      }
    case 'cancelled':
      return {
        title: '这条接力停在这里',
        description: '有一棒撤回了问题，这条接力不再继续。',
      }
    case 'expired':
      return {
        title: '这条接力已经过期',
        description: '未完成的问题只保留 7 天。',
      }
    default:
      return {
        title: '这条问题不存在',
        description: '它可能已经被发起者删除。',
      }
  }
}

// 链条深链接的 HTML shell：静态资产提供页面骨架，Worker 只改写 title/description/OG。
export async function serveNextQuestionShell(
  request: Request,
  env: PortalEnv,
  slug: string,
): Promise<Response> {
  let chain: PublicChain | null = null
  try {
    const stub = env.NEXT_QUESTION_CHAINS.get(env.NEXT_QUESTION_CHAINS.idFromName(slug))
    chain = await stub.getPublic(Date.now())
  } catch {
    chain = null
  }
  const meta = nextQuestionMeta(chain)

  const shellUrl = new URL('/next-question/', new URL(request.url).origin)
  const base = await env.ASSETS.fetch(new Request(shellUrl.toString()))

  const rewritten = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(meta.title)
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute('content', meta.description)
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute('content', meta.title)
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute('content', meta.description)
      },
    })
    .transform(base)

  // 链条页不缓存、不收录、不泄露来源
  rewritten.headers.set('cache-control', 'no-store')
  rewritten.headers.set('x-robots-tag', 'noindex, nofollow')
  rewritten.headers.set('referrer-policy', 'no-referrer')
  rewritten.headers.set('x-content-type-options', 'nosniff')
  return rewritten
}
