import {
  CRISIS_ACK_PROMPT,
  CRISIS_KEYWORDS,
  CRISIS_RESOURCES,
} from './constants'

export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function crisisRequirement(crisisDetected: boolean) {
  return {
    required: crisisDetected,
    acknowledged: false,
    resources: CRISIS_RESOURCES,
    prompt: CRISIS_ACK_PROMPT,
  }
}
