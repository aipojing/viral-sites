import { describe, expect, it } from 'vitest'
import { MANDARIN_RELATIONS } from '../data/mandarin-relations'
import { POPULAR_RELATIONS } from '../data/popular-relations'
import { collectRelationPages, escapeHtml, renderRelationPage } from './relation-pages'

function findEntry(id: string) {
  const entry = MANDARIN_RELATIONS.find((item) => item.id === id)
  if (!entry) throw new Error(`找不到 entry：${id}`)
  return entry
}

describe('escapeHtml', () => {
  it('转义全部危险字符', () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>&`)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;',
    )
  })
})

describe('renderRelationPage', () => {
  it('包含唯一 title/description、标准称呼、解释、canonical 与返回链接', () => {
    const html = renderRelationPage(findEntry('kc-maternal-uncle'), 'https://guaihaowan.example')

    expect(html).toContain('<title>舅舅 该怎么叫？亲戚称呼计算器</title>')
    expect(html).toContain('<meta name="description" content="舅舅：')
    expect(html).toContain(
      '<link rel="canonical" href="https://guaihaowan.example/kinship-calculator/relations/kc-maternal-uncle/" />',
    )
    expect(html).toContain('href="/kinship-calculator/"')
    expect(html).toContain('href="/"')
    expect(html).toContain('舅舅')
    expect(html).toMatch(/母系/)
  })

  it('不信任文本数据：labels 与 explanation 中的特殊字符一律转义', () => {
    const hostile = {
      ...findEntry('kc-maternal-uncle'),
      labels: ['<script>alert(1)</script>'],
      explanation: '注入"测试"&\'<>',
    }
    const html = renderRelationPage(hostile, '')

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('注入"测试"')
  })
})

describe('collectRelationPages', () => {
  it('为每个热门条目生成一页且数据先过 lint', () => {
    const pages = collectRelationPages('')
    expect(pages).toHaveLength(POPULAR_RELATIONS.length)
    const ids = pages.map((page) => page.entryId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
