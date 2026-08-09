import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { DocumentMode } from './document-mode'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

async function pickSickLeaveBoss(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '请假消息' }))
  await user.click(screen.getByRole('button', { name: /身体不适/ }))
  await user.click(screen.getByRole('button', { name: '老板' }))
  await user.click(screen.getByRole('button', { name: '诚恳' }))
}

async function pickSickLeaveBossWenyan(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '请假消息' }))
  await user.click(screen.getByRole('button', { name: /身体不适/ }))
  await user.click(screen.getByRole('button', { name: '老板' }))
  await user.click(screen.getByRole('button', { name: '文言文' }))
}

function drawnTexts(ctx: ReturnType<typeof installCanvasStub>): string[] {
  return ctx.fillText.mock.calls.map((call) => String(call[0]))
}

describe('DocumentMode 文书状态机', () => {
  let analyticsSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    analyticsSpy = installAnalyticsSpy()
  })

  afterEach(() => {
    removeAnalyticsSpy()
    setClipboard(undefined)
    vi.restoreAllMocks()
  })

  it('按 类型 → 事由 → 对象 → 语气 → 详情 → 三候选 顺序展开', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)

    expect(screen.queryByRole('group', { name: '选择事由' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '请假消息' }))
    expect(screen.getByRole('group', { name: '选择事由' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '选择对象' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /身体不适/ }))
    expect(screen.getByRole('group', { name: '选择对象' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '老板' }))
    expect(screen.getByRole('group', { name: '选择语气' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '诚恳' }))
    expect(screen.getByLabelText(/具体事由/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成 3 条候选' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))
    expect(screen.getByLabelText('候选 1')).toBeInTheDocument()
    expect(screen.getByLabelText('候选 2')).toBeInTheDocument()
    expect(screen.getByLabelText('候选 3')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '复制并去发送' })).toHaveLength(3)
  })

  it('对象只暴露启用矩阵里的选项（请假·身体不适无客户）', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await user.click(screen.getByRole('button', { name: '请假消息' }))
    await user.click(screen.getByRole('button', { name: /身体不适/ }))
    expect(screen.queryByRole('button', { name: '客户' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '老师' })).toBeInTheDocument()
  })

  it('生成上报 generate 且只带枚举，不带用户填写内容', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBoss(user)
    await user.clear(screen.getByLabelText(/具体事由/))
    await user.type(screen.getByLabelText(/具体事由/), '发烧在家休息')
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))

    expect(analyticsSpy).toHaveBeenCalledWith('generate', {
      mode: 'document',
      type: 'leave',
      scene: 'sick',
      audience: 'boss',
      tone: 'sincere',
      kind: 'usable',
    })
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('发烧在家休息')
  })

  it('玩梗语气：选择时与结果页都有警示', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await user.click(screen.getByRole('button', { name: '请假消息' }))
    await user.click(screen.getByRole('button', { name: /身体不适/ }))
    await user.click(screen.getByRole('button', { name: '老板' }))
    await user.click(screen.getByRole('button', { name: '发疯文学' }))
    expect(screen.getByText(/先确认对方接得住玩笑/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))
    expect(screen.getByText(/玩梗版本仅供娱乐/)).toBeInTheDocument()
  })

  it('复制未编辑候选：上报 copy 枚举，不上报 edited_before_copy', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBoss(user)
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))
    await user.click(screen.getAllByRole('button', { name: '复制并去发送' })[0])

    expect(analyticsSpy).toHaveBeenCalledWith('copy', {
      mode: 'document',
      type: 'leave',
      scene: 'sick',
      audience: 'boss',
      tone: 'sincere',
      kind: 'usable',
    })
    expect(analyticsSpy).not.toHaveBeenCalledWith(
      'edited_before_copy',
      expect.anything(),
    )
  })

  it('编辑后复制：额外上报 edited_before_copy，且正文不进埋点', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBoss(user)
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))

    const textarea = screen.getByLabelText('候选 1')
    await user.type(textarea, '（手动补充了一句）')
    await user.click(screen.getAllByRole('button', { name: '复制并去发送' })[0])

    expect(analyticsSpy).toHaveBeenCalledWith('edited_before_copy', {
      type: 'leave',
      tone: 'sincere',
    })
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('手动补充了一句')
  })

  it('返回修改保留枚举选择，正文不持久化', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBoss(user)
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))

    await user.click(screen.getByRole('button', { name: '返回修改' }))
    expect(screen.getByLabelText(/具体事由/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))
    expect(screen.getByLabelText('候选 1')).toBeInTheDocument()
  })

  it('事由为空时拒绝生成并提示', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBoss(user)
    const reasonInput = screen.getByLabelText(/具体事由/)
    await user.clear(reasonInput)
    // required 属性拦截隐式提交，直接点按钮触发表单校验或组件内校验
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))
    expect(screen.queryByLabelText('候选 1')).not.toBeInTheDocument()
  })

  it('usable 结果不渲染信纸保存入口', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBoss(user)
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))
    expect(screen.queryByRole('button', { name: '保存信纸卡片' })).not.toBeInTheDocument()
  })

  it('玩梗结果可保存信纸卡：默认中性文本，勾选后保留用户称呼', async () => {
    const ctx = installCanvasStub()
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBossWenyan(user)
    await user.type(screen.getByLabelText(/对方称呼/), '王总')
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))

    const saveButtons = screen.getAllByRole('button', { name: '保存信纸卡片' })
    expect(saveButtons).toHaveLength(3)

    // 默认不带用户填写的真实称呼
    await user.click(saveButtons[0])
    let joined = drawnTexts(ctx).join('')
    expect(joined).not.toContain('王总')
    expect(joined).toContain('你好')

    // 勾选保留称呼后使用当前编辑稿并绘制抬头行
    const checkbox = screen.getAllByLabelText(/保留我填写的称呼/)[0]
    await user.click(checkbox)
    await user.click(screen.getAllByRole('button', { name: '保存信纸卡片' })[0])
    joined = drawnTexts(ctx).join('')
    expect(joined).toContain('王总')
    expect(joined).toContain('致')

    expect(analyticsSpy).toHaveBeenCalledWith('save_image', {
      mode: 'document',
      type: 'leave',
      tone: 'wenyan',
    })
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('王总')
  })

  it('敏感输入：不套玩梗模板，降级正式语气并提示，命中词不进埋点', async () => {
    const user = userEvent.setup()
    render(<DocumentMode />)
    await pickSickLeaveBossWenyan(user)
    await user.clear(screen.getByLabelText(/具体事由/))
    await user.type(screen.getByLabelText(/具体事由/), '确诊癌症要住院')
    await user.click(screen.getByRole('button', { name: '生成 3 条候选' }))

    expect(screen.getByText(/更适合直接、认真地联系对方或可信任的人/)).toBeInTheDocument()
    // 降级为正式语气：无玩梗警示、无信纸保存入口
    expect(screen.queryByText(/玩梗版本仅供娱乐/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存信纸卡片' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('候选 1')).toBeInTheDocument()

    expect(analyticsSpy).toHaveBeenCalledWith('safety_mode', { mode: 'formal-only' })
    expect(analyticsSpy).toHaveBeenCalledWith('generate', expect.objectContaining({ kind: 'usable' }))
    expect(JSON.stringify(analyticsSpy.mock.calls)).not.toContain('确诊癌症')
  })
})
