import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkle, Info } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface DesignPreferences {
  concept: string
  style: string
  colors: string
  text: string
  mood: string
}

interface DesignPreferencesFormProps {
  onSubmit: (preferences: DesignPreferences) => void
  onSkip: () => void
  isLoading?: boolean
}

const styleOptions = [
  { value: 'retro', label: 'Retro/Vintage', example: '70s disco, old poster' },
  { value: 'modern', label: 'Modern/Clean', example: 'minimalist, geometric' },
  { value: 'cartoon', label: 'Cartoon/Fun', example: 'playful, illustrated' },
  { value: 'grunge', label: 'Grunge/Edgy', example: 'distressed, rock style' },
  { value: 'artistic', label: 'Artistic/Abstract', example: 'painterly, expressive' },
  { value: 'realistic', label: 'Realistic/Photo', example: 'detailed, lifelike' },
]

const moodOptions = [
  { value: 'fun', label: 'Fun & Playful', emoji: '🎉' },
  { value: 'cool', label: 'Cool & Edgy', emoji: '😎' },
  { value: 'cute', label: 'Cute & Sweet', emoji: '🥰' },
  { value: 'bold', label: 'Bold & Powerful', emoji: '💪' },
  { value: 'chill', label: 'Chill & Relaxed', emoji: '😌' },
  { value: 'weird', label: 'Weird & Quirky', emoji: '🤪' },
]

export function DesignPreferencesForm({ onSubmit, onSkip, isLoading }: DesignPreferencesFormProps) {
  const [preferences, setPreferences] = useState<DesignPreferences>({
    concept: '',
    style: '',
    colors: '',
    text: '',
    mood: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (preferences.concept.trim()) {
      onSubmit(preferences)
    }
  }

  const updatePreference = (key: keyof DesignPreferences, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const isValid = preferences.concept.trim().length > 0

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkle size={24} weight="duotone" className="text-primary" />
          <CardTitle className="text-xl">Quick Design Brief</CardTitle>
        </div>
        <CardDescription>
          Tell us about your design idea. Fill in what you know - we'll handle the rest!
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Concept - Required */}
          <div className="space-y-2">
            <Label htmlFor="concept" className="flex items-center gap-2">
              What do you want on your shirt? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="concept"
              placeholder='e.g., "A cowboy riding a giant pickle" or "Mountain sunset with pine trees"'
              value={preferences.concept}
              onChange={(e) => updatePreference('concept', e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info size={12} />
              Describe the main image, scene, or subject matter
            </p>
          </div>

          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Design Style <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {styleOptions.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => updatePreference('style', preferences.style === style.value ? '' : style.value)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                    preferences.style === style.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="font-medium text-sm">{style.label}</div>
                  <div className="text-xs text-muted-foreground">{style.example}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="space-y-2">
            <Label>Mood/Vibe <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((mood) => (
                <Badge
                  key={mood.value}
                  variant={preferences.mood === mood.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer py-2 px-3 text-sm transition-all hover:bg-primary/10",
                    preferences.mood === mood.value && "bg-primary"
                  )}
                  onClick={() => updatePreference('mood', preferences.mood === mood.value ? '' : mood.value)}
                >
                  {mood.emoji} {mood.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label htmlFor="colors">
              Color Preferences <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="colors"
              placeholder='e.g., "Bright and colorful" or "Black and gold" or "Pastel pink tones"'
              value={preferences.colors}
              onChange={(e) => updatePreference('colors', e.target.value)}
            />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <Label htmlFor="text">
              Any Text to Include? <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="text"
              placeholder='e.g., "PINK PICKLE RODEO" or "Est. 2024" or leave blank for no text'
              value={preferences.text}
              onChange={(e) => updatePreference('text', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if you don't want any text on the design
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 h-12 text-base"
            >
              {isLoading ? (
                'Generating...'
              ) : (
                <>
                  <Sparkle size={20} weight="fill" className="mr-2" />
                  Generate My Design
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              className="h-12"
            >
              Skip to Chat
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can always refine your design after it's generated
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

// Helper function to convert preferences to a design prompt
export function preferencesToPrompt(prefs: DesignPreferences): string {
  const parts: string[] = []

  // Main concept is always included
  parts.push(prefs.concept)

  // Add style if specified
  if (prefs.style) {
    const styleDescriptions: Record<string, string> = {
      retro: 'in a retro/vintage style',
      modern: 'in a modern, clean style',
      cartoon: 'in a fun cartoon/illustrated style',
      grunge: 'in a grunge/edgy distressed style',
      artistic: 'in an artistic, painterly style',
      realistic: 'in a realistic, detailed style',
    }
    parts.push(styleDescriptions[prefs.style] || '')
  }

  // Add mood if specified
  if (prefs.mood) {
    const moodDescriptions: Record<string, string> = {
      fun: 'with a fun, playful vibe',
      cool: 'with a cool, edgy aesthetic',
      cute: 'with a cute, sweet feeling',
      bold: 'with bold, powerful energy',
      chill: 'with a relaxed, chill atmosphere',
      weird: 'with a quirky, weird twist',
    }
    parts.push(moodDescriptions[prefs.mood] || '')
  }

  // Add colors if specified
  if (prefs.colors) {
    parts.push(`using ${prefs.colors} colors`)
  }

  // Add text if specified
  if (prefs.text) {
    parts.push(`with the text "${prefs.text}"`)
  }

  return parts.filter(Boolean).join(', ')
}
