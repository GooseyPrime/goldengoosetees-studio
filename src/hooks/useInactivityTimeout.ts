import { useEffect, useCallback, useRef } from 'react'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

interface UseInactivityTimeoutOptions {
  onTimeout: () => void
  timeoutMs?: number
  enabled?: boolean
}

/**
 * Hook to detect user inactivity and trigger a callback after specified timeout.
 * Generic utility (e.g. for optional warning banners). Not used for session/logout.
 *
 * Events tracked: mouse move, mouse down, key down, touch start, scroll
 */
export function useInactivityTimeout({
  onTimeout,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  enabled = true
}: UseInactivityTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onTimeout()
      }, timeoutMs)
    }
  }, [onTimeout, timeoutMs, enabled])

  const handleActivity = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    resetTimeout()
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleActivity, resetTimeout, enabled])

  const getTimeRemaining = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current
    return Math.max(0, timeoutMs - elapsed)
  }, [timeoutMs])

  const getLastActivity = useCallback(() => {
    return lastActivityRef.current
  }, [])

  return {
    resetTimeout,
    getTimeRemaining,
    getLastActivity
  }
}
