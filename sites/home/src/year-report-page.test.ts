import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { projects } from './projects'

const html = readFileSync(resolve(process.cwd(), 'year-report/index.html'), 'utf8')

describe('年度报告的主站页面', () => {
  it('登记在项目表里，并且走同源 /year-report/ 路径', () => {
    const project = projects.find((item) => item.slug === 'year-report')
    expect(project?.href).toBe('/year-report/')
    expect(project?.href).not.toMatch(/^https?:\/\//)
  })

  it('fragment bootstrap 必须早于业务与统计脚本执行', () => {
    const bootstrapAt = html.indexOf('__YEAR_REPORT_FRAGMENT__')
    const entryAt = html.indexOf('/src/experience-entry.tsx')
    expect(bootstrapAt).toBeGreaterThan(-1)
    expect(entryAt).toBeGreaterThan(-1)
    // 统计在 experience-entry 里启动，bootstrap 必须先把 hash 收走再清地址栏
    expect(bootstrapAt).toBeLessThan(entryAt)
    expect(html.indexOf('history.replaceState')).toBeLessThan(entryAt)
    // bootstrap 是同步脚本：不能带 defer/async/type=module，否则会晚于统计执行
    expect(html).toMatch(/<script>\s*\/\//)
  })

  it('只从主站加载脚本，没有外部域名或子站配置残留', () => {
    for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
      expect(match[1]!.startsWith('/')).toBe(true)
    }
    expect(html).not.toMatch(/pages\.dev/)
    expect(html).not.toMatch(/VITE_[A-Z0-9_]+_URL/)
  })

  it('页面元信息与玩法配色一致，且不承诺服务器保存', () => {
    expect(html).toContain('<title>年度报告 — 怪好玩</title>')
    expect(html).toContain('content="#0b0a1f"')
    expect(html).toMatch(/答案只留在这台设备上/)
    // 标题不写死年份：静态 HTML 跨年不会过期，年份只在应用内动态渲染
    expect(html).not.toMatch(/20\d\d/)
  })
})
