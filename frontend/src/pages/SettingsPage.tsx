import { useState, useEffect } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Server, Cpu, Key, Database, RefreshCw, Save } from 'lucide-react'

// Define types for config
interface AIConfig {
    ai_provider: 'openai' | 'local'
    openai_api_key?: string
    ollama_base_url?: string
}

export function SettingsPage() {
    const [config, setConfig] = useState<AIConfig>({
        ai_provider: 'local',
        ollama_base_url: 'http://host.docker.internal:11434',
        openai_api_key: ''
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/config')
            if (res.ok) {
                const data = await res.json()
                setConfig(data)
            }
        } catch (error) {
            toast({
                title: "Error fetching settings",
                description: "Could not load current configuration.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (!res.ok) throw new Error()

            toast({
                title: "Settings saved",
                description: "Your AI configuration has been updated successfully.",
            })
        } catch (error) {
            toast({
                title: "Save failed",
                description: "Could not save configuration. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
                    <p className="text-muted-foreground mt-2">Manage your AI provider and system configurations.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-sm">
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <Separator className="my-6" />

            <div className="grid gap-6">
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Cpu className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>AI Provider</CardTitle>
                                <CardDescription>Choose the underlying AI model for your chatbots.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={config.ai_provider}
                            onValueChange={(val: 'openai' | 'local') => setConfig({ ...config, ai_provider: val })}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                                <Label
                                    htmlFor="openai"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                    <Server className="mb-3 h-6 w-6 text-muted-foreground peer-data-[state=checked]:text-primary" />
                                    <div className="text-center space-y-1">
                                        <div className="font-semibold text-lg">OpenAI (Cloud)</div>
                                        <div className="text-sm text-muted-foreground">Uses GPT-4o-mini. Fast, smart, but requires API key.</div>
                                    </div>
                                    <Badge variant="outline" className="mt-4 border-green-200 bg-green-50 text-green-700">Recommended</Badge>
                                </Label>
                            </div>

                            <div>
                                <RadioGroupItem value="local" id="local" className="peer sr-only" />
                                <Label
                                    htmlFor="local"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                    <Database className="mb-3 h-6 w-6 text-muted-foreground peer-data-[state=checked]:text-primary" />
                                    <div className="text-center space-y-1">
                                        <div className="font-semibold text-lg">Local AI (Ollama)</div>
                                        <div className="text-sm text-muted-foreground">Runs locally on your CPU/GPU. Private & Free.</div>
                                    </div>
                                    <Badge variant="outline" className="mt-4 border-blue-200 bg-blue-50 text-blue-700">Experimental</Badge>
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {config.ai_provider === 'openai' && (
                    <Card className="animate-in fade-in slide-in-from-top-4 border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-green-600" />
                                <CardTitle>OpenAI Configuration</CardTitle>
                            </div>
                            <CardDescription>
                                Verify your API key. Keys are stored securely.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <Label htmlFor="api-key">OpenAI API Key</Label>
                                <Input
                                    id="api-key"
                                    type="password"
                                    value={config.openai_api_key || ''}
                                    onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="font-mono bg-muted/30"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Start with <code>sk-proj...</code>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {config.ai_provider === 'local' && (
                    <Card className="animate-in fade-in slide-in-from-top-4 border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                                <CardTitle>Local AI Configuration</CardTitle>
                            </div>
                            <CardDescription>
                                Configure connection to your local Ollama instance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ollama-url">Ollama Base URL</Label>
                                <Input
                                    id="ollama-url"
                                    value={config.ollama_base_url || ''}
                                    onChange={(e) => setConfig({ ...config, ollama_base_url: e.target.value })}
                                    placeholder="http://host.docker.internal:11434"
                                    className="font-mono bg-muted/30"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Default: <code>http://host.docker.internal:11434</code> (allows Docker to access host localhost)
                                </p>
                            </div>

                            <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">Prerequisite</h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p>Ensure you have run <code>ollama pull llama3</code> and <code>ollama serve</code> on your host machine.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
