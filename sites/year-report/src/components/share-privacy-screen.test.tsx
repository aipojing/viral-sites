import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { DEFAULT_PUBLIC_FIELDS, togglePublicField, type PublicFieldId } from '../lib/public-fields'
import { decodePublicReport, REPORT_FRAGMENT_PREFIX } from '../lib/report-codec'
import { SharePrivacyScreen } from './share-privacy-screen'
import type { ReportAnswers } from '../lib/report-types'

const ANSWERS: ReportAnswers = {
  keyword: '重启',
  place: '县城的老家',
  'important-person': '老同学 K',
  'small-win': '学会了游一百米',
  'hard-moment': '三月那通电话',
  'feeling-scale': 4,
  'next-year-message': '先睡够，再谈别的',
}

let analyticsSpy: AnalyticsSpy

/** 勾选状态由上层持有，这里用一个最小壳把 state 接上，和 App 里的接法一致 */
function Harness({ answers = ANSWERS }: { answers?: ReportAnswers }) {
  const [fields, setFields] = useState<readonly PublicFieldId[]>(DEFAULT_PUBLIC_FIELDS)
  return (
    <SharePrivacyScreen
      year={2026}
      answers={answers}
      fields={fields}
      onToggleField={(id) => setFields(togglePublicField(fields, id))}
      onBack={() => undefined}
    />
  )
}

beforeEach(() => {
  installCanvasStub()
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
  vi.restoreAllMocks()
})

describe('SharePrivacyScreen', () => {
  it('默认只勾四项，敏感三项默认关闭并单独说明', () => {
    render(<Harness />)

    expect(screen.getByRole('checkbox', { name: /年度关键词/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /做成的小事/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /年度感受/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /写给明年的话/ })).toBeChecked()

    expect(screen.getByRole('checkbox', { name: /去过的地方/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /很重要的人/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /最难熬的一刻/ })).not.toBeChecked()
    expect(screen.getByText(/建议先问过 TA/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('会公开 4 项')
  })

  it('未作答的字段不出现在选择列表里', () => {
    render(<Harness answers={{ keyword: '重启' }} />)
    expect(screen.getByRole('checkbox', { name: /年度关键词/ })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /重复听的歌/ })).not.toBeInTheDocument()
  })

  it('勾选后预览立刻同步，取消后预览消失', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByText('县城的老家')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /去过的地方/ }))
    expect(screen.getByText('县城的老家')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('会公开 5 项')

    await user.click(screen.getByRole('checkbox', { name: /去过的地方/ }))
    expect(screen.queryByText('县城的老家')).not.toBeInTheDocument()
  })

  it('完整链接默认折叠，展开后仍需二次确认', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByRole('button', { name: '生成链接并复制' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /完整链接/ }))
    expect(screen.getByText(/转发之后无法撤回/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成链接并复制' })).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: /收不回来/ }))
    expect(screen.getByRole('button', { name: '生成链接并复制' })).toBeEnabled()
  })

  it('生成的链接只把勾选字段放在 # 之后，并只上报字段数量', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /完整链接/ }))
    await user.click(screen.getByRole('checkbox', { name: /收不回来/ }))
    await user.click(screen.getByRole('button', { name: '生成链接并复制' }))

    const link = screen.getByText(/#report=/).textContent!
    const url = new URL(link)
    expect(url.search).toBe('')
    expect(link).not.toContain('三月那通电话')
    const payload = decodePublicReport(url.hash.slice(1 + REPORT_FRAGMENT_PREFIX.length))
    expect(Object.keys(payload.answers).sort()).toEqual(
      ['feeling-scale', 'keyword', 'next-year-message', 'small-win'],
    )
    expect(analyticsSpy).toHaveBeenCalledWith('share_link_created', { version: 1, field_count: 4 })
  })

  it('改动勾选会让已生成的链接失效，避免拿旧链接当新的', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /完整链接/ }))
    await user.click(screen.getByRole('checkbox', { name: /收不回来/ }))
    await user.click(screen.getByRole('button', { name: '生成链接并复制' }))
    expect(screen.getByText(/#report=/)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /去过的地方/ }))
    expect(screen.queryByText(/#report=/)).not.toBeInTheDocument()
  })

  it('保存卡片与链接共用同一份勾选：只上报字段数量', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '保存总结卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'year-report', field_count: 4 })
  })
})
