import { createHmac, timingSafeEqual } from 'crypto'

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

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(input: string): string {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function tokenSecret(): string {
  return (
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'euangelion-dev-consent-token-secret'
  )
}

function fingerprintSession(sessionToken: string): string {
  return createHmac('sha256', tokenSecret())
    .update(`session:${sessionToken}`)
    .digest('hex')
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', tokenSecret())
    .update(encodedPayload)
    .digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aBuf = Buffer.from(a, 'hex')
  const bBuf = Buffer.from(b, 'hex')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
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
  allowSessionMismatch?: boolean
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
    if (!sessionBound && !params.allowSessionMismatch) return null

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
