# Architecture

The app is built in layers. Each layer depends only on the layers below it.

```
screens (Next.js, later)        what the user sees and clicks
   │
application services (later)    use cases: "show team capacity for S001"
   │
domain                          pure rules and calculations, no database, no screens
   ▲
infrastructure                  database: loads rows and turns them into domain shapes
```

The domain never imports from infrastructure. Infrastructure imports domain types and fills them.

## Rules

1. **The domain is pure.** Code in `src/domain` takes plain values in and returns plain values out.
   It never reads a database, the clock, or the network. That makes it fast and easy to test.
2. **Tests first.** Every behaviour starts as a failing test that names a requirement (FR-xx / BR-xx
   from `docs/requirements.md`). Then we write the smallest code that makes it pass.
3. **One idea per file.** Small files with clear names beat big files.
4. **No personal data in tests.** Test cases describe situations ("part-time, 30 of 40 hours"),
   not real employees.
