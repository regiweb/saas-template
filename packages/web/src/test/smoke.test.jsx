import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Baseline smoke test: proves the React + jsdom + Testing Library pipeline works.
// Feature-specific component tests are added alongside their components.
function Hello({ name }) {
  return <button type="button">Hello {name}</button>
}

describe('test harness', () => {
  it('renders a React component into jsdom', () => {
    render(<Hello name="EZL" />)
    expect(screen.getByRole('button')).toHaveTextContent('Hello EZL')
  })
})
