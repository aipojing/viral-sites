import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { App } from './app'

describe('App', () => {
  let umamiSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    umamiSpy = vi.fn()
    window.umami = { track: umamiSpy }
  })

  afterEach(() => {
    delete (window as { umami?: unknown }).umami
    vi.restoreAllMocks()
  })

  it('完整流程：输入 → 结果 → 重新计算回输入', async () => {
    render(<App />)
    await userEvent.type(screen.getByLabelText('出生日期'), '1996-08-04')
    await userEvent.click(screen.getByRole('button', { name: '看看我的人生' }))
    expect(screen.getByLabelText('人生格子图')).toBeInTheDocument()
    expect(umamiSpy).toHaveBeenCalledWith('generate', undefined)
    await userEvent.click(screen.getByRole('button', { name: '重新计算' }))
    expect(screen.getByLabelText('出生日期')).toBeInTheDocument()
  })

  it('隐私声明常驻页脚', () => {
    render(<App />)
    expect(screen.getByText(/所有计算在本地完成/)).toBeInTheDocument()
  })
})
