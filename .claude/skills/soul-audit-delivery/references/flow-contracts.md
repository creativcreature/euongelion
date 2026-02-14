# Flow Contracts

## Required staged flow

1. `POST /api/soul-audit/submit`
   - returns previews/options only
2. `POST /api/soul-audit/consent`
   - stores essential + optional analytics consent
3. `POST /api/soul-audit/select`
   - locks chosen path and initializes plan context

## UX rules

- User should see a finite option set with clear affordances.
- Plan rendering starts only after explicit option selection.
- Active devotional state replaces primary home audit CTA for returning users.
