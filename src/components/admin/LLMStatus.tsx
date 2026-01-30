import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { supabaseService } from '@/lib/supabase'
import {
  CheckCircle,
  XCircle,
  Brain,
  Sparkle,
  FloppyDisk,
} from '@phosphor-icons/react'

interface ProviderStatus {
  configured: boolean
  name: string
}

interface AIStatus {
  providers: {
    openRouter: ProviderStatus
    openai: ProviderStatus
    gemini: ProviderStatus
  }
  errors: { tracked: boolean; message: string }
  rateLimiting: { enabled: boolean; message: string }
}

type ConversationalProvider = 'gemini' | 'openai' | 'openrouter'

type AlertDelivery = 'silent' | 'email' | 'sms' | 'both'

interface AIConfig {
  conversational_provider?: ConversationalProvider
  conversational_model_id?: string
  image_model_primary?: string
  image_model_fallback?: string
  openrouter_enabled?: boolean
  alert_email?: string
  alert_phone?: string
  alert_system_errors?: AlertDelivery
  alert_rate_limiting?: AlertDelivery
  alert_ai_failures?: AlertDelivery
  alert_payment_orders?: AlertDelivery
  alert_external_services?: AlertDelivery
}

const ALERT_CATEGORIES: { key: keyof AIConfig; label: string }[] = [
  { key: 'alert_system_errors', label: 'System errors' },
  { key: 'alert_rate_limiting', label: 'Rate limiting' },
  { key: 'alert_ai_failures', label: 'AI failures' },
  { key: 'alert_payment_orders', label: 'Payment / orders' },
  { key: 'alert_external_services', label: 'External services' },
]

const DELIVERY_OPTIONS: { value: AlertDelivery; label: string }[] = [
  { value: 'silent', label: 'Silent' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'both', label: 'Email + SMS' },
]

const CONVERSATIONAL_OPTIONS: { value: ConversationalProvider; label: string }[] = [
  { value: 'gemini', label: 'Gemini (default, with OpenAI fallback)' },
  { value: 'openai', label: 'OpenAI (e.g. GPT-4o)' },
  { value: 'openrouter', label: 'OpenRouter' },
]

const CONVERSATIONAL_MODELS: Record<ConversationalProvider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  openrouter: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'],
}

const IMAGE_PRIMARY_OPTIONS = [
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-preview-05-20',
]

const IMAGE_FALLBACK_OPTIONS = ['gemini-2.0-flash-exp', 'dall-e-3']

