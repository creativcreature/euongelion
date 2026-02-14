# Methodology System

This folder contains Euangelion's architecture, IA, navigation, self-service, and release methodologies.

## Canonical docs

1. `M00-EUANGELION-UNIFIED-METHODOLOGY.md` - single source of methodology truth.
2. `M00-METHODOLOGY-TRACEABILITY-MATRIX.md` - maps methods to feature PRDs.
3. `M00-DUPLICATION-RESOLUTION-LOG.md` - records consolidation decisions.
4. `METHOD-SOURCE-INDEX.md` - source references and ingestion notes.

## Source-specific method docs

1. `M01-ENGENIUS-SITE-ARCHITECTURE.md`
2. `M02-SAAS-WEB-BEST-PRACTICES.md`
3. `M03-USERLYTICS-IA-RESEARCH.md`
4. `M04-NAVIGATION-DESIGN-BEST-PRACTICES.md`
5. `M05-BAYMARD-SELF-SERVICE-UX.md`
6. `M06-CONNECTIVE-IA-UX-STRATEGY.md`

## Enforcement

- Feature PRDs (`docs/feature-prds/F-*.md`) must include a `Methodology References` section.
- Verification is enforced by `npm run verify:methodology-traceability`.
