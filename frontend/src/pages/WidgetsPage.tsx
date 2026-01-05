import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { botApi, type Bot } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Code, Play, Check, Copy } from 'lucide-react'

export function WidgetsPage() {
    const { t } = useTranslation()
    const { data: bots, isLoading } = useQuery({
        queryKey: ['bots'],
        queryFn: botApi.list,
    })
    const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
    const [codeDialogOpen, setCodeDialogOpen] = useState(false)
    const [testDialogOpen, setTestDialogOpen] = useState(false)

    if (isLoading) {
        return <div className="p-8">{t('loading')}...</div>
    }

    const openCodeDialog = (bot: Bot) => {
        setSelectedBot(bot)
        setCodeDialogOpen(true)
    }

    const openTestDialog = (bot: Bot) => {
        setSelectedBot(bot)
        setTestDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('widgets_management')}</h2>
                <p className="text-muted-foreground mt-2">
                    {t('widgets_desc')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots?.map((bot) => (
                    <Card key={bot.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: bot.accent_color }}>
                                    {bot.name.charAt(0).toUpperCase()}
                                </div>
                                {bot.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                                {bot.welcome_message || t('no_welcome_message')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('bot_id')}:</span>
                                    <code className="bg-muted px-1 py-0.5 rounded">{bot.id.substring(0, 8)}...</code>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('model')}:</span>
                                    <span>{bot.provider === 'ollama' ? 'Local (Ollama)' : bot.provider === 'openai' ? 'OpenAI' : 'HuggingFace'} ({bot.model_id})</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => openCodeDialog(bot)}>
                                <Code className="mr-2 h-4 w-4" />
                                {t('get_code')}
                            </Button>
                            <Button onClick={() => openTestDialog(bot)}>
                                <Play className="mr-2 h-4 w-4" />
                                {t('test')}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <EmbedCodeDialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen} bot={selectedBot} />
            <TestWidgetDialog open={testDialogOpen} onOpenChange={setTestDialogOpen} bot={selectedBot} />
        </div>
    )
}

function EmbedCodeDialog({ open, onOpenChange, bot }: { open: boolean, onOpenChange: (open: boolean) => void, bot: Bot | null }) {
    const { t } = useTranslation()
    const [copied, setCopied] = useState(false)
    // Remove /api from end if present for script src, though usually it's just host
    // Actually the script is at /widget/widget.js (served by FastAPI static)
    // We'll use location.origin if we are on same domain, or configurable URL.
    const baseUrl = window.location.origin

    if (!bot) return null

    const embedCode = `<!-- Myndulon Widget -->
<div id="myndulon-widget"></div>
<script src="${baseUrl}/widget/widget.js"></script>
<script>
  MyndulonWidget.init({
    botId: '${bot.id}',
    apiKey: '${bot.api_key}', 
    apiUrl: '${baseUrl}',
    elementId: 'myndulon-widget'
  });
</script>`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(embedCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('embed_code_title', { name: bot.name })}</DialogTitle>
                    <DialogDescription>
                        {t('embed_code_desc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="relative mt-4 bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{embedCode}</pre>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={copyToClipboard}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function TestWidgetDialog({ open, onOpenChange, bot }: { open: boolean, onOpenChange: (open: boolean) => void, bot: Bot | null }) {
    const { t } = useTranslation()
    if (!bot) return null
    // Ideally we load the widget in an iframe or just render a placeholder that initializes it.
    // Since we are IN the app, we can maybe iframe the test_widget.html route?
    // Or just construct a simple preview.
    // Let's use an iframe to isolation.
    const baseUrl = window.location.origin
    // const testUrl = `${baseUrl}/widget/demo.html?botId=${bot.id}&apiUrl=${baseUrl}`

    // Note: demo.html needs to be updated to accept query params to be fully dynamic, 
    // or we can generate a blob URL.

    // For now, let's create a Blob with the HTML content to render into iframe
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Widget Test</title>
        <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;margin:0;}</style>
    </head>
    <body>
        <h2>${t('widget_will_appear')}</h2>
        <div id="myndulon-widget"></div>
        <script src="${baseUrl}/widget/widget.js"></script>
        <script>
        window.onload = function() {
            MyndulonWidget.init({
                botId: '${bot.id}',
                apiKey: '${bot.api_key}',
                apiUrl: '${baseUrl}',
                elementId: 'myndulon-widget'
            });
        }
        </script>
    </body>
    </html>
    `
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <div className="p-4 border-b">
                    <DialogTitle>{t('testing_bot', { name: bot.name })}</DialogTitle>
                </div>
                <div className="flex-1 bg-gray-50 relative rounded-b-lg overflow-hidden">
                    <iframe
                        src={url}
                        className="w-full h-full border-0"
                        title="Widget Preview"
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
