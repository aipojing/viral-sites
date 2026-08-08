import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../test/canvas-stub'
import { encodeChallenge } from './lib/challenge-codec'
import { QUIZZES } from './lib/questions'
import { App, initialAppState } from './app'

const ANSWERS = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]

async function answerAll(pickFor: (i: number) => number) {
  for (let i = 0; i < 10; i += 1) {
    await userEvent.click(
      screen.getByRole('button', { name: QUIZZES.friend.questions[i].options[pickFor(i)] }),
    )
  }
}

describe('initialAppState', () => {
  it('无 d 参数 → home', () =>
    expect(initialAppState('')).toEqual({ screen: 'home', linkInvalid: false }))
  it('合法 d → intro 且 payload 解码正确', () => {
    const d = encodeChallenge('friend', '阿福', ANSWERS)
    const state = initialAppState(`?d=${d}`)
    expect(state.screen).toBe('intro')
    if (state.screen === 'intro') expect(state.payload.n).toBe('阿福')
  })
  it('非法 d → home + linkInvalid', () =>
    expect(initialAppState('?d=garbage!!!')).toEqual({ screen: 'home', linkInvalid: true }))
})

describe('App', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    installCanvasStub()
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    vi.restoreAllMocks()
  })

  it('发起全流程：选题库 → 昵称 → 10 题 → 链接页，generate 与 q_answered 埋点', async () => {
    render(<App search="" />)
    await userEvent.click(screen.getByRole('button', { name: /好友版/ }))
    await userEvent.type(screen.getByLabelText('你的昵称'), '阿福')
    await userEvent.click(screen.getByRole('button', { name: '出题' }))
    await answerAll((i) => i % 4)
    expect(screen.getByText('链接已生成，甩给 TA')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { quiz: 'friend' })
    expect(analyticsSpy).toHaveBeenCalledWith('q_answered', { q: 1, mode: 'initiate' })
    expect(analyticsSpy).toHaveBeenCalledWith('q_answered', { q: 10, mode: 'initiate' })
  })

  it('应战全流程：intro → 昵称 → 10 题 → 对比页，challenge_opened/completed 埋点', async () => {
    const d = encodeChallenge('friend', '阿福', ANSWERS)
    render(<App search={`?d=${d}`} />)
    expect(screen.getByText('阿福 向你发起默契挑战')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('challenge_opened', undefined)
    await userEvent.type(screen.getByLabelText('你的昵称'), '小明')
    await userEvent.click(screen.getByRole('button', { name: '接招' }))
    await answerAll((i) => ANSWERS[i]) // 全对
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('灵魂共振')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('challenge_completed', { quiz: 'friend', score: 100 })
    expect(analyticsSpy).toHaveBeenCalledWith('q_answered', { q: 1, mode: 'respond' })
  })

  it('非法链接：落首页提示，challenge_opened 与 link_invalid 都记', () => {
    render(<App search="?d=garbage!!!" />)
    expect(screen.getByText('链接失效了，重新发起一个吧')).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('challenge_opened', undefined)
    expect(analyticsSpy).toHaveBeenCalledWith('link_invalid', undefined)
  })

  it('隐私声明常驻页脚（只此一处）', () => {
    render(<App search="" />)
    expect(
      screen.getAllByText('答案随挑战链接传递，请只发给你信任的人；本站不保存挑战内容'),
    ).toHaveLength(1)
  })
})
