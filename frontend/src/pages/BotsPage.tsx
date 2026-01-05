import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { botApi, type Bot } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  MoreVertical,
  MessageSquare,
  Settings,
  Trash,
  Bot as BotIcon,
  Search,
  Play
} from 'lucide-react'

// Helper to convert relative avatar URL to absolute
const getAbsoluteAvatarUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  if (url.startsWith('http')) return url
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  return `${API_URL}${url}`
}

export function BotsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null)

  const { data: bots, isLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: botApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: botApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      setDeleteDialogOpen(false)
      setBotToDelete(null)
    },
  })

  function handleDelete(bot: Bot) {
    setBotToDelete(bot)
    setDeleteDialogOpen(true)
  }

  function confirmDelete() {
    if (botToDelete) {
      deleteMutation.mutate(botToDelete.id)
    }
  }

  const filteredBots = bots?.filter(bot =>
    bot.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-muted rounded-xl"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Chatbots</h2>
          <p className="text-muted-foreground mt-1">
            Create, manage, and monitor your AI assistants.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/bots/new')} size="lg" className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Bot
        </Button>
      </div>

      {/* Search and Filters (Future placeholder) */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {/* Empty State */}
      {!filteredBots || filteredBots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed border-muted rounded-xl">
          <div className="bg-muted p-4 rounded-full mb-4">
            <BotIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No chatbots found</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {searchQuery
              ? "No bots match your search terms."
              : "Get started by creating your first AI chatbot. It only takes a minute."}
          </p>
          <Button onClick={() => navigate('/dashboard/bots/new')} variant={searchQuery ? "outline" : "default"}>
            {searchQuery ? "Clear Search" : "Create New Bot"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              onEdit={() => navigate(`/dashboard/bots/${bot.id}`)}
              onTest={() => navigate(`/dashboard/bots/${bot.id}/test`)}
              onDelete={() => handleDelete(bot)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chatbot "<strong>{botToDelete?.name}</strong>" and remove all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BotCard({ bot, onEdit, onTest, onDelete }: { bot: Bot; onEdit: () => void; onTest: () => void; onDelete: () => void }) {
  const usagePercent = (bot.message_count / bot.message_limit) * 100
  const avatarUrl = getAbsoluteAvatarUrl(bot.avatar_url)

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={bot.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-background border"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: bot.accent_color }}
            >
              {bot.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <CardTitle className="text-base font-semibold leading-none">
              {bot.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Active
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onEdit}>
              <Settings className="mr-2 h-4 w-4" /> Edit Configuration
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTest}>
              <Play className="mr-2 h-4 w-4" /> Test Chatbot
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground h-10 line-clamp-2">
          {bot.welcome_message || <span className="italic opacity-50">No welcome message configured.</span>}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly Usage</span>
            <span className="font-medium">{bot.message_count} / {bot.message_limit}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-primary'
                }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1" onClick={onTest}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" />
            Chat
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            Configure
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
