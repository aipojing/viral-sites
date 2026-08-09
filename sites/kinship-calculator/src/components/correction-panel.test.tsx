import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CorrectionPanel } from './correction-panel'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('CorrectionPanel', () => {
  it('缺少 VITE_CORRECTION_URL 时只显示复制入口，复制成功后明示未上线', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CorrectionPanel entryId="kc-maternal-uncle" labels={['舅舅']} />)

    expect(screen.queryByRole('link', { name: '提交纠错' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/你的说法或依据/), '我们这里叫舅父')
    await user.click(screen.getByRole('button', { name: '复制纠错信息' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('条目：kc-maternal-uncle'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('我的说明：我们这里叫舅父'))
    expect(screen.getByRole('status')).toHaveTextContent('人工审核表单暂未上线')
  })

  it('复制失败时摊出文本供手动复制，不谎报成功', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CorrectionPanel entryId="kc-x" labels={['堂哥', '堂弟']} />)
    await user.click(screen.getByRole('button', { name: '复制纠错信息' }))

    expect(screen.getByRole('status')).toHaveTextContent('手动复制')
    expect(screen.getByText(/当前称呼：堂哥 \/ 堂弟/)).toBeInTheDocument()
  })

  it('配置了 VITE_CORRECTION_URL 时提供表单跳转入口', () => {
    vi.stubEnv('VITE_CORRECTION_URL', 'https://forms.example.com/kinship')
    render(<CorrectionPanel entryId="kc-x" labels={['舅舅']} />)

    const link = screen.getByRole('link', { name: '提交纠错' })
    expect(link).toHaveAttribute('href', 'https://forms.example.com/kinship')
    expect(screen.queryByRole('button', { name: '复制纠错信息' })).not.toBeInTheDocument()
  })
})
