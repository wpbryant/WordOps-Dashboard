import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiClient } from '../lib/api-client'

interface User {
  username: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        apiClient.setToken(token)
      } catch {
        // Invalid stored user, clear everything
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      }
    }

    setIsLoading(false)
  }, [])

  // Register auth error handler for automatic logout on 401
  useEffect(() => {
    const handleAuthError = () => {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      apiClient.clearToken()
      setUser(null)
      navigate('/login', { replace: true, state: { sessionExpired: true } })
    }

    apiClient.setAuthErrorHandler(handleAuthError)

    return () => {
      apiClient.clearAuthErrorHandler()
    }
  }, [navigate])

  const login = useCallback(async (username: string, password: string) => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    const loginUrl = apiUrl ? `${apiUrl}/api/v1/auth/login` : '/api/v1/auth/login'

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        password,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(error.detail || 'Invalid username or password')
    }

    const data = await response.json()

    // Store token and user
    const userData: User = { username }
    localStorage.setItem('auth_token', data.access_token)
    localStorage.setItem('auth_user', JSON.stringify(userData))
    apiClient.setToken(data.access_token)
    setUser(userData)

    // Redirect to dashboard
    navigate('/dashboard', { replace: true })
  }, [navigate])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    apiClient.clearToken()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate])

  // Redirect to dashboard if authenticated user visits root or login page
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (location.pathname === '/' || location.pathname === '/login') {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
