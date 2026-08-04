import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCanvasStub, type RecordingCtx } from '../../test/canvas-stub'
import { LifeGridCanvas } from './life-grid-canvas'

describe('LifeGridCanvas', () => {
  let ctx: RecordingCtx

  beforeEach(() => {
    ctx = installCanvasStub()
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('渲染 canvas 且带无障碍标签', () => {
    render(<LifeGridCanvas weeksLived={52} totalWeeks={104} />)
    expect(screen.getByLabelText('人生格子图')).toBeInTheDocument()
  })

  it('为每个格子执行一次 fillRect（104 格）', () => {
    render(<LifeGridCanvas weeksLived={52} totalWeeks={104} />)
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(104)
  })

  it('存在 current 格时启动呼吸动画', () => {
    render(<LifeGridCanvas weeksLived={52} totalWeeks={104} />)
    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it('彩蛋模式（无 current 格）不启动动画', () => {
    render(<LifeGridCanvas weeksLived={200} totalWeeks={104} />)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })
})
