/**
 * Gemini Image Generation Utilities
 * Extracted from src/lib/ai-agents.ts for server-side use
 */

/**
 * Pick the closest Gemini-supported aspect ratio
 */
export function pickClosestGeminiAspectRatio(
  inputWidth?: number,
  inputHeight?: number
): string | undefined {
  if (!inputWidth || !inputHeight || inputWidth <= 0 || inputHeight <= 0) {
    return undefined
  }

  const ratio = inputWidth / inputHeight
  const candidates: Array<{ ar: string; r: number }> = [
    { ar: '1:1', r: 1 },
    { ar: '2:3', r: 2 / 3 },
    { ar: '3:2', r: 3 / 2 },
    { ar: '3:4', r: 3 / 4 },
    { ar: '4:3', r: 4 / 3 },
    { ar: '4:5', r: 4 / 5 },
    { ar: '5:4', r: 5 / 4 },
    { ar: '9:16', r: 9 / 16 },
    { ar: '16:9', r: 16 / 9 },
    { ar: '21:9', r: 21 / 9 },
  ]

  let best = candidates[0]!
  let bestDiff = Infinity

  for (const c of candidates) {
    const diff = Math.abs(c.r - ratio)
    if (diff < bestDiff) {
      best = c
      bestDiff = diff
    }
  }

  return best.ar
}

/**
 * Build a comprehensive T-shirt graphic prompt for Gemini
 */
export function buildGeminiTeeGraphicPrompt(
  prompt: string,
  context?: { widthInches?: number; heightInches?: number }
): string {
  const ar = pickClosestGeminiAspectRatio(context?.widthInches, context?.heightInches)

  return `Create a print-ready T-shirt graphic based on this concept:
"${prompt}"

This is NOT a photo of a shirt and NOT a mockup. Generate ONLY the standalone artwork for printing.

Build the scene step-by-step if the concept has multiple elements:
1) Establish the overall style and mood that fits a T-shirt graphic.
2) Place the primary subject(s) with clear silhouettes and strong contrast.
3) Add supporting details that reinforce the theme without clutter.
4) Finish with crisp edges and print-friendly color separation.

Visual requirements:
- Hyper-specific, vivid, and complete illustration (not just text)
- Professional, print-ready quality with clean shapes and sharp detail
- White or transparent background suitable for printing
- Positive phrasing (describe what should exist, not what shouldn't)
- If the concept includes words/slogans, render them legibly as part of the design composition

Composition:
- Centered, balanced layout suitable for a front/back print area
- High contrast and readability at a distance
${ar ? `- Keep the composition compatible with a ${ar} aspect ratio` : ''}`.trim()
}

