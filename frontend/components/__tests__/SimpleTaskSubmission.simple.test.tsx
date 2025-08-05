import React from 'react'
import { render, screen } from '@testing-library/react'
import { SimpleTaskSubmission } from '../SimpleTaskSubmission'

// Simple test without complex mocks
describe('SimpleTaskSubmission Component - Basic Rendering', () => {
  it('should render the component without crashing', () => {
    render(<SimpleTaskSubmission />)
    
    // Check if basic elements are rendered
    expect(screen.getByText(/Quick Task Submission/i)).toBeInTheDocument()
  })

  it('should display the textarea', () => {
    render(<SimpleTaskSubmission />)
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('should display quick task buttons', () => {
    render(<SimpleTaskSubmission />)
    
    // Look for buttons that contain "..." (quick task buttons)
    const buttons = screen.getAllByRole('button')
    const quickTaskButtons = buttons.filter(button => 
      button.textContent?.includes('...')
    )
    
    expect(quickTaskButtons.length).toBeGreaterThan(0)
  })

  it('should display demo mode section', () => {
    render(<SimpleTaskSubmission />)
    
    expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument()
    expect(screen.getByText(/Enable Demo/i)).toBeInTheDocument()
  })

  it('should display AI model selector', () => {
    render(<SimpleTaskSubmission />)
    
    expect(screen.getByText(/AI model/i)).toBeInTheDocument()
  })

  it('should display submit button', () => {
    render(<SimpleTaskSubmission />)
    
    const submitButton = screen.getByRole('button', { name: /Start Task/i })
    expect(submitButton).toBeInTheDocument()
  })
}) 