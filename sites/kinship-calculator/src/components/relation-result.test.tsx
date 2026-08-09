import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MANDARIN_RELATIONS } from '../data/mandarin-relations'
import { RelationResult } from './relation-result'

function findEntry(id: string) {
  const entry = MANDARIN_RELATIONS.find((item) => item.id === id)
  if (!entry) throw new Error(`找不到 entry：${id}`)
  return entry
}

describe('RelationResult', () => {
  it('单一称呼显示「建议叫」与解释、置信、来源', () => {
    render(
      <RelationResult
        entry={findEntry('kc-maternal-uncle')}
        confidence="exact"
        regionalLabels={[]}
        pathLabels={['妈妈', '哥哥']}
      />,
    )

    expect(screen.getByText('建议叫')).toBeInTheDocument()
    expect(screen.getByText('舅舅')).toBeInTheDocument()
    expect(screen.getByText(/置信：明确 · 母系 · 高 1 辈/)).toBeInTheDocument()
    expect(screen.getByText('依据与来源')).toBeInTheDocument()
  })

  it('多答案称呼不用红叉判错，说明两者都对', () => {
    render(
      <RelationResult
        entry={findEntry('kc-tang-brother')}
        confidence="exact"
        regionalLabels={[]}
        pathLabels={['爸爸', '哥哥', '儿子']}
      />,
    )

    expect(screen.getByText(/以下叫法都正确/)).toBeInTheDocument()
    expect(screen.getByText('堂哥')).toBeInTheDocument()
    expect(screen.getByText('堂弟')).toBeInTheDocument()
  })

  it('地域称呼存在时列出地区叫法，否则提示地域包暂未上线', () => {
    const { unmount } = render(
      <RelationResult
        entry={findEntry('kc-maternal-grandmother')}
        confidence="regional"
        regionalLabels={[
          {
            relationId: 'kc-maternal-grandmother',
            label: '姥姥',
            region: '京津冀常见',
            sourceIds: ['src-wiki-zh-kinship'],
            reviewerRoles: ['native-a', 'native-b'],
          },
        ]}
        pathLabels={['妈妈', '妈妈']}
      />,
    )
    expect(screen.getByText('地区常用叫法')).toBeInTheDocument()
    expect(screen.getByText(/姥姥（京津冀常见）/)).toBeInTheDocument()
    unmount()

    render(
      <RelationResult
        entry={findEntry('kc-maternal-grandmother')}
        confidence="exact"
        regionalLabels={[]}
        pathLabels={['妈妈', '妈妈']}
      />,
    )
    expect(screen.getByText(/地域称呼包暂未上线/)).toBeInTheDocument()
  })

  it('来源链接可点击并保留可核验地址', async () => {
    const user = userEvent.setup()
    render(
      <RelationResult
        entry={findEntry('kc-maternal-uncle')}
        confidence="exact"
        regionalLabels={[]}
        pathLabels={['妈妈', '哥哥']}
      />,
    )

    await user.click(screen.getByText('依据与来源'))
    const link = screen.getByRole('link', { name: /汉语亲属系统/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('zh.wikipedia.org'))
  })
})
