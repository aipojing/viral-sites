import { fireEvent, render, screen } from '@testing-library/react'
import { installAnalyticsSpy, removeAnalyticsSpy, type AnalyticsSpy } from '@viral/shared/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub } from '../../test/canvas-stub'
import { MANDARIN_RELATIONS } from '../data/mandarin-relations'
import { SaveRelationCardButton } from './save-card-button'

function findEntry(id: string) {
  const entry = MANDARIN_RELATIONS.find((item) => item.id === id)
  if (!entry) throw new Error(`找不到 entry：${id}`)
  return entry
}

let analyticsSpy: AnalyticsSpy

beforeEach(() => {
  installCanvasStub()
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,X')
  analyticsSpy = installAnalyticsSpy()
})

afterEach(() => {
  removeAnalyticsSpy()
  vi.restoreAllMocks()
})

describe('SaveRelationCardButton', () => {
  it('桌面：点击触发下载并埋点 save_image { card: kinship }', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(
      <SaveRelationCardButton
        entry={findEntry('kc-maternal-uncle')}
        confidence="exact"
        pathLabels={['妈妈', '哥哥']}
        regionalLabels={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '保存称呼卡' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(analyticsSpy).toHaveBeenCalledWith('save_image', { card: 'kinship' })
  })

  it('微信：弹出长按保存提示层，可关闭', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone) MicroMessenger/8')
    render(
      <SaveRelationCardButton
        entry={findEntry('kc-maternal-uncle')}
        confidence="exact"
        pathLabels={['妈妈', '哥哥']}
        regionalLabels={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '保存称呼卡' }))
    expect(screen.getByText('长按图片保存')).toBeInTheDocument()
    expect(screen.getByAltText('亲戚称呼卡')).toBeInTheDocument()

    fireEvent.click(screen.getByText('长按图片保存'))
    expect(screen.queryByText('长按图片保存')).not.toBeInTheDocument()
  })

  it('导出异常：埋点 export_error 并提示截图降级', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Macintosh) Chrome/126')
    render(
      <SaveRelationCardButton
        entry={findEntry('kc-maternal-uncle')}
        confidence="exact"
        pathLabels={['妈妈', '哥哥']}
        regionalLabels={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '保存称呼卡' }))
    expect(analyticsSpy).toHaveBeenCalledWith('export_error', undefined)
    expect(screen.getByText('保存失败了，直接截图也一样')).toBeInTheDocument()
  })
})
