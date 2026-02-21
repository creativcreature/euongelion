type RememberedProviderKeys = {
  openaiApiKey?: string
  anthropicApiKey?: string
  googleApiKey?: string
  minimaxApiKey?: string
  nvidiaKimiApiKey?: string
}

const DEVICE_SECRET_KEY = 'euangelion:byo:device-secret:v1'
const ENCRYPTED_KEYS_KEY = 'euangelion:byo:encrypted-keys:v1'

function canUseBrowserCrypto(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  )
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function decode(value: ArrayBuffer): string {
  return new TextDecoder().decode(value)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function getOrCreateDeviceSecret(): string | null {
  if (typeof window === 'undefined') return null
  const existing = window.localStorage.getItem(DEVICE_SECRET_KEY)
  if (existing) return existing

  const random = new Uint8Array(32)
  window.crypto.getRandomValues(random)
  const secret = toBase64(random)
  window.localStorage.setItem(DEVICE_SECRET_KEY, secret)
  return secret
}

async function deriveKey(deviceSecret: string): Promise<CryptoKey> {
  const hash = await window.crypto.subtle.digest(
    'SHA-256',
    encode(deviceSecret).buffer as ArrayBuffer,
  )
  return window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function saveRememberedProviderKeys(
  keys: RememberedProviderKeys,
): Promise<void> {
  if (!canUseBrowserCrypto()) return
  const secret = getOrCreateDeviceSecret()
  if (!secret) return
  const cryptoKey = await deriveKey(secret)
  const iv = new Uint8Array(12)
  window.crypto.getRandomValues(iv)
  const cipher = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    encode(JSON.stringify(keys)).buffer as ArrayBuffer,
  )
  const payload = `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`
  window.localStorage.setItem(ENCRYPTED_KEYS_KEY, payload)
}

export async function loadRememberedProviderKeys(): Promise<RememberedProviderKeys | null> {
  if (!canUseBrowserCrypto()) return null
  const payload = window.localStorage.getItem(ENCRYPTED_KEYS_KEY)
  if (!payload) return null
  const secret = getOrCreateDeviceSecret()
  if (!secret) return null

  const [ivPart, cipherPart] = payload.split('.')
  if (!ivPart || !cipherPart) return null

  try {
    const cryptoKey = await deriveKey(secret)
    const ivBytes = fromBase64(ivPart)
    const cipherBytes = fromBase64(cipherPart)
    const plain = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      cryptoKey,
      cipherBytes.buffer as ArrayBuffer,
    )
    const parsed = JSON.parse(decode(plain)) as RememberedProviderKeys
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function clearRememberedProviderKeys(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ENCRYPTED_KEYS_KEY)
}
