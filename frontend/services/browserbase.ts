/**
 * Browserbase Service for Frontend
 * 
 * This service handles Browserbase session management and live view URLs
 * for the browser automation interface.
 */

export interface BrowserbaseSession {
  id: string
  status: 'RUNNING' | 'STOPPED' | 'ERROR'
  live_view_url: string
  connect_url?: string
  created_at: string
  context_name?: string
}

export interface CreateSessionRequest {
  context_name?: string
  project_id?: string
  keep_alive?: boolean
  timeout?: number
}

export interface CreateSessionResponse {
  success: boolean
  session_id?: string
  live_view_url?: string
  connect_url?: string
  error?: string
}

class BrowserbaseService {
  private baseUrl: string
  private apiKey: string | null = null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
    this.apiKey = process.env.NEXT_PUBLIC_BROWSERBASE_API_KEY || null
  }

  /**
   * Create a new Browserbase session
   */
  async createSession(request: CreateSessionRequest = {}): Promise<CreateSessionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/browserbase/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      return {
        success: true,
        session_id: data.session_id,
        live_view_url: data.live_view_url,
        connect_url: data.connect_url
      }
    } catch (error) {
      console.error('Failed to create Browserbase session:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<BrowserbaseSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/browserbase/sessions/${sessionId}`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get Browserbase session status:', error)
      return null
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/browserbase/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      })

      return response.ok
    } catch (error) {
      console.error('Failed to terminate Browserbase session:', error)
      return false
    }
  }

  /**
   * List all active sessions
   */
  async listSessions(): Promise<BrowserbaseSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/browserbase/sessions`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.sessions || []
    } catch (error) {
      console.error('Failed to list Browserbase sessions:', error)
      return []
    }
  }

  /**
   * Generate a live view URL for a session
   */
  generateLiveViewUrl(sessionId: string): string {
    return `https://www.browserbase.com/sessions/${sessionId}`
  }

  /**
   * Check if Browserbase is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { configured: boolean; hasApiKey: boolean } {
    return {
      configured: this.isConfigured(),
      hasApiKey: !!this.apiKey
    }
  }
}

// Export singleton instance
export const browserbaseService = new BrowserbaseService() 