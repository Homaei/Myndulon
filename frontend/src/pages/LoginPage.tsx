import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, User, Loader2, Sparkles, Globe, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Invalid username or password')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50/50">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/80">
              <Globe className="h-5 w-5 text-gray-700" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className="justify-between cursor-pointer"
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

      <div className="w-full max-w-md p-4 z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {t('app_name')}
            </h1>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-gray-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle className="text-xl">{t('welcome_back')}</CardTitle>
            <CardDescription>
              {t('enter_credentials')}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-md flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">{t('username')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button
                type="submit"
                className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('signing_in')}
                  </>
                ) : (
                  t('signin')
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-400 mt-8">
          {t('powered_by')}
        </p>
      </div>
    </div>
  )
}
