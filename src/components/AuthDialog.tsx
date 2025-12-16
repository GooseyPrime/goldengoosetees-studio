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
  const [birthdate, setBirthdate] = useState('')

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const user = await api.auth.loginWithGoogle()
      
      setTempUser(user)
      setNeedsAgeVerification(true)
    } catch (error) {
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAge = (birthdate: string): number => {
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const handleAgeVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempUser || !birthdate) return

    setIsLoading(true)
    try {
      const age = calculateAge(birthdate)
      
      if (age < 13) {
        toast.error('You must be at least 13 years old to use this service.')
        setIsLoading(false)
        return
      }

      const ageVerified = age >= 18
      
      const verifiedUser = { 
        ...tempUser, 
        ageVerified,
        birthdate 
      }
      
      if (requiresAgeVerification && !ageVerified) {
        toast.error('You must be 18+ to access NSFW content.')
        setIsLoading(false)
        return
      }

      onAuthenticated(verifiedUser)
      onOpenChange(false)
      toast.success(ageVerified ? 'Age verified! You\'re all set.' : 'Welcome! Account created.')
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
                Create an account or sign in to publish your design or place an order. We'll collect your birthdate for age verification.
              </DialogDescription>
            </DialogHeader>

            {requiresAgeVerification && (
              <Alert className="border-accent bg-accent/10">
                <Warning size={20} className="text-accent" />
                <AlertDescription className="text-sm">
                  This design contains NSFW content. You must be 18+ to proceed.
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
                Complete Your Profile
              </DialogTitle>
              <DialogDescription>
                {requiresAgeVerification 
                  ? 'Please confirm your birthdate. You must be 18+ to access NSFW content.'
                  : 'Please confirm your birthdate to complete account setup.'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAgeVerification} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  You must be at least 13 years old to use this service.
                </p>
              </div>

              <Alert className="border-muted">
                <AlertDescription className="text-xs">
                  Your birthdate is used for age verification and is stored securely. It will not be shared publicly.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                disabled={isLoading || !birthdate}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Verifying...' : 'Confirm & Continue'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
