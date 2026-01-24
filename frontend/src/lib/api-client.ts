const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

type AuthErrorHandler = ((error: Error) => void) | null

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private onAuthError: AuthErrorHandler = null

  constructor(baseUrl: string = API_BASE_URL) {
    // Use baseUrl directly (empty string means relative URLs)
    this.baseUrl = baseUrl
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token')
  }

  setAuthErrorHandler(handler: (error: Error) => void) {
    this.onAuthError = handler
  }

  clearAuthErrorHandler() {
    this.onAuthError = null
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Build URL: if baseUrl is empty, use relative path; otherwise concatenate
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Spread existing headers if they exist
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>
      Object.assign(headers, existingHeaders)
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        const error = new Error('Session expired. Please log in again.')
        // Trigger auth error handler if registered
        if (this.onAuthError) {
          this.onAuthError(error)
        }
        throw error
      }

      const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
      // FastAPI uses 'detail' field for error messages
      const errorMessage = error.detail || error.message || `HTTP ${response.status}`
      throw new Error(errorMessage)
    }

    // Handle 204 No Content responses (e.g., DELETE requests)
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
