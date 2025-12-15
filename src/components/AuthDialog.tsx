import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoogleLogo, ShieldCheck, Warning } from '@phosphor-icons/react'
import { api } from '@/lib/api'
import { User } from '@/lib/types'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthenticated: (user: User) => void
  requiresAgeVerification?: boolean
}

export function AuthDialog({ 
  open, 
  onOpenChange, 
  onAuthenticated,
  requiresAgeVerification 
}: AuthDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [needsAgeVerification, setNeedsAgeVerification] = useState(false)
  const [tempUser, setTempUser] = useState<User | null>(null)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const user = await api.auth.loginWithGoogle()
      
      if (requiresAgeVerification) {
        setTempUser(user)
        setNeedsAgeVerification(true)
      } else {
        onAuthenticated(user)
        onOpenChange(false)
        toast.success('Welcome! You\'re now logged in.')
      }
    } catch (error) {
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAgeVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempUser) return

    setIsLoading(true)
    try {
      const verified = await api.auth.verifyAge(tempUser.id, {})
      
      if (verified) {
        const verifiedUser = { ...tempUser, ageVerified: true }
        onAuthenticated(verifiedUser)
        onOpenChange(false)
        toast.success('Age verified! You can now proceed.')
      } else {
        toast.error('Age verification failed. You must be 18+ for NSFW content.')
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!needsAgeVerification ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Sign in to continue</DialogTitle>
              <DialogDescription>
                {requiresAgeVerification 
                  ? 'This design contains NSFW content. You must be 18+ to proceed.'
                  : 'Create an account or sign in to publish your design or place an order.'
                }
              </DialogDescription>
            </DialogHeader>

            {requiresAgeVerification && (
              <Alert className="border-accent bg-accent/10">
                <Warning size={20} className="text-accent" />
                <AlertDescription className="text-sm">
                  Age verification is required for NSFW content. You'll need to verify you're 18 or older.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 pt-4">
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                <GoogleLogo size={20} weight="bold" className="mr-2" />
                {isLoading ? 'Connecting...' : 'Continue with Google'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to our Terms of Service and Privacy Policy.
                <br />
                <strong className="text-accent">No refunds or cancellations after order completion.</strong>
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ShieldCheck size={28} className="text-primary" />
                Age Verification Required
              </DialogTitle>
              <DialogDescription>
                This design contains NSFW content. Please verify you're 18 or older to continue.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAgeVerification} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  required
                  max={new Date(Date.now() - 567648000000).toISOString().split('T')[0]}
                />
              </div>

              <Alert className="border-muted">
                <AlertDescription className="text-xs">
                  We use a secure third-party service to verify your age. Your information is encrypted and not stored on our servers.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Verifying...' : 'Verify Age & Continue'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
