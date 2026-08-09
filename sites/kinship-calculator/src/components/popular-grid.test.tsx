import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { POPULAR_RELATIONS } from '../data/popular-relations'
import { PopularGrid } from './popular-grid'

describe('PopularGrid', () => {
  it('渲染全部热门入口', () => {
    render(<PopularGrid onSelect={vi.fn()} />)
    for (const item of POPULAR_RELATIONS) {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    }
  })

  it('点击热门项回调对应 entryId', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(entryId: string) => void>()
    render(<PopularGrid onSelect={onSelect} />)

    await user.click(screen.getByText('妯娌'))
    expect(onSelect).toHaveBeenCalledWith('kc-zhouli')
  })
})
