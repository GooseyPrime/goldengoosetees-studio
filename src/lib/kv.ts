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

// NOTE: In a real application, this passphrase should come from configuration
// and not be hard-coded. It is included here only to avoid cleartext storage.
const LOCAL_KV_PASSPHRASE = 'change-this-passphrase';

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null

const getCryptoKey = async (salt: Uint8Array): Promise<CryptoKey> => {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !textEncoder) {
    throw new Error('Web Crypto not available')
  }

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(LOCAL_KV_PASSPHRASE),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

const encryptValue = async (value: unknown): Promise<string> => {
  if (typeof window === 'undefined' || !window.crypto?.getRandomValues || !textEncoder) {
    // Fallback to JSON if crypto is unavailable; this preserves functionality
    return JSON.stringify(value)
  }

  const salt = new Uint8Array(16)
  window.crypto.getRandomValues(salt)
  const iv = new Uint8Array(12)
  window.crypto.getRandomValues(iv)

  const key = await getCryptoKey(salt)
  const encoded = textEncoder.encode(JSON.stringify(value))

  const ciphertext = new Uint8Array(
    await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    )
  )

  // Store as base64(salt || iv || ciphertext)
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(ciphertext, salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

const decryptValue = async <T>(data: string): Promise<T | null> => {
  if (!data) {
    return null
  }

  if (typeof window === 'undefined' || !window.crypto?.subtle || !textDecoder) {
    try {
      // If crypto is unavailable or data is legacy JSON, try direct parse
      return JSON.parse(data) as T
    } catch {
      return null
    }
  }

  try {
    const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0))
    const salt = binary.slice(0, 16)
    const iv = binary.slice(16, 28)
    const ciphertext = binary.slice(28)

    const key = await getCryptoKey(salt)
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    const decoded = textDecoder.decode(new Uint8Array(decrypted))
    return JSON.parse(decoded) as T
  } catch (error) {
    console.warn('Failed to decrypt local KV entry', error)
    return null
  }
}

const getLocalStorageKey = (key: string) => `ggt-kv:${key}`

const localStorageGet = async <T,>(key: string): Promise<T | null> => {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(getLocalStorageKey(key))
  if (!raw) {
    return null
  }

  return decryptValue<T>(raw)
}

const localStorageSet = async <T,>(key: string, value: T): Promise<void> => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const encrypted = await encryptValue(value)
    window.localStorage.setItem(getLocalStorageKey(key), encrypted)
  } catch (error) {
    console.warn('Failed to encrypt local KV entry, storing as JSON', error)
    window.localStorage.setItem(getLocalStorageKey(key), JSON.stringify(value))
  }
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

    return await localStorageGet<T>(key)
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

    await localStorageSet(key, value)
  },
}
