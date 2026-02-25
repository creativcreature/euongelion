import {
  base64UrlDecode,
  base64UrlEncode,
  hmacFingerprintSession,
  hmacSign,
  resolveTokenSecret,
  safeEqualHex,
} from './token-utils'

const CONSENT_TOKEN_VERSION = 1
const CONSENT_TOKEN_MAX_AGE_MS = 30 * 60 * 1000

type ConsentTokenPayload = {
  version: number
  auditRunId: string
  essentialAccepted: boolean
  analyticsOptIn: boolean
  crisisAcknowledged: boolean
  sessionFingerprint: string
  issuedAt: string
}

type VerifiedConsentToken = Omit<ConsentTokenPayload, 'version'> & {
  sessionBound: boolean
}

function tokenSecret(): string {
  return resolveTokenSecret('consent-token')
}

function fingerprintSession(sessionToken: string): string {
  return hmacFingerprintSession(tokenSecret(), sessionToken)
}

function sign(encodedPayload: string): string {
  return hmacSign(tokenSecret(), encodedPayload)
}

export function createConsentToken(params: {
  auditRunId: string
  essentialAccepted: boolean
  analyticsOptIn: boolean
  crisisAcknowledged: boolean
  sessionToken: string
}): string {
  const payload: ConsentTokenPayload = {
    version: CONSENT_TOKEN_VERSION,
    auditRunId: params.auditRunId,
    essentialAccepted: params.essentialAccepted,
    analyticsOptIn: params.analyticsOptIn,
    crisisAcknowledged: params.crisisAcknowledged,
    sessionFingerprint: fingerprintSession(params.sessionToken),
    issuedAt: new Date().toISOString(),
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyConsentToken(params: {
  token: string | null | undefined
  expectedRunId: string
  sessionToken: string
}): VerifiedConsentToken | null {
  const token = params.token?.trim()
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = sign(encodedPayload)
  if (!safeEqualHex(signature, expectedSignature)) return null

  try {
    const decoded = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as ConsentTokenPayload
    if (decoded.version !== CONSENT_TOKEN_VERSION) return null
    if (decoded.auditRunId !== params.expectedRunId) return null

    const fingerprint = fingerprintSession(params.sessionToken)
    const sessionBound = decoded.sessionFingerprint === fingerprint
    if (!sessionBound) return null

    const issuedAt = new Date(decoded.issuedAt).getTime()
    if (!Number.isFinite(issuedAt)) return null
    if (Date.now() - issuedAt > CONSENT_TOKEN_MAX_AGE_MS) return null

    return {
      auditRunId: decoded.auditRunId,
      essentialAccepted: decoded.essentialAccepted,
      analyticsOptIn: decoded.analyticsOptIn,
      crisisAcknowledged: decoded.crisisAcknowledged,
      sessionFingerprint: decoded.sessionFingerprint,
      issuedAt: decoded.issuedAt,
      sessionBound,
    }
  } catch {
    return null
  }
}
