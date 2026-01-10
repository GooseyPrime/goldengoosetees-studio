type SparkKV = {
  get: <T>(key: string) => Promise<T | null>
  set: <T>(key: string, value: T) => Promise<void>
}

const getSparkKV = (): SparkKV | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const spark = (window as typeof window & { spark?: { kv?: SparkKV } }).spark
  if (!spark?.kv) {
    return null
  }

  return spark.kv
}

const getLocalStorageKey = (key: string) => `ggt-kv:${key}`

const localStorageGet = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(getLocalStorageKey(key))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('Failed to parse local KV entry', error)
    return null
  }
}

const localStorageSet = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getLocalStorageKey(key), JSON.stringify(value))
}

export const kvService = {
  async get<T>(key: string): Promise<T | null> {
    const sparkKV = getSparkKV()
    if (sparkKV) {
      try {
        return await sparkKV.get<T>(key)
      } catch (error) {
        console.warn('Spark KV unavailable, falling back to local storage.', error)
      }
    }

    return localStorageGet<T>(key)
  },
  async set<T>(key: string, value: T): Promise<void> {
    const sparkKV = getSparkKV()
    if (sparkKV) {
      try {
        await sparkKV.set(key, value)
        return
      } catch (error) {
        console.warn('Spark KV unavailable, falling back to local storage.', error)
      }
    }

    localStorageSet(key, value)
  },
}
