import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('App 主流程', () => {
  it('关系链逐级点选并实时给出结果（妈妈的哥哥的女儿）', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '妈妈' }))
    await user.click(screen.getByRole('button', { name: '哥哥' }))
    await user.click(screen.getByRole('button', { name: '女儿' }))

    expect(screen.getByText(/以下叫法都正确/)).toBeInTheDocument()
    expect(screen.getByText('表姐')).toBeInTheDocument()
    expect(screen.getByText('表妹')).toBeInTheDocument()
    expect(screen.getByText(/我 → 妈妈 → 哥哥 → 女儿/)).toBeInTheDocument()
  })

  it('仅在需要时追问性别（连襟），追问后即可解析', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '妻子' }))
    await user.click(screen.getByRole('button', { name: '姐姐' }))
    await user.click(screen.getByRole('button', { name: '丈夫' }))

    expect(screen.getByText(/这个称呼会随你的性别变化/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '男生' }))

    expect(screen.getByText('连襟')).toBeInTheDocument()
  })

  it('未覆盖的关系链明确提示，不编造称呼', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '爸爸' }))
    await user.click(screen.getByRole('button', { name: '爸爸' }))
    await user.click(screen.getByRole('button', { name: '哥哥' }))
    await user.click(screen.getByRole('button', { name: '儿子' }))

    expect(screen.getByRole('status')).toHaveTextContent('暂未覆盖')
  })

  it('撤销一级可以回到上一个状态', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '妈妈' }))
    await user.click(screen.getByRole('button', { name: '哥哥' }))
    await user.click(screen.getByRole('button', { name: '撤销一级' }))

    expect(screen.getByText(/我 → 妈妈/)).toBeInTheDocument()
    expect(screen.queryByText('舅舅')).not.toBeInTheDocument()
  })

  it('热门速查点击直达结果', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '热门速查' }))
    await user.click(screen.getByText('妯娌'))

    expect(screen.getByText(/建议叫/)).toBeInTheDocument()
    expect(screen.getAllByText('妯娌').length).toBeGreaterThan(0)
  })

  it('直达结果不跨入口残留：切回关系链或清空后旧面板消失', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '热门速查' }))
    await user.click(screen.getByText('妯娌'))
    expect(screen.getByText(/建议叫/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关系链查询' }))
    expect(screen.queryByText(/建议叫/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '热门速查' }))
    await user.click(screen.getByText('妯娌'))
    await user.click(screen.getByRole('button', { name: '关系链查询' }))
    await user.click(screen.getByRole('button', { name: '妈妈' }))
    await user.click(screen.getByRole('button', { name: '清空重选' }))
    expect(screen.queryByText('妯娌')).not.toBeInTheDocument()
  })

  it('关系链达到 6 级时显示「先叫您好」彩蛋，但不隐藏真实状态', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (let index = 0; index < 6; index += 1) {
      await user.click(screen.getByRole('button', { name: '爸爸' }))
    }

    expect(screen.getByRole('note')).toHaveTextContent('稳妥方案：先叫「您好」')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('反查入口可以查称呼并打开结果', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /称呼反查/ }))
    await user.type(screen.getByLabelText(/输入一个称呼/), '姥姥')
    await user.click(screen.getByRole('button', { name: '反查' }))
    await user.click(screen.getByText('外婆'))

    expect(screen.getByText(/建议叫/)).toBeInTheDocument()
  })
})
