import { useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppShell, type NavigationItem } from './components/shell'
import { AuthProvider, ProtectedRoute, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import * as Pages from './pages'

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Navigation configuration
const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Sites', href: '/sites' },
  { label: 'SSL', href: '/ssl' },
  { label: 'Server Config', href: '/server-config' },
  { label: 'Settings', href: '/settings' },
  { label: 'Profile', href: '/profile' },
  { label: 'Help', href: '/help' },
]

function AppContent() {
  const location = useLocation()

  // Login page - no auth required
  if (location.pathname === '/login') {
    return <Pages.Login />
  }

  // Protected routes - require auth
  return (
    <ProtectedRoute>
      <AuthenticatedContent />
    </ProtectedRoute>
  )
}

function AuthenticatedContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  // Update navigation items with active state
  const navigationItems = NAVIGATION_ITEMS.map((item) => ({
    ...item,
    isActive: item.href === location.pathname,
  }))

  // Get current route component
  const getCurrentPage = () => {
    switch (location.pathname) {
      case '/dashboard':
        return <Pages.Dashboard />
      case '/sites':
        return <Pages.Sites />
      case '/ssl':
        return <Pages.Ssl />
      case '/server-config':
        return <Pages.ServerConfig />
      case '/settings':
        return <Pages.Settings />
      case '/profile':
        return <Pages.Profile />
      case '/help':
        return <Pages.Help />
      default:
        // Handle dynamic routes like /sites/:id
        if (location.pathname.startsWith('/sites/')) {
          return <Pages.SiteDetails />
        }
        // Default to dashboard
        navigate('/dashboard', { replace: true })
        return null
    }
  }

  return (
    <AppShell
      navigationItems={navigationItems}
      user={{ name: 'Admin' }}
      onNavigate={navigate}
      onLogout={logout}
    >
      {getCurrentPage()}
    </AppShell>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
