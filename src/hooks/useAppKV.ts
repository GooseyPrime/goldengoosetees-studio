import { useCallback, useEffect, useState } from 'react'
import { kvService } from '@/lib/kv'

type SetValue<T> = (value: T | ((prevValue: T) => T)) => void

export function useAppKV<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    let isMounted = true

    const loadValue = async () => {
      const stored = await kvService.get<T>(key)
      if (stored !== null && stored !== undefined && isMounted) {
        setValue(stored)
      }
    }

    loadValue()

    return () => {
      isMounted = false
    }
  }, [key])

  const setStoredValue: SetValue<T> = useCallback(
    (nextValue) => {
      setValue((prevValue) => {
        const resolved = typeof nextValue === 'function'
          ? (nextValue as (prev: T) => T)(prevValue)
          : nextValue
        kvService.set<T>(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [value, setStoredValue]
}
