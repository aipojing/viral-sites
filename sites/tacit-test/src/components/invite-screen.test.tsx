import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChallengePayload } from '../lib/challenge-codec'
import { STYLE_REMARKS } from '../lib/style-remark'
import { InviteScreen } from './invite-screen'

const PAYLOAD: ChallengePayload = { v: 1, q: 'friend', n: '阿福', a: Array(10).fill(0) }
const URL = 'https://tacit-test.pages.dev/c?d=abc'

describe('InviteScreen', () => {
  it('渲染复制按钮与保存发起卡按钮', () => {
    render(<InviteScreen payload={PAYLOAD} url={URL} />)
    expect(screen.getByRole('button', { name: '复制挑战链接' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存挑战发起卡' })).toBeInTheDocument()
  })

  it('展示发起方答题风格锐评（兜底产出）', () => {
    render(<InviteScreen payload={PAYLOAD} url={URL} />)
    expect(screen.getByText(STYLE_REMARKS['single-minded'])).toBeInTheDocument()
  })

  it('展示闭环引导文案', () => {
    render(<InviteScreen payload={PAYLOAD} url={URL} />)
    expect(screen.getByText(/对方答完，你们的默契度当场揭晓/)).toBeInTheDocument()
  })
})
