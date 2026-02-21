import type { BrainProviderId } from './types'

type CostProfile = {
  inputPerMillionUsd: number
  outputPerMillionUsd: number
}

const COSTS: Record<Exclude<BrainProviderId, 'auto'>, CostProfile> = {
  // Conservative defaults aligned with low-cost routing goals.
  openai: {
    inputPerMillionUsd: 0.05,
    outputPerMillionUsd: 0.4,
  },
  google: {
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.3,
  },
  minimax: {
    inputPerMillionUsd: 0.3,
    outputPerMillionUsd: 1.2,
  },
  nvidia_kimi: {
    inputPerMillionUsd: 0.2,
    outputPerMillionUsd: 0.8,
  },
}

export function estimateCostUsd(params: {
  provider: Exclude<BrainProviderId, 'auto'>
  inputTokens: number
  outputTokens: number
}): number {
  const profile = COSTS[params.provider]
  const inputCost =
    (Math.max(0, params.inputTokens) / 1_000_000) * profile.inputPerMillionUsd
  const outputCost =
    (Math.max(0, params.outputTokens) / 1_000_000) * profile.outputPerMillionUsd
  return Number((inputCost + outputCost).toFixed(8))
}

export function estimateInputTokens(text: string): number {
  // Approximation for guardrail and routing.
  return Math.max(1, Math.ceil(text.length / 4))
}

export function estimateOutputTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

export function providerBaseCostRank(
  provider: Exclude<BrainProviderId, 'auto'>,
): number {
  const profile = COSTS[provider]
  return profile.inputPerMillionUsd + profile.outputPerMillionUsd
}
