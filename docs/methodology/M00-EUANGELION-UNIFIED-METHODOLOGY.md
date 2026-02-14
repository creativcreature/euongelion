# Euangelion Unified Methodology

## Purpose

Define one logical, non-contradictory method for IA, navigation, conversion, self-service, cross-device behavior, and release preparation.

## Pillars

### 1. IA-first product design

1. Start from user goals and content inventory.
2. Validate labels and grouping before UI polish.
3. Keep click depth shallow for core journeys.

### 2. Navigation as a system

1. Separate primary, secondary, utility, and footer navigation.
2. Keep one canonical navigation model across routes.
3. Document desktop and mobile interaction differences explicitly.

### 3. Conversion-focused architecture

1. One primary CTA per page state.
2. A single secondary CTA only when it reduces dead-ends.
3. Internal linking must move users forward in journey context.

### 4. Self-service reliability

1. Core user tasks must be findable from account/devotional home.
2. Async operations must expose status and recovery.
3. Error states must always include a next action.

### 5. Mobile and desktop parity contracts

1. Every feature has explicit desktop behavior.
2. Every feature has explicit mobile behavior.
3. Completion requires validation on both.

### 6. Operational quality and evidence

1. Definition of Ready before coding.
2. Definition of Done before closure.
3. Every change updates feature PRD outcome log.
4. CI and hooks enforce traceability and folder integrity.

## Scoring model

1. Baseline scores are capped at 6.
2. Engineering score and founder score tracked separately.
3. Only founder can assign 10/10.

## Canonical flow order

1. Layout
2. Chat
3. Onboarding
4. Remaining features by registry order and dependency constraints
5. App Store release gate
