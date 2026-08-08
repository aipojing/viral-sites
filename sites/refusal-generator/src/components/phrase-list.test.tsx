import { render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Phrase } from '@viral/shared'
import { SCENES } from '../configs/scenes'
import { TONES } from '../configs/tones'
import { PhraseList } from './phrase-list'

const scene = SCENES[0]
const tone = TONES[0]

const three: Phrase[] = [
  { scene: 'jieqian', tone: 'weiwan', text: '{对方称呼}，这事我帮不上。' },
  { scene: 'jieqian', tone: 'weiwan', text: '第二条话术。' },
  { scene: 'jieqian', tone: 'weiwan', text: '第三条话术。' },
]

const seven: Phrase[] = Array.from({ length: 7 }, (_, i) => ({
  scene: 'jieqian',
  tone: 'weiwan',
  text: `候选话术第${i + 1}条。`,
}))

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

describe('PhraseList', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    setClipboard(undefined)
    delete (document as { execCommand?: unknown }).execCommand
    vi.restoreAllMocks()
  })

  it('渲染 3 条候选，未填称呼时占位符显示默认「亲」', () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    expect(screen.getByText('亲，这事我帮不上。')).toBeInTheDocument()
    expect(screen.getByText('第二条话术。')).toBeInTheDocument()
    expect(screen.getByText('第三条话术。')).toBeInTheDocument()
  })

  it('挂载即上报 generate（scene/tone id）', () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    expect(analyticsSpy).toHaveBeenCalledWith('generate', { scene: 'jieqian', tone: 'weiwan' })
  })

  it('输入称呼后实时替换', async () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.type(screen.getByLabelText('对方称呼'), '王总')
    expect(screen.getByText('王总，这事我帮不上。')).toBeInTheDocument()
  })

  it('复制成功：按钮变「已复制」且上报 copy', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument()
    expect(analyticsSpy).toHaveBeenCalledWith('copy', { scene: 'jieqian', tone: 'weiwan' })
  })

  it('复制的是替换称呼后的最终文案', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.type(screen.getByLabelText('对方称呼'), '王总')
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(writeText).toHaveBeenCalledWith('王总，这事我帮不上。')
  })

  it('复制两路全失败：出降级提示且不报 copy', async () => {
    setClipboard(undefined)
    ;(document as { execCommand?: unknown }).execCommand = vi.fn().mockReturnValue(false)
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    await userEvent.click(screen.getAllByRole('button', { name: '复制' })[0])
    expect(await screen.findByText('复制失败了，长按文字也能复制')).toBeInTheDocument()
    expect(analyticsSpy).not.toHaveBeenCalledWith('copy', expect.anything())
  })

  it('恰好 3 条时不渲染「换一批」', () => {
    render(<PhraseList phrases={three} scene={scene} tone={tone} />)
    expect(screen.queryByRole('button', { name: '换一批' })).not.toBeInTheDocument()
  })

  it('超过 3 条时「换一批」换内容并再报 generate', async () => {
    render(<PhraseList phrases={seven} scene={scene} tone={tone} />)
    expect(screen.getByText('候选话术第1条。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '换一批' }))
    expect(screen.getByText('候选话术第4条。')).toBeInTheDocument()
    expect(screen.queryByText('候选话术第1条。')).not.toBeInTheDocument()
    expect(analyticsSpy.mock.calls.filter(([e]) => e === 'generate')).toHaveLength(2)
  })

  it('renderSaveAction 插槽拿到替换后的文案', async () => {
    render(
      <PhraseList
        phrases={three}
        scene={scene}
        tone={tone}
        renderSaveAction={(text) => <span data-testid="save-slot">{`卡片:${text}`}</span>}
      />,
    )
    await userEvent.type(screen.getByLabelText('对方称呼'), '哥')
    expect(screen.getAllByTestId('save-slot')[0]).toHaveTextContent('卡片:哥，这事我帮不上。')
  })
})
