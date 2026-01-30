import { useEffect, useState } from 'react'
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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (!open) {
      setNeedsAgeVerification(false)
      setTempUser(null)
      setBirthdate('')
      setAuthMode('signin')
      setEmail('')
      setPassword('')
      setFullName('')
    }
  }, [open])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      // Note: This will redirect to Google OAuth. The auth state change listener
      // in App.tsx will handle the callback when the user returns.
      // Close the dialog before redirect to avoid state issues
      onOpenChange(false)
      await api.auth.loginWithGoogle()

      // If we reach here (unlikely due to redirect), handle the user
      const user = await api.auth.getCurrentUser()
      if (user) {
        if (user.ageVerified || !requiresAgeVerification) {
          onAuthenticated(user)
          toast.success('Welcome back!')
        } else {
          setTempUser(user)
          setNeedsAgeVerification(true)
          onOpenChange(true) // Reopen for age verification
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error)
      onOpenChange(true) // Reopen dialog on error
      toast.error(error?.message || 'Login failed. Please try again.')
      setIsLoading(false)
    }
    // Note: setIsLoading(false) is intentionally not in finally block
    // because the page will redirect before this completes
  }

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email || !password || (authMode === 'signup' && !fullName)) {
      toast.error('Please fill in all required fields.')
      return
    }

    // Basic validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }

    setIsLoading(true)
    try {
      const user = authMode === 'signup'
        ? await api.auth.signUpWithEmail(email, password, fullName)
        : await api.auth.signInWithEmail(email, password)

      if (user.ageVerified || !requiresAgeVerification) {
        onAuthenticated(user)
        onOpenChange(false)
        toast.success(`Welcome ${authMode === 'signup' ? 'to your new account' : 'back'}!`)
      } else {
        setTempUser(user)
        setNeedsAgeVerification(true)
      }
    } catch (error: any) {
      console.error('Email auth error:', error)
      toast.error(error?.message || 'Authentication failed. Please try again.')
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
        ageVerified
      }
      
      if (requiresAgeVerification && !ageVerified) {
        toast.error('You must be 18+ to access NSFW content.')
        setIsLoading(false)
        return
      }

      // Update user profile with age verification and birthdate
      await api.auth.updateUserProfile(verifiedUser.id, {
        ageVerified,
        birthdate, // Store the birthdate in the database
        name: verifiedUser.name
      })
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
              <DialogTitle className="text-2xl">Sign in or create an account</DialogTitle>
              <DialogDescription>
                Sign in to publish your design, place an order, or manage your account. We'll collect your birthdate for age verification.
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

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs uppercase text-muted-foreground">Or use email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={authMode === 'signup'}
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading
                    ? authMode === 'signup' ? 'Creating account...' : 'Signing in...'
                    : authMode === 'signup' ? 'Create Account' : 'Sign In'}
                </Button>
              </form>

              <div className="text-center text-xs text-muted-foreground">
                {authMode === 'signup' ? (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAuthMode('signin')}
                  >
                    Already have an account? Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAuthMode('signup')}
                  >
                    New here? Create an account
                  </button>
                )}
              </div>

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
