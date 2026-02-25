import {
  base64UrlDecode,
  base64UrlEncode,
  hmacFingerprintSession,
  hmacSign,
  resolveTokenSecret,
  safeEqualHex,
} from './token-utils'
import type { AuditOptionPreview } from '@/types/soul-audit'

const RUN_TOKEN_VERSION = 1
const RUN_TOKEN_MAX_AGE_MS = 6 * 60 * 60 * 1000

type RunTokenPayload = {
  version: number
  auditRunId: string
  responseText: string
  crisisDetected: boolean
  options: AuditOptionPreview[]
  sessionFingerprint: string
  issuedAt: string
}

type VerifiedRunToken = Omit<RunTokenPayload, 'version'> & {
  sessionBound: boolean
}

function tokenSecret(): string {
  return resolveTokenSecret('run-token')
}

function fingerprintSession(sessionToken: string): string {
  return hmacFingerprintSession(tokenSecret(), sessionToken)
}

function sign(encodedPayload: string): string {
  return hmacSign(tokenSecret(), encodedPayload)
}

export function createRunToken(params: {
  auditRunId: string
  responseText: string
  crisisDetected: boolean
  options: AuditOptionPreview[]
  sessionToken: string
}): string {
  const payload: RunTokenPayload = {
    version: RUN_TOKEN_VERSION,
    auditRunId: params.auditRunId,
    responseText: params.responseText,
    crisisDetected: params.crisisDetected,
    options: params.options,
    sessionFingerprint: fingerprintSession(params.sessionToken),
    issuedAt: new Date().toISOString(),
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyRunToken(params: {
  token: string | null | undefined
  expectedRunId: string
  sessionToken: string
}): VerifiedRunToken | null {
  const token = params.token?.trim()
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = sign(encodedPayload)
  if (!safeEqualHex(signature, expectedSignature)) return null

  try {
    const decoded = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as RunTokenPayload
    if (decoded.version !== RUN_TOKEN_VERSION) return null
    if (decoded.auditRunId !== params.expectedRunId) return null

    const fingerprint = fingerprintSession(params.sessionToken)
    const sessionBound = decoded.sessionFingerprint === fingerprint
    if (!sessionBound) return null

    const issuedAt = new Date(decoded.issuedAt).getTime()
    if (!Number.isFinite(issuedAt)) return null
    if (Date.now() - issuedAt > RUN_TOKEN_MAX_AGE_MS) return null

    if (
      !Array.isArray(decoded.options) ||
      typeof decoded.responseText !== 'string' ||
      typeof decoded.crisisDetected !== 'boolean'
    ) {
      return null
    }

    return {
      auditRunId: decoded.auditRunId,
      responseText: decoded.responseText,
      crisisDetected: decoded.crisisDetected,
      options: decoded.options,
      sessionFingerprint: decoded.sessionFingerprint,
      issuedAt: decoded.issuedAt,
      sessionBound,
    }
  } catch {
    return null
  }
}
