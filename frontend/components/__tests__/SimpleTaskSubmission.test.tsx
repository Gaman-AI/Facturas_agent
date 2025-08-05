import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleTaskSubmission } from '../SimpleTaskSubmission'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock the API service
jest.mock('@/services/api', () => ({
  createBrowserUseTask: jest.fn()
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock auth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
    isInitialized: true
  })
}))

// Wrapper component for providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <LanguageProvider>
      {children}
    </LanguageProvider>
  </AuthProvider>
)

describe('SimpleTaskSubmission Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Quick Task Selection', () => {
    it('should display quick task buttons', () => {
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      // Check if quick task buttons are rendered
      expect(screen.getByText(/Search for recent news/)).toBeInTheDocument()
      expect(screen.getByText(/Check the weather forecast/)).toBeInTheDocument()
      expect(screen.getByText(/Find laptop prices/)).toBeInTheDocument()
      expect(screen.getByText(/Check latest posts/)).toBeInTheDocument()
    })

    it('should fill textarea when quick task button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      // Get the textarea
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea).toBeInTheDocument()

      // Click on a quick task button
      const quickTaskButton = screen.getByText(/Search for recent news/)
      await user.click(quickTaskButton)

      // Verify textarea is filled with the quick task text
      expect(textarea.value).toContain('Search for recent news')
    })

    it('should allow clicking multiple quick task buttons', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

      // Click first quick task
      const firstButton = screen.getByText(/Search for recent news/)
      await user.click(firstButton)
      expect(textarea.value).toContain('Search for recent news')

      // Click second quick task (should replace the first)
      const secondButton = screen.getByText(/Check the weather forecast/)
      await user.click(secondButton)
      expect(textarea.value).toContain('Check the weather forecast')
      expect(textarea.value).not.toContain('Search for recent news')
    })
  })

  describe('Text Input Functionality', () => {
    it('should allow typing in the textarea', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      
      // Type in the textarea
      await user.type(textarea, 'Test task description')
      
      expect(textarea.value).toBe('Test task description')
    })

    it('should update character count when typing', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      
      // Check initial character count
      expect(screen.getByText('500 characters remaining')).toBeInTheDocument()
      
      // Type some text
      await user.type(textarea, 'Hello world')
      
      // Check updated character count
      expect(screen.getByText('489 characters remaining')).toBeInTheDocument()
    })

    it('should show red text when approaching character limit', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      
      // Type a long text to approach the limit
      const longText = 'A'.repeat(460) // 40 characters remaining
      await user.type(textarea, longText)
      
      // Check if character count is red
      const charCount = screen.getByText('40 characters remaining')
      expect(charCount).toHaveClass('text-red-500')
    })
  })

  describe('Demo Mode Toggle', () => {
    it('should toggle demo mode when button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      // Check initial state
      expect(screen.getByText('Enable Demo')).toBeInTheDocument()
      
      // Click demo mode button
      const demoButton = screen.getByText('Enable Demo')
      await user.click(demoButton)
      
      // Check if demo mode is active
      expect(screen.getByText('Demo Active')).toBeInTheDocument()
      
      // Click again to disable
      await user.click(screen.getByText('Demo Active'))
      expect(screen.getByText('Enable Demo')).toBeInTheDocument()
    })

    it('should update submit button text based on demo mode', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      // Check initial submit button text
      expect(screen.getByText('Start Task')).toBeInTheDocument()
      
      // Enable demo mode
      const demoButton = screen.getByText('Enable Demo')
      await user.click(demoButton)
      
      // Check if submit button text changed
      expect(screen.getByText('Start Demo Task')).toBeInTheDocument()
    })
  })

  describe('LLM Provider Selection', () => {
    it('should allow changing LLM provider', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      // Check initial selection (OpenAI)
      expect(screen.getByText('OpenAI GPT-4O (Recommended)')).toBeInTheDocument()
      
      // Open the select dropdown
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      // Select Anthropic
      const anthropicOption = screen.getByText('Claude 3.5 Sonnet')
      await user.click(anthropicOption)
      
      // Check if selection changed
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should disable submit button when textarea is empty', () => {
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /Start Task/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when text is entered', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      const submitButton = screen.getByRole('button', { name: /Start Task/i })
      
      // Initially disabled
      expect(submitButton).toBeDisabled()
      
      // Type some text
      await user.type(textarea, 'Test task')
      
      // Should be enabled now
      expect(submitButton).toBeEnabled()
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      const mockApi = require('@/services/api')
      mockApi.createBrowserUseTask.mockResolvedValue({
        data: { task_id: 'test-task-123' }
      })

      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      const submitButton = screen.getByRole('button', { name: /Start Task/i })
      
      // Fill the form
      await user.type(textarea, 'Test task')
      
      // Submit the form
      await user.click(submitButton)
      
      // Check if loading state is shown
      expect(screen.getByText('Creating Task...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should show error message when API call fails', async () => {
      const user = userEvent.setup()
      const mockApi = require('@/services/api')
      mockApi.createBrowserUseTask.mockRejectedValue({
        response: { data: { message: 'API Error' } }
      })

      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      const submitButton = screen.getByRole('button', { name: /Start Task/i })
      
      // Fill and submit form
      await user.type(textarea, 'Test task')
      await user.click(submitButton)
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      // Check for proper labels
      expect(screen.getByLabelText(/What would you like the agent to do/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/AI model/i)).toBeInTheDocument()
      
      // Check for proper button roles
      expect(screen.getByRole('button', { name: /Start Task/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Enable Demo/i })).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <SimpleTaskSubmission />
        </TestWrapper>
      )

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      
      // Focus on textarea
      textarea.focus()
      expect(textarea).toHaveFocus()
      
      // Tab to quick task button
      await user.tab()
      const quickTaskButton = screen.getByText(/Search for recent news/)
      expect(quickTaskButton).toHaveFocus()
      
      // Press Enter to select quick task
      await user.keyboard('{Enter}')
      expect(textarea.value).toContain('Search for recent news')
    })
  })
}) 