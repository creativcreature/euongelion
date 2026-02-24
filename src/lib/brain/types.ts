export type BrainProviderId =
  | 'auto'
  | 'openai'
  | 'google'
  | 'minimax'
  | 'nvidia_kimi'

export type GenerationTaskType =
  | 'chat_response'
  | 'chat_response_open_web'
  | 'audit_option_polish'
  | 'audit_intent_parse'
  | 'audit_outline_generate'
  | 'devotional_day_generate'
  | 'devotional_refinement'

export type ChatRetrievalMode = 'closed' | 'open_web'

export type QuotaState =
  | 'active'
  | 'near_limit'
  | 'halted_platform'
  | 'byo_required'

export type SourceCard = {
  id: string
  title: string
  publisher?: string
  url?: string
  date?: string
  snippet: string
  sourceType:
    | 'local_reference'
    | 'devotional_context'
    | 'scripture'
    | 'open_web'
}

export type ProviderAvailability = {
  provider: Exclude<BrainProviderId, 'auto'>
  available: boolean
  reason?: string
  using: 'platform_key' | 'byo_key' | 'unavailable'
}

export type ProviderExecutionResult = {
  provider: Exclude<BrainProviderId, 'auto'>
  output: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  qualityScore: number
  using: 'platform_key' | 'byo_key'
}

export type BrainRouteContext = {
  task: GenerationTaskType
  mode: BrainProviderId
  userKeys?: Partial<Record<Exclude<BrainProviderId, 'auto'>, string>>
  qualityFloor?: number
  maxOutputTokens?: number
  platformKeysEnabled?: boolean
}

export interface OpenWebAcknowledgementState {
  acknowledged: boolean
  acknowledgedAt?: string
}

export type UsageLedgerEntry = {
  id: string
  timestamp: string
  principalId: string
  provider: Exclude<BrainProviderId, 'auto'>
  mode: ChatRetrievalMode
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  chargedToPlatform: boolean
}
