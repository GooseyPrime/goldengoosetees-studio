import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoogleLogo, CheckCircle, Warning, Link as LinkIcon, Copy } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { kvService } from '@/lib/kv'

interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function GoogleOAuthConfig() {
  const [config, setConfig] = useState<GoogleOAuthConfig>({
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin
  })
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    const saved = await kvService.get<GoogleOAuthConfig>('google-oauth-config')
    if (saved) {
      setConfig(saved)
      setIsConfigured(!!saved.clientId && !!saved.clientSecret)
    }
  }

  const handleSave = async () => {
    if (!config.clientId || !config.clientSecret) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await kvService.set('google-oauth-config', config)
      setIsConfigured(true)
      toast.success('Google OAuth configuration saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <GoogleLogo size={24} className="text-primary" weight="bold" />
            </div>
            <div>
              <CardTitle>Google OAuth Configuration</CardTitle>
              <CardDescription>Configure Google sign-in for user authentication</CardDescription>
            </div>
          </div>
          {isConfigured && (
            <Badge variant="outline" className="gap-2">
              <CheckCircle size={16} weight="fill" className="text-green-500" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Warning size={20} weight="duotone" />
          <AlertDescription>
            Google OAuth credentials are managed through Google Cloud Console. 
            This configuration works alongside Supabase Authentication settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="redirect-uri">Authorized Redirect URI</Label>
            <div className="flex gap-2">
              <Input
                id="redirect-uri"
                value={config.redirectUri}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(config.redirectUri)}
              >
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this URL to "Authorized redirect URIs" in your Google Cloud Console OAuth settings.
              Also add it to "Redirect URLs" in your Supabase Authentication settings.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-id">Google Client ID</Label>
            <Input
              id="client-id"
              placeholder="xxxxx.apps.googleusercontent.com"
              value={config.clientId}
              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              From Google Cloud Console → APIs & Services → Credentials
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Google Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="GOCSPX-xxxxx"
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              From Google Cloud Console → APIs & Services → Credentials
            </p>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Google OAuth Configuration
        </Button>

        <div className="pt-4 border-t space-y-3">
          <h4 className="font-semibold text-sm">Quick Setup Guide</h4>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Go to Google Cloud Console and create a new project (or use existing)</li>
            <li>Enable Google+ API in APIs & Services</li>
            <li>Create OAuth 2.0 credentials (OAuth client ID)</li>
            <li>Add your redirect URI (shown above) to "Authorized redirect URIs"</li>
            <li>Copy Client ID and Client Secret and paste them here</li>
            <li>Go to Supabase → Authentication → Providers → Google</li>
            <li>Enable Google provider and paste your Client ID and Secret there too</li>
            <li>Add the redirect URI to Supabase's "Redirect URLs" list</li>
          </ol>
        </div>

        <div className="pt-4 border-t space-y-3">
          <h4 className="font-semibold text-sm">Helpful Links</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
              className="gap-2"
            >
              <LinkIcon size={16} />
              Google Cloud Console
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/providers', '_blank')}
              className="gap-2"
            >
              <LinkIcon size={16} />
              Supabase Auth Providers
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
