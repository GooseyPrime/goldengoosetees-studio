import { useEffect, useCallback, useRef } from 'react'

// Environment variable for timeout duration (default 5 minutes)
const TIMEOUT_MINUTES = parseInt(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || '5', 10)
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000

interface UseInactivityTimeoutOptions {
  onTimeout: () => void
  timeoutMs?: number
  enabled?: boolean
}

/**
 * Hook to detect user inactivity and trigger a callback after specified timeout.
 * Used for kiosk mode to reset the session after 5 minutes of inactivity.
 *
 * Events tracked: mouse move, mouse down, key down, touch start, scroll
 *
 * @param options.onTimeout - Callback function when timeout occurs
 * @param options.timeoutMs - Timeout duration in milliseconds (default: 5 minutes)
 * @param options.enabled - Whether the timeout is enabled (default: true)
 */
export function useInactivityTimeout({
  onTimeout,
  timeoutMs = TIMEOUT_MS,
  enabled = true
}: UseInactivityTimeoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        console.log('Inactivity timeout triggered')
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

    // Events to track for activity
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Start initial timeout
    resetTimeout()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [handleActivity, resetTimeout, enabled])

  // Return time remaining for UI display if needed
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

/**
 * Hook to manage kiosk session state with inactivity timeout.
 * Resets cart, designs, and user session after timeout.
 */
export function useKioskSession(options: {
  onSessionReset: () => void
  enabled?: boolean
}) {
  const { onSessionReset, enabled = import.meta.env.VITE_KIOSK_MODE === 'true' } = options

  const handleTimeout = useCallback(() => {
    console.log('Kiosk session timeout - resetting state')

    // Clear local storage items related to the session
    const keysToPreserve = ['admin-settings', 'products-cache']
    const allKeys = Object.keys(localStorage)

    allKeys.forEach(key => {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key)
      }
    })

    // Clear session storage
    sessionStorage.clear()

    // Trigger the reset callback
    onSessionReset()
  }, [onSessionReset])

  return useInactivityTimeout({
    onTimeout: handleTimeout,
    enabled
  })
}
