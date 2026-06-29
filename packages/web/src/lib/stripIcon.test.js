import { describe, it, expect } from 'vitest'
import { stripIcon } from './stripIcon.js'

describe('stripIcon', () => {
  it('strips a leading emoji + space from a label', () => {
    expect(stripIcon('🔒 Block user')).toBe('Block user')
    expect(stripIcon('🌐 Language')).toBe('Language')
  })

  it('leaves plain text untouched', () => {
    expect(stripIcon('Dashboard')).toBe('Dashboard')
  })

  it('keeps leading digits and letters', () => {
    expect(stripIcon('2 items')).toBe('2 items')
  })

  it('passes through non-strings unchanged', () => {
    expect(stripIcon(null)).toBe(null)
    expect(stripIcon(42)).toBe(42)
  })
})
