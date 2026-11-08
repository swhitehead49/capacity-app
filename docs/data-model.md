# Data model

Tables live in `src/infrastructure/db/schema.ts`. Changes to them go through migrations in `drizzle/`
(run `npx drizzle-kit generate --name <what-changed>` after editing the schema).

| Table | Holds | Requirements |
| --- | --- | --- |
| teams | One row per team; the ID never changes or gets reused | FR-01, FR-18, BR-15 |
| team_name_history | Every name a team has had, from a date | BR-20 |
| team_successors | Which team(s) replaced a retired team | BR-23 |
| locations | Region code (e.g. DE-BY), country, full-time hours | FR-06 |
| people | Person, contract hours, employment dates, active flag | FR-03 |
| assignments | A person's time on a team between dates; ended, never deleted | FR-05, BR-21, BR-22 |
| absences | Booked absences, one row per absence | FR-07 |
| public_holidays | Holidays by country and regions (OpenHolidays shape) | FR-20 |
| holiday_calendars | Which country/year calendars are loaded | BR-10 |
| availability_forecasts | Expected availability per region per month | FR-06 |
| planning_periods | Sprints and quarters | FR-08 |
| allocation_settings | Team defaults and quarter/sprint overrides | FR-10, FR-11 |
| data_quality_issues | Issue log | FR-15 |
| audit_log | Who changed what, when and why | Non-functional |

A person can be on several teams: each team is a separate row in `assignments`.
