# CMS Planning Kickoff (Post Brain v2)

## Objective

Create a production CMS plan that supports Euangelion's closed-RAG index, devotional module curation, editorial QA, and publish-safe traceability.

## Proposed CMS Scope

1. Canonical content model

- Series
- Day
- Module blocks (scripture, teaching, reflection, prayer, endnotes)
- Commentary/reference entries
- Citation/source entities

2. Editorial workflow

- Draft -> Review -> Approved -> Published
- Role gates (author, editor, approver)
- Change log per publish event

3. Versioning + rollback

- Immutable revision snapshots for each publish
- One-click rollback to prior approved revision
- Schema validation before publish

4. Publish-to-index integration

- Publish webhook triggers index rebuild job
- Feature namespace tagging (`chat`, `audit`)
- Build report: document count, failures, warnings

5. Traceability + governance

- Required source metadata on all commentary blocks
- Citation completeness checks before publish
- Audit trail export for compliance/review

6. Compatibility contracts

- Devotional depth preference aware content segmentation
- Stable IDs to restore chat thread + devotional context
- Backward compatibility for existing JSON consumers

## Implementation Tracks

1. CMS platform decision (self-hosted vs managed headless)
2. Content schema + migration map from current JSON corpus
3. Editorial UI wireframes and approval actions
4. Publish pipeline + index trigger integration
5. Contract tests for content integrity and traceability

## Exit Criteria

1. Schema frozen with migration plan approved.
2. Editorial workflow demo passes author/editor/approver scenarios.
3. Publish event updates canonical index without manual intervention.
4. Rollback tested against prior revision.
