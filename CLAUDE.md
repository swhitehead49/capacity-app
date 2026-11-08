# Capacity App

Capacity planning for ~70 Dedalus engineering teams: real capacity per sprint/quarter and its
Run / Fix / Sustain / Change split.

- Requirements: `docs/requirements.md` (IDs FR-xx, BR-xx, UC-xx). This is the spec.
- Architecture: `docs/architecture.md`. Keep `src/domain` pure (no I/O).
- Work test-first: write or update a failing test that cites the requirement ID, then implement.
- Commands: `npm test` (run tests), `npm run test:watch`, `npm run typecheck`.
- The owner is new to coding: explain changes in plain language and keep steps small.
