import { MANDARIN_RELATIONS, RELATION_SOURCES } from '../data/mandarin-relations'
import { POPULAR_RELATIONS } from '../data/popular-relations'
import { REGION_PACKS } from '../data/region-packs'
import type { RelationEntry } from '../data/relation-types'
import { lintPopularRelations, lintRelationData } from '../lib/relation-lint'

export const SITE_BASE = '/kinship-calculator'
export const DATA_VERSION = 'v1'

/** HTML 转义：corpus 虽然人工审核过，仍不信任任何文本直接进入标记 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** 生成单个称呼解释页的完整 HTML；canonical 指向自身，返回入口固定回工具首页 */
export function renderRelationPage(entry: RelationEntry, siteOrigin: string): string {
  const title = `${entry.labels.join(' / ')} 该怎么叫？亲戚称呼计算器`
  const description = `${entry.labels.join(' / ')}：${entry.explanation}`
  const canonical = `${siteOrigin}${SITE_BASE}/relations/${entry.id}/`
  const sources = RELATION_SOURCES.filter((source) => entry.sourceIds.includes(source.id))

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <style>
      body { margin: 0; background: #fdf6ec; color: #2a2019; font-family: -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif; }
      main { max-width: 560px; margin: 0 auto; padding: 24px 16px 48px; display: flex; flex-direction: column; gap: 16px; }
      h1 { color: #9c241e; font-size: 28px; letter-spacing: 0.06em; margin: 0; }
      .labels { display: flex; flex-wrap: wrap; gap: 10px; }
      .label { font-size: 34px; font-weight: 800; color: #fff8ee; background: #c8342b; border-radius: 12px; padding: 10px 18px; }
      p { line-height: 1.9; font-size: 15px; }
      a { color: #9c241e; }
      .back { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 18px; border: 2px solid #c8342b; border-radius: 999px; text-decoration: none; font-weight: 700; align-self: flex-start; }
      footer { font-size: 12px; color: rgba(42, 32, 25, 0.66); }
    </style>
  </head>
  <body>
    <main>
      <a class="back" href="${SITE_BASE}/">← 返回称呼计算器</a>
      <p><a href="/">怪好玩首页</a> · 这个称呼怎么开口？用关系链逐级点出来。</p>
      <h1>${escapeHtml(entry.labels.join(' / '))}</h1>
      <div class="labels">
        ${entry.labels.map((label) => `<span class="label">${escapeHtml(label)}</span>`).join('\n        ')}
      </div>
      <p>${escapeHtml(entry.explanation)}</p>
      ${entry.aliases.length > 0 ? `<p>常见别称：${escapeHtml(entry.aliases.join('、'))}</p>` : ''}
      <footer>
        称谓数据版本 ${DATA_VERSION} ·
        ${sources.map((source) => `${escapeHtml(source.title)}（${escapeHtml(source.publisher)}）`).join(' · ')}
      </footer>
    </main>
  </body>
</html>
`
}

/** 只收录热门条目对应的解释页；corpus 未通过 lint 时直接拒绝生成 */
export function collectRelationPages(
  siteOrigin: string,
): readonly { entryId: string; html: string }[] {
  const problems = [
    ...lintRelationData(MANDARIN_RELATIONS, REGION_PACKS),
    ...lintPopularRelations(MANDARIN_RELATIONS, POPULAR_RELATIONS),
  ]
  if (problems.length > 0) {
    throw new Error(`称谓数据未通过 lint，拒绝生成解释页：${problems.join('；')}`)
  }

  const pages: { entryId: string; html: string }[] = []
  for (const popular of POPULAR_RELATIONS) {
    const entry = MANDARIN_RELATIONS.find((item) => item.id === popular.entryId)
    if (!entry) continue
    pages.push({ entryId: entry.id, html: renderRelationPage(entry, siteOrigin) })
  }
  return pages
}
