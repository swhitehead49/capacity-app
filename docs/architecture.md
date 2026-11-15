# Architecture

The app is built in layers. Each layer depends only on the layers below it.

```
screens (Next.js, later)        what the user sees and clicks
   │
application (src/application)    use cases: "save a team default", checks rules, writes audit log
   │
domain                          pure rules and calculations, no database, no screens
   ▲
infrastructure                  database: loads rows and turns them into domain shapes
```

The domain never imports from infrastructure or application.
Application code calls domain rules first, then saves through infrastructure inside one transaction.
 Infrastructure imports domain types and fills them.

## Rules

1. **The domain is pure.** Code in `src/domain` takes plain values in and returns plain values out.
   It never reads a database, the clock, or the network. That makes it fast and easy to test.
2. **Tests first.** Every behaviour starts as a failing test that names a requirement (FR-xx / BR-xx
   from `docs/requirements.md`). Then we write the smallest code that makes it pass.
3. **One idea per file.** Small files with clear names beat big files.
4. **No personal data in tests.** Test cases describe situations ("part-time, 30 of 40 hours"),
   not real employees.

## Projects (decided 15 Nov 2026)

The top of the hierarchy is the **project**: project → value streams → teams. Projects are fully separate,
so each project has its **own complete set of tables** rather than a "project" column on every table:

- Local folders (PGlite): Default uses `DATA_DIR`; another project uses `DATA_DIR-projects/<id>`.
- Online Postgres (`DATABASE_URL`): Default uses the original tables; another project uses its own schema `project_<id>`.
- The list of projects lives in the Default database, in a separate `app` schema (`app.projects`).
- The **sprint calendar is shared** by all projects (sean, 15 Nov 2026): only the Default database's `timeline_settings`
  is used, and `ensurePeriods(projectDb, today, defaultDb)` gives every project the same sprints and quarters.
  Allocation (defaults and overrides) stays per team and per period, inside each project.
- **Country holiday calendars are shared** too (sean, 15 Nov 2026): `public_holidays` and `holiday_calendars` are
  read and written only in the Default database (`sharedDb()` in `app/lib/project.ts`), on /reference/public-holidays. People and
  their own leave (`absences`) stay per project.
- **Reference data is shared** (sean, 15 Nov 2026): the Default database's `value_streams` and `locations` are the
  system's lists, edited on `/reference` (`src/application/referenceData.ts`). Teams keep the value stream name as text,
  checked against the list. Each project keeps a copy of the locations (so `people` and `teams` can point at them):
  `syncLocations(projectDb, sharedDb)` refreshes it, via `projectReference()` whenever a form lists locations.

`src/infrastructure/db/appDb.ts` is the only place that knows this: `getProjectDb(id)` returns a normal `Db`,
so domain and application code don't change. Migrations must not name the `public` schema (a test checks this),
because the same migrations build every project's tables.

Every screen lives under `/p/<project>/…` (`app/p/[projectId]`). Pages and server actions get their database
through `projectDb(projectId)` in `app/lib/project.ts`, which answers "not found" for an unknown project.
Forms send the project as a hidden `projectId` field (`ActionForm` adds it from the web address).

`/` opens the project used last (cookie `capacity-project`, set by `middleware.ts` on any `/p/<project>` page),
or the picker at `/projects` when there is none or it is archived (`startAddress` in `projectRules.ts`).
Projects are created (name only; the ID comes from `projectIdFromName`), renamed and archived/restored through
`src/application/projects.ts`; a new project's tables are made the first time it is opened. Nothing is deleted.
