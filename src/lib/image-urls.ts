/**
 * Build sharper src/srcSet for known CDNs (e.g. Unsplash) to improve LCP on hero and cards.
 */
export function responsiveImageSources(url: string | undefined): {
  src: string
  srcSet?: string
} {
  if (!url?.trim()) return { src: url || '' }
  try {
    const u = new URL(url)
    if (u.hostname === 'images.unsplash.com' || u.hostname.endsWith('.unsplash.com')) {
      const w800 = new URL(url)
      w800.searchParams.set('w', '800')
      w800.searchParams.set('q', '85')
      w800.searchParams.set('auto', 'format')
      const w1600 = new URL(url)
      w1600.searchParams.set('w', '1600')
      w1600.searchParams.set('q', '85')
      w1600.searchParams.set('auto', 'format')
      return {
        src: w1600.toString(),
        srcSet: `${w800.toString()} 800w, ${w1600.toString()} 1600w`,
      }
    }
  } catch {
    /* not a valid URL */
  }
  return { src: url }
}
