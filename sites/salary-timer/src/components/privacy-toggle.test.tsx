import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyToggle, loadPrivacyMode, savePrivacyMode } from './privacy-toggle'

describe('PrivacyToggle', () => {
  it('role=switch 且点击时回调取反值', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PrivacyToggle enabled={false} onChange={onChange} />)

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await user.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('开启状态下文案提示点击恢复', () => {
    render(<PrivacyToggle enabled onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/金额已隐藏，点击恢复/)).toBeInTheDocument()
  })
})

describe('隐私模式持久化', () => {
  it('写入独立 sessionStorage key，刷新后仍保持', () => {
    expect(loadPrivacyMode()).toBe(false)
    savePrivacyMode(true)
    expect(loadPrivacyMode()).toBe(true)
    savePrivacyMode(false)
    expect(loadPrivacyMode()).toBe(false)
  })

  it('不写入 localStorage', () => {
    savePrivacyMode(true)
    expect(localStorage.length).toBe(0)
  })
})
