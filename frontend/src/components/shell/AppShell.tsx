import { useState } from 'react'
import { Menu } from 'lucide-react'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'

export interface NavigationItem {
  label: string
  href: string
  isActive?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

export interface User {
  name: string
  avatarUrl?: string
}

export interface AppShellProps {
  children: React.ReactNode
  navigationItems: NavigationItem[]
  user?: User
  onNavigate?: (href: string) => void
  onLogout?: () => void
}

export function AppShell({
  children,
  navigationItems,
  user,
  onNavigate,
  onLogout,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Header - fixed at top */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-50 flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button - only visible on mobile (< 640px) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mobile-menu-btn p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              WordOps Panel
            </span>
          </div>
        </div>

        {/* User Menu */}
        {user && <UserMenu user={user} onLogout={onLogout} />}
      </header>

      {/* Main Layout - padding-top accounts for fixed header */}
      <div className="pt-16 min-h-screen">
        {/* Sidebar Navigation - Desktop (640px+) */}
        <aside className="hidden sm:flex fixed left-0 top-16 bottom-0 w-[260px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-col">
          <MainNav
            items={navigationItems}
            onNavigate={onNavigate}
            orientation="vertical"
          />
        </aside>

        {/* Mobile Drawer - only visible on mobile (< 640px) */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <aside className="fixed left-0 top-16 bottom-0 w-[280px] bg-white dark:bg-zinc-900 z-50 sm:hidden flex flex-col shadow-xl">
              <MainNav
                items={navigationItems}
                onNavigate={(href) => {
                  onNavigate?.(href)
                  setIsMobileMenuOpen(false)
                }}
                orientation="vertical"
              />
            </aside>
          </>
        )}

        {/* Content Area - with proper spacing */}
        <main className="sm:ml-[260px]">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
