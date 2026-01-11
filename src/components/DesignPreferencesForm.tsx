import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkle, Info, UploadSimple, Image, MagicWand, ArrowRight } from '@phosphor-icons/react'
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
  onUpload?: () => void
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

export function DesignPreferencesForm({ onSubmit, onSkip, onUpload, isLoading }: DesignPreferencesFormProps) {
  const [preferences, setPreferences] = useState<DesignPreferences>({
    concept: '',
    style: '',
    colors: '',
    text: '',
    mood: '',
  })
  const [designMode, setDesignMode] = useState<'ai' | 'upload' | null>(null)

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

  // If no mode selected, show the choice screen
  if (!designMode) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">How would you like to create your design?</h2>
          <p className="text-muted-foreground">Choose your preferred method to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* AI Design Option */}
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => setDesignMode('ai')}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <MagicWand size={24} weight="duotone" className="text-primary" />
              </div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Design Generator
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </CardTitle>
              <CardDescription>
                Describe your idea and our AI will create a custom design for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Sparkle size={14} className="text-primary" />
                  Generate unique artwork from text
                </li>
                <li className="flex items-center gap-2">
                  <Sparkle size={14} className="text-primary" />
                  Refine with chat-based editing
                </li>
                <li className="flex items-center gap-2">
                  <Sparkle size={14} className="text-primary" />
                  Multiple style options
                </li>
              </ul>
              <Button variant="outline" className="w-full mt-4 gap-2">
                Create with AI <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>

          {/* Upload Option */}
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            onClick={() => {
              if (onUpload) {
                onUpload()
              } else {
                setDesignMode('upload')
              }
            }}
          >
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <UploadSimple size={24} weight="duotone" className="text-accent" />
              </div>
              <CardTitle className="text-lg">Upload Your Own</CardTitle>
              <CardDescription>
                Already have a design? Upload your image file directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Image size={14} className="text-accent" />
                  PNG, JPG, or SVG files
                </li>
                <li className="flex items-center gap-2">
                  <Image size={14} className="text-accent" />
                  High resolution for best print quality
                </li>
                <li className="flex items-center gap-2">
                  <Image size={14} className="text-accent" />
                  Use your own artwork or photos
                </li>
              </ul>
              <Button variant="outline" className="w-full mt-4 gap-2">
                Upload Image <ArrowRight size={16} />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center pt-4">
          <Button variant="link" onClick={onSkip} className="text-muted-foreground">
            Skip to chat with design assistant
          </Button>
        </div>
      </div>
    )
  }

  // Show upload message if upload mode selected
  if (designMode === 'upload') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <UploadSimple size={32} weight="duotone" className="text-accent" />
          </div>
          <CardTitle className="text-xl">Upload Your Design</CardTitle>
          <CardDescription>
            Click the button below to select your image file. Supported formats: PNG, JPG, SVG
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 border-2 border-dashed rounded-lg text-center hover:border-primary/50 transition-colors">
            <p className="text-sm text-muted-foreground mb-4">
              For best print quality, use images at least 2400 × 3000 pixels (300 DPI)
            </p>
            <Button onClick={() => onUpload?.()} className="gap-2">
              <UploadSimple size={18} />
              Choose File
            </Button>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setDesignMode(null)}>
              ← Back
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Skip to Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

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
