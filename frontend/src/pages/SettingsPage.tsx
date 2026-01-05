import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Server, Cpu, Key, Database, RefreshCw, Save, Settings2, Sparkles } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

// Define types for config
interface AIConfig {
    ai_provider: 'openai' | 'local' | 'custom' | 'huggingface'
    openai_api_key?: string
    huggingface_api_key?: string
    ollama_base_url?: string // kept for backward compatibility or presets
    base_url?: string       // generic base url
    model_name?: string     // generic model name
}

export function SettingsPage() {
    const { t } = useTranslation()
    const [config, setConfig] = useState<AIConfig>({
        ai_provider: 'local',
        ollama_base_url: 'http://host.docker.internal:11434',
        base_url: '',
        model_name: '',
        openai_api_key: '',
        huggingface_api_key: ''
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
                // Migration/Normalization logc if needed
                setConfig(data)
            }
        } catch (error) {
            toast({
                title: t('error_fetching_settings'),
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
                title: t('settings_saved'),
                description: "Your AI configuration has been updated successfully.",
            })
        } catch (error) {
            toast({
                title: t('save_failed'),
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
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{t('system_settings')}</h2>
                    <p className="text-muted-foreground mt-2">{t('settings_desc')}</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-sm">
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('saving')}...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            {t('save_changes')}
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
                                <CardTitle>{t('ai_provider')}</CardTitle>
                                <CardDescription>{t('ai_provider_desc')}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={config.ai_provider}
                            onValueChange={(val: any) => setConfig({ ...config, ai_provider: val })}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        >
                            {/* OpenAI */}
                            <div>
                                <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                                <Label
                                    htmlFor="openai"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                    <Server className="mb-3 h-6 w-6 text-muted-foreground peer-data-[state=checked]:text-primary" />
                                    <div className="text-center space-y-1">
                                        <div className="font-semibold text-lg">{t('openai_cloud')}</div>
                                        <div className="text-sm text-muted-foreground">{t('openai_desc')}</div>
                                    </div>
                                    <Badge variant="outline" className="mt-4 border-green-200 bg-green-50 text-green-700">{t('recommended')}</Badge>
                                </Label>
                            </div>

                            {/* HuggingFace */}
                            <div>
                                <RadioGroupItem value="huggingface" id="huggingface" className="peer sr-only" />
                                <Label
                                    htmlFor="huggingface"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                    <Sparkles className="mb-3 h-6 w-6 text-muted-foreground peer-data-[state=checked]:text-primary" />
                                    <div className="text-center space-y-1">
                                        <div className="font-semibold text-lg">{t('huggingface')}</div>
                                        <div className="text-sm text-muted-foreground">{t('inference_api')}</div>
                                    </div>
                                    <Badge variant="outline" className="mt-4 border-yellow-200 bg-yellow-50 text-yellow-700">{t('free_tier')}</Badge>
                                </Label>
                            </div>

                            {/* Local AI (Ollama Preset) */}
                            <div>
                                <RadioGroupItem value="local" id="local" className="peer sr-only" />
                                <Label
                                    htmlFor="local"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                    <Database className="mb-3 h-6 w-6 text-muted-foreground peer-data-[state=checked]:text-primary" />
                                    <div className="text-center space-y-1">
                                        <div className="font-semibold text-lg">{t('local_ai_quick')}</div>
                                        <div className="text-sm text-muted-foreground">{t('local_ai_quick_desc')}</div>
                                    </div>
                                    <Badge variant="outline" className="mt-4 border-blue-200 bg-blue-50 text-blue-700">{t('experimental')}</Badge>
                                </Label>
                            </div>

                            {/* Custom / Generic */}
                            <div>
                                <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                                <Label
                                    htmlFor="custom"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                                >
                                    <Settings2 className="mb-3 h-6 w-6 text-muted-foreground peer-data-[state=checked]:text-primary" />
                                    <div className="text-center space-y-1">
                                        <div className="font-semibold text-lg">{t('custom_ai')}</div>
                                        <div className="text-sm text-muted-foreground">{t('custom_ai_desc')}</div>
                                    </div>
                                    <Badge variant="outline" className="mt-4 border-purple-200 bg-purple-50 text-purple-700">{t('advanced')}</Badge>
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Configurations based on selection */}
                {config.ai_provider === 'openai' && (
                    <Card className="animate-in fade-in slide-in-from-top-4 border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-green-600" />
                                <CardTitle>{t('openai_config')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <Label htmlFor="api-key">{t('openai_key')}</Label>
                                <Input
                                    id="api-key"
                                    type="password"
                                    value={config.openai_api_key || ''}
                                    onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="font-mono bg-muted/30"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {config.ai_provider === 'huggingface' && (
                    <Card className="animate-in fade-in slide-in-from-top-4 border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-yellow-600" />
                                <CardTitle>{t('hf_config')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="hf-key">{t('access_token')}</Label>
                                    <Input
                                        id="hf-key"
                                        type="password"
                                        value={config.huggingface_api_key || ''}
                                        onChange={(e) => setConfig({ ...config, huggingface_api_key: e.target.value })}
                                        placeholder="hf_..."
                                        className="font-mono bg-muted/30"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('hf_token_desc')}
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hf-model">{t('model_id')}</Label>
                                    <Input
                                        id="hf-model"
                                        value={config.model_name || ''}
                                        onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                                        placeholder="meta-llama/Meta-Llama-3-8B-Instruct"
                                        className="font-mono bg-muted/30"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {config.ai_provider === 'local' && (
                    <Card className="animate-in fade-in slide-in-from-top-4 border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                                <CardTitle>{t('local_config')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="ollama-url">{t('ollama_url')}</Label>
                                <Input
                                    id="ollama-url"
                                    value={config.ollama_base_url || ''}
                                    onChange={(e) => setConfig({ ...config, ollama_base_url: e.target.value })}
                                    placeholder="http://host.docker.internal:11434"
                                    className="font-mono bg-muted/30"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Default: <code>http://host.docker.internal:11434</code>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {config.ai_provider === 'custom' && (
                    <Card className="animate-in fade-in slide-in-from-top-4 border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-purple-600" />
                                <CardTitle>{t('custom_config')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>{t('presets')}</Label>
                                    <Select onValueChange={(val) => {
                                        if (val === 'lm_studio') {
                                            setConfig({ ...config, base_url: 'http://localhost:1234/v1', model_name: 'local-model' })
                                        } else if (val === 'vllm') {
                                            setConfig({ ...config, base_url: 'http://localhost:8000/v1', model_name: 'model-name' })
                                        } else if (val === 'localai') {
                                            setConfig({ ...config, base_url: 'http://localhost:8080/v1', model_name: 'gpt-4' })
                                        }
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_preset')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lm_studio">LM Studio (localhost:1234)</SelectItem>
                                            <SelectItem value="vllm">vLLM (localhost:8000)</SelectItem>
                                            <SelectItem value="localai">LocalAI (localhost:8080)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="grid gap-2">
                                    <Label htmlFor="base-url">{t('base_url')}</Label>
                                    <Input
                                        id="base-url"
                                        value={config.base_url || ''}
                                        onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                                        placeholder="http://localhost:1234/v1"
                                        className="font-mono bg-muted/30"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        e.g., LM Studio, LocalAI, vLLM endpoint.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="model-name">{t('model_name')}</Label>
                                    <Input
                                        id="model-name"
                                        value={config.model_name || ''}
                                        onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                                        placeholder="llama-2-7b-chat"
                                        className="font-mono bg-muted/30"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The specific model identifier to request.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
