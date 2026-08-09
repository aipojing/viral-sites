import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { ResultScreen } from './result-screen'

const INPUT = { birth: new Date(1996, 7, 4), today: new Date(2026, 7, 4) }

describe('ResultScreen', () => {
  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  it('渲染 6 条扎心文案', () => {
    render(<ResultScreen input={INPUT} onRestart={() => {}} />)
    expect(screen.getByText(/你的人生已经走过/)).toBeInTheDocument()
    expect(screen.getByText(/还能见父母大约/)).toBeInTheDocument()
    expect(screen.getByText(/怎么填由你/)).toBeInTheDocument()
  })

  it('渲染格子图', () => {
    render(<ResultScreen input={INPUT} onRestart={() => {}} />)
    expect(screen.getByLabelText('人生格子图')).toBeInTheDocument()
  })

  it('彩蛋模式渲染 bonus 文案', () => {
    render(
      <ResultScreen input={{ birth: new Date(1940, 0, 1), today: new Date(2026, 7, 4) }} onRestart={() => {}} />,
    )
    expect(screen.getByText(/每一格都是奖励/)).toBeInTheDocument()
  })

  it('重新计算按钮触发 onRestart，children 插槽渲染', async () => {
    const onRestart = vi.fn()
    render(
      <ResultScreen input={INPUT} onRestart={onRestart}>
        <button>保存我的人生卡片</button>
      </ResultScreen>,
    )
    expect(screen.getByText('保存我的人生卡片')).toBeInTheDocument()
    screen.getByRole('button', { name: '重新计算' }).click()
    expect(onRestart).toHaveBeenCalled()
  })

  it('第一张卡保存入口在时间账本模块入口之前', () => {
    render(
      <ResultScreen input={INPUT} onRestart={() => {}}>
        <button>保存我的人生卡片</button>
      </ResultScreen>,
    )
    const firstCard = screen.getByRole('button', { name: '保存我的人生卡片' })
    const ledgerEntry = screen.getByRole('button', { name: '再看看，你的时间都去哪了' })
    expect(
      firstCard.compareDocumentPosition(ledgerEntry) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('关键百分比在格子图之前，首屏先给结论', () => {
    render(<ResultScreen input={INPUT} onRestart={() => {}} />)
    const summary = screen.getByTestId('life-summary')
    const grid = screen.getByLabelText('人生格子图')
    expect(summary).toHaveTextContent(/你的人生已经走过/)
    expect(summary).toHaveTextContent(/%/)
    expect(summary.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('摘要只突出百分比、见父母次数和春节数', () => {
    render(<ResultScreen input={INPUT} onRestart={() => {}} />)
    const summary = screen.getByTestId('life-summary')
    expect(summary).toHaveTextContent(/还能见父母大约/)
    expect(summary).toHaveTextContent(/个春节/)
    expect(summary).not.toHaveTextContent(/工作日/)
  })
})
