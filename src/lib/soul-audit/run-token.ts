import { createHmac, timingSafeEqual } from 'crypto'
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
  const secret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'SOUL_AUDIT_RUN_TOKEN_SECRET is required and must be at least 32 characters.',
    )
  }
  return secret
}

function fingerprintSession(sessionToken: string): string {
  return createHmac('sha256', tokenSecret())
    .update(`session:${sessionToken}`)
    .digest('hex')
}

function signEncodedPayload(encodedPayload: string): string {
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
  const signature = signEncodedPayload(encodedPayload)
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

  const expectedSignature = signEncodedPayload(encodedPayload)
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
