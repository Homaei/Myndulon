/**
 * Dashboard layout with sidebar navigation and language switcher.
 */

import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Settings, LogOut, Bot, Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { t, i18n } = useTranslation()

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const navItems = [
    {
      name: t('bots'),
      path: '/dashboard',
      icon: Bot,
      exact: true
    },
    {
      name: t('title_widgets'),
      path: '/dashboard/widgets',
      icon: LayoutDashboard, // Or Use MessageSquare/Code
      exact: true
    },
    {
      name: t('settings'),
      path: '/dashboard/settings',
      icon: Settings,
      exact: false
    }
  ]

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location.pathname === item.path
    }
    return location.pathname.startsWith(item.path)
  }

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col transition-all duration-300">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('app_name')}
            </h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive(item)
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive(item) ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              A
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{t('admin_user')}</p>
              <p className="text-xs text-muted-foreground truncate">admin@myndulon.ai</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card/50 backdrop-blur sticky top-0 z-10 hidden lg:block">
          <div className="h-full px-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {navItems.find(item => isActive(item))?.name || t('dashboard')}
            </h2>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className="justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        {lang.label}
                      </span>
                      {i18n.language === lang.code && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/10 p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in-50 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
