/**
 * Bot form page with integrated Advanced AI Settings.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { botApi, modelApi, type BotCreate, type BotUpdate, type ModelInfo } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatWidgetPreview } from '@/components/ChatWidgetPreview'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Cpu,
  Cloud,
  ArrowRight,
  Download,
  Loader2,
  RefreshCw,
  Server,
  Database,
  Settings2,
  Sparkles,
  HelpCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BotFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditMode = Boolean(id)

  const [isTraining, setIsTraining] = useState(false)
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null)

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)

  // Model Management State
  const [pullModelName, setPullModelName] = useState('')
  const [pullingModel, setPullingModel] = useState(false)
  const [pullMessage, setPullMessage] = useState<string | null>(null)
  const [verifyingHF, setVerifyingHF] = useState(false)
  const [hfMessage, setHfMessage] = useState<string | null>(null)

  const getAbsoluteAvatarUrl = useCallback((url: string | null | undefined): string | null => {
    if (!url) return null
    if (url.startsWith('http')) return url
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    return `${API_URL}${url}`
  }, [])

  const [formData, setFormData] = useState<{
    name: string
    welcome_message: string
    accent_color: string
    position: 'bottom-right' | 'bottom-left' | 'bottom-center'
    show_button_text: boolean
    button_text: string
    message_limit: number

    // AI Config
    provider: 'openai' | 'ollama' | 'huggingface' | 'custom'
    model_id: string
    temperature: number
    ai_base_url: string
    ai_api_key: string

    source_type?: 'url' | 'text'
    source_content?: string
  }>({
    name: '',
    welcome_message: 'Hi! How can I help you today?',
    accent_color: '#3B82F6',
    position: 'bottom-right',
    show_button_text: true,
    button_text: 'Chat with us',
    message_limit: 1000,

    provider: 'ollama',
    model_id: 'llama3:latest',
    temperature: 0.7,
    ai_base_url: '',
    ai_api_key: '',
  })

  // Only 2 steps: AI Setup -> Details
  const [step, setStep] = useState<1 | 2>(isEditMode ? 2 : 1)

  const { data: bot } = useQuery({
    queryKey: ['bot', id],
    queryFn: () => botApi.get(id!),
    enabled: isEditMode,
  })

  const { data: localModels, refetch: refetchModels, isRefetching: refreshingModels } = useQuery({
    queryKey: ['models'],
    queryFn: modelApi.list,
    enabled: step === 1 || isEditMode
  })

  useEffect(() => {
    if (bot) {
      // Normalize provider: Backend 'local' -> Frontend 'ollama'
      let normalizedProvider = bot.provider as string;
      if (normalizedProvider === 'local') {
        normalizedProvider = 'ollama';
      }

      setFormData({
        name: bot.name,
        welcome_message: bot.welcome_message,
        accent_color: bot.accent_color,
        position: bot.position,
        show_button_text: bot.show_button_text,
        button_text: bot.button_text,
        message_limit: bot.message_limit,

        provider: normalizedProvider as any || 'ollama',
        model_id: bot.model_id || 'llama3:latest',
        temperature: bot.temperature || 0.7,
        ai_base_url: bot.ai_base_url || '',
        ai_api_key: bot.ai_api_key || '',

        source_type: bot.source_type || undefined,
        source_content: bot.source_content || undefined,
      })
      setAvatarPreview(getAbsoluteAvatarUrl(bot.avatar_url))
    }
  }, [bot, getAbsoluteAvatarUrl])

  const createMutation = useMutation({
    mutationFn: (data: BotCreate) => botApi.create(data),
    onSuccess: async (newBot) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      if (selectedAvatarFile) await botApi.uploadAvatar(newBot.id, selectedAvatarFile)
      if (newBot.source_type && newBot.source_content) await trainBot(newBot.id)
      else navigate('/dashboard')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: BotUpdate) => botApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] })
      queryClient.invalidateQueries({ queryKey: ['bot', id] })
    },
  })

  async function trainBot(botId: string) {
    setIsTraining(true)
    setTrainingMessage(t('training'))
    try {
      const result = await botApi.ingest(botId)
      setTrainingMessage(result.message)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (error: any) {
      setTrainingMessage(`Training failed: ${error.message}`)
    } finally {
      setIsTraining(false)
    }
  }

  async function handleTrainBot() {
    if (id && formData.source_type && formData.source_content) {
      await updateMutation.mutateAsync(formData)
      await trainBot(id)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    /* Avatar logic same as before */
    const file = e.target.files?.[0]
    if (!file) return
    if (!isEditMode) {
      setSelectedAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      return
    }
    setIsUploadingAvatar(true)
    try {
      const updatedBot = await botApi.uploadAvatar(id!, file)
      setAvatarPreview(getAbsoluteAvatarUrl(updatedBot.avatar_url))
      queryClient.invalidateQueries({ queryKey: ['bot', id] })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handlePullModel = async () => {
    if (!pullModelName) return
    setPullingModel(true)
    setPullMessage(null)
    try {
      const res = await modelApi.pull(pullModelName)
      setPullMessage(res.message)
      setTimeout(() => refetchModels(), 2000)
    } catch (e: any) {
      setPullMessage(`Error: ${e.message}`)
    } finally {
      setPullingModel(false)
    }
  }

  const handleVerifyHF = async () => {
    if (!formData.model_id) return
    setVerifyingHF(true)
    setHfMessage(null)
    try {
      const res = await modelApi.verify_hf(formData.model_id)
      setHfMessage(res.message)
    } catch (e: any) {
      setHfMessage(`Error: ${e.message}`)
    } finally {
      setVerifyingHF(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEditMode) updateMutation.mutate(formData)
    else createMutation.mutate(formData)
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || isTraining

  return (
    <div>
      <div className="mb-6">
        <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm" className="mb-4">
          ← {t('back_to_bots')}
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditMode ? t('edit_bot') : t('create_new_bot')}
        </h2>
      </div>

      {step === 1 ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('ai_provider')}</CardTitle>
                  <CardDescription>{t('ai_provider_desc') || "Select the AI provider for this bot."}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.provider}
                onValueChange={(val: any) => setFormData({ ...formData, provider: val })}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* OpenAI */}
                <div>
                  <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                  <Label htmlFor="openai" className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all h-full ${formData.provider === 'openai' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'}`}>
                    <Server className={`mb-3 h-6 w-6 ${formData.provider === 'openai' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-center font-semibold">{t('openai_cloud')}</div>
                    <Badge variant="outline" className="mt-2 bg-green-50 text-green-700">{t('recommended')}</Badge>
                  </Label>
                </div>

                {/* HuggingFace */}
                <div>
                  <RadioGroupItem value="huggingface" id="huggingface" className="peer sr-only" />
                  <Label htmlFor="huggingface" className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all h-full ${formData.provider === 'huggingface' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'}`}>
                    <Sparkles className={`mb-3 h-6 w-6 ${formData.provider === 'huggingface' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-center font-semibold">{t('huggingface')}</div>
                    <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700">{t('free_tier')}</Badge>
                  </Label>
                </div>

                {/* Local (Ollama) */}
                <div>
                  <RadioGroupItem value="ollama" id="ollama" className="peer sr-only" />
                  <Label htmlFor="ollama" className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all h-full ${formData.provider === 'ollama' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'}`}>
                    <Database className={`mb-3 h-6 w-6 ${formData.provider === 'ollama' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-center font-semibold">Local (Ollama)</div>
                    <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700">{t('privacy_focused') || "Private"}</Badge>
                  </Label>
                </div>

                {/* Custom */}
                <div>
                  <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                  <Label htmlFor="custom" className={`flex flex-col items-center justify-between rounded-xl border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all h-full ${formData.provider === 'custom' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'}`}>
                    <Settings2 className={`mb-3 h-6 w-6 ${formData.provider === 'custom' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-center font-semibold">{t('custom_ai')}</div>
                    <Badge variant="outline" className="mt-2 bg-purple-50 text-purple-700">{t('advanced')}</Badge>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Provider Specific Configuration Panel */}
          <Card className="border-border/50 shadow-sm animate-in fade-in slide-in-from-top-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-gray-500" />
                <CardTitle>
                  {formData.provider === 'openai' && 'OpenAI Settings'}
                  {formData.provider === 'huggingface' && 'Hugging Face Settings'}
                  {formData.provider === 'ollama' && 'Local AI Settings'}
                  {formData.provider === 'custom' && 'Custom Provider Settings'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* OPENAI */}
              {formData.provider === 'openai' && (
                <div className="grid gap-4">
                  <div>
                    <Label>Model Version</Label>
                    <Select value={formData.model_id} onValueChange={(v) => setFormData({ ...formData, model_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>API Key (Optional Override)</Label>
                    <Input
                      type="password"
                      placeholder="Leave empty to use Global System Settings"
                      value={formData.ai_api_key}
                      onChange={(e) => setFormData({ ...formData, ai_api_key: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* HUGGING FACE */}
              {formData.provider === 'huggingface' && (
                <div className="grid gap-4">
                  <div>
                    <Label>Access Token (hf_...)</Label>
                    <Input
                      type="password"
                      placeholder="Paste your HF token here"
                      value={formData.ai_api_key}
                      onChange={(e) => setFormData({ ...formData, ai_api_key: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Get your free token from <a href="https://huggingface.co/settings/tokens" target="_blank" className="underline">HuggingFace Settings</a>.</p>
                  </div>
                  <div>
                    <Label>Model ID</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="meta-llama/Meta-Llama-3-8B-Instruct"
                        value={formData.model_id}
                        onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                      />
                      <Button onClick={handleVerifyHF} disabled={verifyingHF || !formData.model_id} variant="secondary">
                        {verifyingHF ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                    {hfMessage && <p className="text-xs mt-1 text-green-600">{hfMessage}</p>}
                  </div>
                </div>
              )}

              {/* LOCAL (OLLAMA) */}
              {formData.provider === 'ollama' && (
                <div className="grid gap-4">
                  <div>
                    <Label>Ollama URL</Label>
                    <Input
                      placeholder="http://host.docker.internal:11434"
                      value={formData.ai_base_url}
                      onChange={(e) => setFormData({ ...formData, ai_base_url: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Default: <code>http://host.docker.internal:11434</code></p>
                  </div>

                  <Separator />

                  <div>
                    <Label>Select Model</Label>
                    <div className="flex gap-2 mt-1">
                      <Select value={formData.model_id} onValueChange={(v) => setFormData({ ...formData, model_id: v })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select available model" />
                        </SelectTrigger>
                        <SelectContent>
                          {localModels?.map((m: ModelInfo) => (
                            <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                          ))}
                          {(!localModels || localModels.length === 0) && <SelectItem value="placeholder" disabled>No models found</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={() => refetchModels()}>
                        <RefreshCw className={`h-4 w-4 ${refreshingModels ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Download New Model</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="e.g. llama3, mistral"
                        value={pullModelName}
                        onChange={(e) => setPullModelName(e.target.value)}
                      />
                      <Button onClick={handlePullModel} disabled={pullingModel || !pullModelName}>
                        {pullingModel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Pull
                      </Button>
                    </div>
                    {pullMessage && <p className="text-xs mt-1 text-blue-600">{pullMessage}</p>}
                  </div>
                </div>
              )}

              {/* CUSTOM */}
              {formData.provider === 'custom' && (
                <div className="grid gap-4">
                  <div>
                    <Label>Presets</Label>
                    <Select onValueChange={(val) => {
                      if (val === 'lm_studio') setFormData({ ...formData, ai_base_url: 'http://localhost:1234/v1', model_id: 'local-model' })
                      if (val === 'vllm') setFormData({ ...formData, ai_base_url: 'http://localhost:8000/v1', model_id: 'model' })
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select a preset" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lm_studio">LM Studio</SelectItem>
                        <SelectItem value="vllm">vLLM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1">
                      Base URL
                      <div title="Full URL to the OpenAI-compatible endpoint (e.g. http://localhost:1234/v1)">
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </div>
                    </Label>
                    <Input
                      placeholder="http://localhost:1234/v1"
                      value={formData.ai_base_url}
                      onChange={(e) => setFormData({ ...formData, ai_base_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      Model ID
                      <div title="The exact model name expected by the inference server">
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </div>
                    </Label>
                    <Input
                      placeholder="model-identifier"
                      value={formData.model_id}
                      onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                    />
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          <div className="flex justify-center mt-8">
            <Button size="lg" onClick={() => setStep(2)}>
              {t('next_step')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* STEP 2: Basic Bot Info (Name, etc) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="p-6">
                {/* Summary of Step 1 */}
                <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between border mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-md border shadow-sm">
                      {formData.provider === 'openai' && <Cloud className="h-4 w-4" />}
                      {formData.provider === 'huggingface' && <Sparkles className="h-4 w-4" />}
                      {formData.provider === 'ollama' && <Database className="h-4 w-4" />}
                      {formData.provider === 'custom' && <Settings2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase">{formData.provider}</p>
                      <p className="text-xs text-muted-foreground font-mono">{formData.model_id}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)} type="button">
                    {t('change')}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Avatar</Label>
                    <div className="mt-2 flex items-center gap-4">
                      {avatarPreview && <img src={avatarPreview} className="w-12 h-12 rounded-full object-cover border" alt="Avatar Preview" />}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        className="max-w-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Welcome Message</Label>
                    <Textarea value={formData.welcome_message} onChange={e => setFormData({ ...formData, welcome_message: e.target.value })} />
                  </div>
                  <div>
                    <Label>Temperature: {formData.temperature}</Label>
                    <input type="range" min="0" max="2" step="0.1" value={formData.temperature} onChange={e => setFormData({ ...formData, temperature: parseFloat(e.target.value) })} className="w-full" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <CardTitle className="mb-4">Training</CardTitle>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={formData.source_type === 'url' ? 'default' : 'outline'} onClick={() => setFormData({ ...formData, source_type: 'url' })}>Website URL</Button>
                    <Button type="button" variant={formData.source_type === 'text' ? 'default' : 'outline'} onClick={() => setFormData({ ...formData, source_type: 'text' })}>Direct Text</Button>
                  </div>
                  {formData.source_type === 'url' && (
                    <Input placeholder="https://example.com" value={formData.source_content || ''} onChange={e => setFormData({ ...formData, source_content: e.target.value })} />
                  )}
                  {formData.source_type === 'text' && (
                    <Textarea placeholder="Paste content here..." rows={4} value={formData.source_content || ''} onChange={e => setFormData({ ...formData, source_content: e.target.value })} />
                  )}

                  {isEditMode && formData.source_type && formData.source_content && (
                    <div className="pt-2">
                      <Button type="button" onClick={handleTrainBot} disabled={isTraining} variant="secondary" className="w-full">
                        {isTraining ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : 'Retrain Bot'}
                      </Button>
                    </div>
                  )}

                  {trainingMessage && (
                    <div className={`text-sm p-2 rounded ${trainingMessage.includes('failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {trainingMessage}
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>{t('cancel')}</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? t('saving') : isEditMode ? t('update_bot') : t('create_bot')}</Button>
              </div>
            </form>
          </div>
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <ChatWidgetPreview
                botName={formData.name || 'Bot'}
                welcomeMessage={formData.welcome_message}
                accentColor={formData.accent_color}
                position={formData.position}
                showButtonText={formData.show_button_text}
                buttonText={formData.button_text}
              />
            </div>
          </div>
        </div>
      )
      }
    </div >
  )
}
