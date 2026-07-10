# M04 - Navigation Design Method

## Focus

Consistent, predictable nav structures with accessible behavior.

## Euangelion adaptation

1. Canonical nav includes Home, My Devotional, Soul Audit, Series, Wake-Up, Support.
2. Sticky desktop and mobile nav behavior must be deterministic.
3. Focus, active, hover, and keyboard states are required acceptance criteria.

## SA-024 addendum (2026-07-10) — platform-adaptive canonical nav

The single canonical nav list above predates SA-024. Canonical nav is now
platform-split (same destinations, two intentional presentations):

1. **Desktop masthead (horizontal):** HOME · TODAY · SOUL AUDIT · SERIES ·
   DAILY BREAD · LIBRARY · HOW WE WRITE, utilities (theme, resume badge,
   account) right-aligned.
2. **Mobile bottom tab bar (destinations):** TODAY · SERIES · SOUL AUDIT ·
   LIBRARY · YOU. Mobile top bar carries identity + utilities only (ticker,
   theme toggle, menu); the hamburger holds only non-tab overflow (How We
   Write, Help, auth). Tab bar and top bar never duplicate a destination.
3. Deterministic sticky behavior, focus/active/hover/keyboard states, and
   ≥44px touch targets remain required acceptance criteria on both.

Support/Wake-Up from the original list are reachable via footer and SERIES
respectively (unchanged since Phase 1.4).
