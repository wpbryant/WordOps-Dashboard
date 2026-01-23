import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  // Check API connectivity on mount
  useEffect(() => {
    const checkApi = async () => {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const healthUrl = apiUrl ? `${apiUrl}/api/v1/config-check` : '/api/v1/config-check'
      try {
        const response = await fetch(healthUrl)
        const data = await response.json()
        setDebugInfo(`API URL: ${apiUrl || '(relative)'} | CORS: ${data.cors_origins?.[0] || 'unknown'} | Username: ${data.admin_username || 'unknown'}`)
      } catch (e) {
        setDebugInfo(`API URL: ${apiUrl || '(relative)'} | Cannot reach API: ${e instanceof Error ? e.message : 'unknown'}`)
      }
    }
    checkApi()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, password)
    } catch (err) {
      console.error('[LOGIN ERROR]', err)
      if (err instanceof Error) {
        // Show the actual error message from the API
        setError(err.message)
      } else {
        setError('Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            WordOps Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Sign in to access your server
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              Use the credentials you created during installation
            </p>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              {debugInfo}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-500 mt-6">
          WordOps Dashboard v1.0.0
        </p>
      </div>
    </div>
  )
}
