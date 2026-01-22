import {
  LayoutDashboard,
  Globe,
  Shield,
  Settings as SettingsIcon,
  User,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  href: string
  isActive?: boolean
}

export interface MainNavProps {
  items: NavigationItem[]
  onNavigate?: (href: string) => void
  orientation: 'vertical' | 'horizontal'
}

const icons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Sites: Globe,
  SSL: Shield,
  'Server Config': SettingsIcon,
  Settings: SettingsIcon,
  Profile: User,
  Help: HelpCircle,
}

export function MainNav({ items, onNavigate, orientation }: MainNavProps) {
  if (orientation === 'horizontal') {
    return (
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = icons[item.label]
          const isActive = item.isActive

          return (
            <button
              key={item.href}
              onClick={() => onNavigate?.(item.href)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-teal-600 dark:hover:text-teal-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = icons[item.label]
        const isActive = item.isActive

        return (
          <button
            key={item.href}
            onClick={() => onNavigate?.(item.href)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-teal-600 dark:hover:text-teal-400'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
