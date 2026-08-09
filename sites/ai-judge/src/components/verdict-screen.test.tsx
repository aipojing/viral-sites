import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { VerdictResult } from '../lib/verdict'
import { VerdictScreen } from './verdict-screen'

const MODEL_RESULT: VerdictResult = {
  verdict: {
    crime: '拖延成瘾罪',
    verdict:
      '经查，该员每逢正事临头便突发性打开手机，刷至深夜方才如梦初醒。计划表写了八版，完成度始终为零，收藏的教程从未打开第二次。本官念其态度尚可。',
    sentence: '判处早睡三个月，缓期执行',
    seal: '赛博衙门 · 即日生效',
  },
  source: 'model',
}

describe('VerdictScreen', () => {
  it('渲染罪名、判词、刑期与印章', () => {
    render(<VerdictScreen result={MODEL_RESULT} onRestart={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '拖延成瘾罪' })).toBeInTheDocument()
    expect(screen.getByText(MODEL_RESULT.verdict.verdict)).toBeInTheDocument()
    expect(screen.getByText('判处早睡三个月，缓期执行')).toBeInTheDocument()
    expect(screen.getByText('赛博衙门 · 即日生效')).toBeInTheDocument()
  })

  it('不展示昵称与简介，避免截图泄露输入', () => {
    render(<VerdictScreen result={MODEL_RESULT} onRestart={vi.fn()} />)
    expect(document.body.textContent).not.toContain('阿福')
  })

  it('fallback 来源给出降级说明', () => {
    render(<VerdictScreen result={{ ...MODEL_RESULT, source: 'fallback' }} onRestart={vi.fn()} />)
    expect(screen.getByText(/官印判词库/)).toBeInTheDocument()
  })

  it('model 来源不显示降级说明', () => {
    render(<VerdictScreen result={MODEL_RESULT} onRestart={vi.fn()} />)
    expect(screen.queryByText(/官印判词库/)).not.toBeInTheDocument()
  })

  it('再审一案回到落地页', async () => {
    const onRestart = vi.fn()
    render(<VerdictScreen result={MODEL_RESULT} onRestart={onRestart} />)
    await userEvent.click(screen.getByRole('button', { name: /再\s*审\s*一\s*案/ }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })
})
