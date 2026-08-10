import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges conditional Tailwind classes predictably', () => {
    const shouldHide = false

    expect(cn('px-2', shouldHide && 'hidden', 'px-4')).toBe('px-4')
  })
})
