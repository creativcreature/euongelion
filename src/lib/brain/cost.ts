import type { BrainProviderId } from './types'

type CostProfile = {
  inputPerMillionUsd: number
  outputPerMillionUsd: number
}

/**
 * The engine that ACTUALLY served a call, which is not the same thing as the
 * provider slot it was routed through.
 *
 * The `openai` slot dispatches on key shape (`router.ts` → `executeProvider`):
 * an `sk-ant-` key runs `callAnthropic` (Claude), anything else runs
 * `callOpenAI`. Billing must follow the engine, not the slot — pricing Claude
 * traffic from the `openai` profile under-bills it by ~45x on a typical
 * message, which is what let the $100 platform budget guard sit in front of
 * roughly $4,500 of real spend.
 *
 * `soul-audit/cost-ledger.ts` already made this correction for the generation
 * path and flagged the router as still wrong ("UNDER-bills Anthropic by ~60x").
 * This closes that gap for chat, reusing the same env-overridable rates so the
 * two ledgers can never drift apart.
 */
export type BillingEngine = 'anthropic' | Exclude<BrainProviderId, 'auto'>

function toFloat(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
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

/**
 * Real per-MTok rates for the engine that served the call.
 *
 * Anthropic defaults match Claude Sonnet 4.x list pricing and share the same
 * env overrides as `soul-audit/cost-ledger.ts`, so changing the routed model
 * repoints both ledgers at once.
 */
function engineProfile(engine: BillingEngine): CostProfile {
  if (engine === 'anthropic') {
    return {
      inputPerMillionUsd: toFloat(process.env.SOUL_AUDIT_INPUT_USD_PER_MTOK, 3),
      outputPerMillionUsd: toFloat(
        process.env.SOUL_AUDIT_OUTPUT_USD_PER_MTOK,
        15,
      ),
    }
  }
  return COSTS[engine]
}

export function estimateCostUsd(params: {
  /**
   * The engine that actually ran. Callers that only know the routing slot may
   * pass it here, but `executeProvider` resolves the real engine first — a slot
   * is not a price.
   */
  engine: BillingEngine
  inputTokens: number
  outputTokens: number
}): number {
  const profile = engineProfile(params.engine)
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
