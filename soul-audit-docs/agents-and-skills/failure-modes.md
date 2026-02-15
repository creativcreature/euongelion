# Failure Modes

## Common breakpoints

1. `Audit run not found` due to missing token persistence.
2. No options returned due to source lookup failures.
3. Selection route mismatch (token exists but route missing).
4. Reset clears local state but not server-side current plan.

## Recovery expectations

- Return explicit, actionable error messages.
- Preserve enough state for safe retry.
- Avoid dead-end screens; always provide next-step CTA.