export function LLMStatus() {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        setIsLoading(false)
        return
      }
      const headers = { Authorization: `Bearer ${session.access_token}` }
      const [statusRes, configRes] = await Promise.all([
        fetch('/api/admin/ai/status', { headers }),
        fetch('/api/admin/ai/config', { headers }),
      ])
      if (statusRes.ok) setStatus(await statusRes.json())
      if (configRes.ok) setConfig(await configRes.json())
    } catch (error: any) {
      console.error('Failed to load AI data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveConfig = async () => {
    if (!config) return
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        setSaveMessage('Not authenticated')
        return
      }
      const res = await fetch('/api/admin/ai/config', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversational_provider: config.conversational_provider ?? 'gemini',
          conversational_model_id: config.conversational_model_id ?? 'gemini-2.0-flash',
          image_model_primary: config.image_model_primary ?? 'gemini-2.0-flash-exp-image-generation',
          image_model_fallback: config.image_model_fallback ?? 'gemini-2.0-flash-exp',
          openrouter_enabled: config.openrouter_enabled ?? false,
          alert_email: config.alert_email ?? '',
          alert_phone: config.alert_phone ?? '',
          alert_system_errors: config.alert_system_errors ?? 'email',
          alert_rate_limiting: config.alert_rate_limiting ?? 'email',
          alert_ai_failures: config.alert_ai_failures ?? 'email',
          alert_payment_orders: config.alert_payment_orders ?? 'email',
          alert_external_services: config.alert_external_services ?? 'email',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveMessage(err.error || 'Failed to save')
        return
      }
      setConfig(await res.json())
      setSaveMessage('Saved.')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (e: any) {
      setSaveMessage(e.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestAlert = async (channel: 'email' | 'sms') => {
    setTestMessage(null)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        setTestMessage('Not authenticated')
        return
      }
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setTestMessage(`Test ${channel} sent.`)
      else setTestMessage(data.error || 'Failed')
    } catch (e: any) {
      setTestMessage(e.message || 'Failed')
    }
    setTimeout(() => setTestMessage(null), 4000)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading AI status...
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load AI status
      </div>
    )
  }

  const provider = (config?.conversational_provider ?? 'gemini') as ConversationalProvider
  const modelOptions = CONVERSATIONAL_MODELS[provider] || CONVERSATIONAL_MODELS.gemini

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Provider Status</h2>
        <p className="text-muted-foreground">Configuration and model selection</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(status.providers).map(([key, p]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain size={20} />
                {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {p.configured ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle size={14} className="mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle size={14} className="mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Selection</CardTitle>
          <CardDescription>
            Choose conversational and image models. No hardcoded models on the site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Conversational LLM</Label>
              <Select
                value={config?.conversational_provider ?? 'gemini'}
                onValueChange={(v) =>
                  setConfig((c) => ({ ...c, conversational_provider: v as ConversationalProvider }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONVERSATIONAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conversational model ID</Label>
              <Select
                value={config?.conversational_model_id ?? 'gemini-2.0-flash'}
                onValueChange={(v) =>
                  setConfig((c) => ({ ...c, conversational_model_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image generation (primary)</Label>
              <Select
                value={config?.image_model_primary ?? 'gemini-2.0-flash-exp-image-generation'}
                onValueChange={(v) => setConfig((c) => ({ ...c, image_model_primary: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_PRIMARY_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image generation (fallback)</Label>
              <Input
                value={config?.image_model_fallback ?? 'gemini-2.0-flash-exp'}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, image_model_fallback: e.target.value }))
                }
                placeholder="e.g. gemini-2.0-flash-exp or dall-e-3"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Use OpenRouter for conversational AI</Label>
              <p className="text-sm text-muted-foreground">
                When on, conversational LLM uses OpenRouter; when off, Gemini/OpenAI only.
              </p>
            </div>
            <Switch
              checked={config?.openrouter_enabled ?? false}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, openrouter_enabled: v }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveConfig} disabled={isSaving}>
              <FloppyDisk size={18} className="mr-2" />
              {isSaving ? 'Saving...' : 'Save config'}
            </Button>
            {saveMessage && (
              <span className="text-sm text-muted-foreground">{saveMessage}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts (Mailjet)</CardTitle>
          <CardDescription>
            Receive notifications by email or SMS when the system fails. Set recipients and choose delivery per category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Alert email</Label>
              <Input
                type="email"
                value={config?.alert_email ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, alert_email: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Alert phone (E.164 for SMS)</Label>
              <Input
                value={config?.alert_phone ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, alert_phone: e.target.value }))}
                placeholder="+1234567890"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Delivery per category</Label>
            {ALERT_CATEGORIES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded border p-3">
                <span className="text-sm font-medium">{label}</span>
                <Select
                  value={(config?.[key] as AlertDelivery) ?? 'email'}
                  onValueChange={(v) => setConfig((c) => ({ ...c, [key]: v }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleTestAlert('email')}>
              Test email
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleTestAlert('sms')}>
              Test SMS
            </Button>
            {testMessage && (
              <span className="text-sm text-muted-foreground">{testMessage}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Save config above to persist alert email, phone, and category settings.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Features</CardTitle>
          <CardDescription>Error tracking and rate limiting status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Error Tracking</p>
              <p className="text-sm text-muted-foreground">{status.errors.message}</p>
            </div>
            {status.errors.tracked ? (
              <Badge variant="default" className="bg-green-500">
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Not Enabled</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Rate Limiting</p>
              <p className="text-sm text-muted-foreground">{status.rateLimiting.message}</p>
            </div>
            {status.rateLimiting.enabled ? (
              <Badge variant="default" className="bg-green-500">
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Not Enabled</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
