import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Page from '@/app/page'

describe('Smoke Test', () => {
  it('renders the page without crashing', () => {
    render(<Page />)
    expect(screen.getByText('EUANGELION')).toBeInTheDocument()
  })
})
