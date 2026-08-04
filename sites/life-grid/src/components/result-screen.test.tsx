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
})
