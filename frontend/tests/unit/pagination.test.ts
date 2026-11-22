import { describe, expect, it } from 'vitest'
import { pageWindow } from '@/lib/pagination'

describe('pageWindow (UI guide §7.4 pager)', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
  })

  it('keeps first, last, and the neighbours of the current page', () => {
    expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12])
  })

  it('shows a lone hidden page as its number instead of "…"', () => {
    expect(pageWindow(4, 12)).toEqual([1, 2, 3, 4, 5, 'gap', 12])
  })

  it('handles the first and the last page', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 'gap', 10])
    expect(pageWindow(10, 10)).toEqual([1, 'gap', 9, 10])
  })
})
