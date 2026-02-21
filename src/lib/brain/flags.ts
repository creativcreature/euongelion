function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const brainFlags = {
  brainRouterEnabled: toBool(process.env.BRAIN_ROUTER_ENABLED, true),
  brainSwitchUiEnabled: toBool(process.env.BRAIN_SWITCH_UI_ENABLED, true),
  openWebModeEnabled: toBool(process.env.OPEN_WEB_MODE_ENABLED, true),
  chatStudySidebarEnabled: toBool(
    process.env.CHAT_STUDY_SIDEBAR_V2_ENABLED,
    true,
  ),
  qualityFloor: toNumber(process.env.BRAIN_QUALITY_FLOOR, 0.65),
  freeChatMonthlyCap: Math.max(
    1,
    Math.round(toNumber(process.env.FREE_CHAT_MONTHLY_CAP, 20)),
  ),
  subscriptionChatMonthlyCredit: Math.max(
    1,
    Math.round(toNumber(process.env.SUBSCRIPTION_CHAT_MONTHLY_CREDIT, 1000)),
  ),
  platformMonthlyBudgetUsd: Math.max(
    1,
    toNumber(process.env.PLATFORM_AI_BUDGET_MONTHLY_USD, 100),
  ),
  nearLimitThreshold: toNumber(process.env.CHAT_NEAR_LIMIT_THRESHOLD, 0.8),
}
