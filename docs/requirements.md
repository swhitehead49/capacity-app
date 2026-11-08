# Capacity App — Requirements

> Source of truth for building the Capacity App (v1). Reverse-engineered from the frozen Excel prototype
> `Engineering_Capacity_Phase6_Interactive.xlsm`, then refined with decisions made on 8 Nov 2026.
> Living version: https://claude.ai/artifact/TJVAzfyktKuRUxYAM6p9vn

## 1. Purpose

For each Dedalus engineering team (about 70 teams, around 500 people, growing to about 700) and each planning period (sprint or quarter), the app calculates:

- how many **person-days of engineering capacity** the team really has, and
- how that capacity splits across **Run, Fix, Sustain and Change**.

It also shows whether the input data is complete enough to trust the result.

### Capacity categories

| Category | Meaning |
| --- | --- |
| Run | Keeping the live service running: support, incidents, operational requests |
| Fix | Corrective work: defects, regressions, rework, failed changes |
| Sustain | Product health: tech debt, upgrades, security, modernisation |
| Change | Roadmap work: features and strategic projects |

Overhead (meetings, training, admin and so on) is taken off **before** the Run/Fix/Sustain/Change split.

## 2. Actor (v1)

v1 has **one actor, the Capacity Admin**, who can enter and maintain all data and use every screen. There are no roles, permissions or approval steps in v1.

Every change records **who made it, when and why**, so roles can be added later. Possible future roles: Team Manager, Capacity Planner / Group Lead, People / Data Admin, Engineering Leadership, System Administrator.

## 3. Calculation (per person, per period, summed to the team)

1. **Contracted FTE** = contracted hours ÷ standard weekly hours for the person's location.
2. **Allocated FTE** = contracted FTE × team allocation %.
3. **Effective window** = the period's start and end, clipped to the person's employment start and end. A blank date means no limit.
4. **Scheduled days** = allocated FTE × weekdays in the effective window.
5. **Take off holidays**: allocated FTE × public holidays for the person's location that fall on a weekday in the window.
6. **Availability mode** (selectable):
   - **Auto** (default): take off whichever is larger, the booked absence days or the forecast reduction. The forecast uses the monthly availability % for the month containing the period's midpoint.
   - **Explicit only**: take off booked absence only.
   - **Forecast only**: apply the forecast % only.
7. **Engineering days** = calendar-available days × (1 − overhead %).
8. **Run / Fix / Sustain / Change days** = engineering days × the effective % for each.

The unit is **person-days**. Part-time work is handled through FTE.

```
EngineeringDays = (h_contract / h_standard) × a_team × (D_weekdays − D_holidays − D_absence) × (1 − overhead)
```

### Which allocation applies

Use the most specific **Active** setting: **sprint override → quarter override → team default**, and show which one was used.

Overhead follows the same order. If an override leaves overhead blank, the next level up applies.

### Result status

| Status | When |
| --- | --- |
| Ready | Inputs complete, holiday data present and an Active allocation exists |
| Calendar capacity only | No Active allocation, so no R/F/S/C split |
| Provisional | No holiday data for the location and year |
| Excluded | The person's inputs are incomplete |

## 4. Use cases

| ID | Use case | Outcome |
| --- | --- | --- |
| UC01 | View team capacity for a period | Headcount, allocated FTE, scheduled days, calendar-available days, engineering days and the R/F/S/C split, with a status for each member |
| UC02 | Choose availability mode | Recalculated using Auto, Explicit only or Forecast only |
| UC03 | Set a team's default allocation | Effective-from date, overhead %, and R/F/S/C % totalling 100%. Status is Draft, Active or Retired |
| UC04 | Create a quarter or sprint override | A dated exception (R/F/S/C, optional overhead %) with a reason and status |
| UC05 | See which allocation applies | Shows the sprint override, quarter override or default actually used |
| UC06 | Review team members | Location, contracted hours, team %, shared flag and employment dates |
| UC07 | Add, remove or change a team member | Add, edit, move or end an assignment. The change applies immediately and is logged |
| UC08 | Approve a people change | **Deferred** (not needed with one actor) |
| UC09 | Record an absence | One record per absence: dates, type, day fraction and status |
| UC10 | Maintain calendars and assumptions | Location standard hours, holidays and monthly availability forecast |
| UC11 | Extend the planning horizon | Generate the next sprints and quarters |
| UC12 | Work through data-quality issues | Set an issue to Open, Resolved or Accepted. Counts are shown by severity |
| UC13 | Review portfolio readiness | For each team: headcount, completeness, FTE, shared resources, default status and readiness, plus an org roll-up |
| UC14 | Load and reconcile org data | Import teams and people, flag ambiguous teams, map legacy members |
| UC15 | Add a team | Permanent ID, name, place in the hierarchy and lead. Shows calendar capacity only until it has an Active default |
| UC16 | Rename a team | The new name applies from an effective date. ID, members, allocations and history are unchanged, and the old name is kept |
| UC17 | Retire (remove) a team | Retired from an end date once its members are moved or ended. Past periods are still reported |

UC01 is the core use case. Every other use case exists to make its numbers trustworthy.

## 5. Functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| FR-01 | Organisation | Team hierarchy: team → parent → grandparent → top-level group, each level with a lead email. Teams get provisional IDs (e.g. T017) until confirmed. |
| FR-02 | Organisation | Teams with the same name under different parents stay separate and are flagged, never merged. |
| FR-03 | People | Store email, team, role, location, contracted hours, team allocation %, shared-resource flag, employment start and end, and an active flag. |
| FR-04 | People | Input status: Complete, Missing location, Missing contracted hours, Missing standard hours, Missing team allocation or Inactive. Incomplete people are left out of the capacity figures. |
| FR-05 | People | The Capacity Admin adds, edits, moves or ends assignments directly, and every change is logged. An approval queue is deferred. |
| FR-06 | Calendars | Store each location's standard hours, public holidays and monthly forecast availability %. Use a central working-day calendar covering at least 2025 to 2035. |
| FR-07 | Absence | One record per absence: person, start, end, type, day fraction, status and source. Ignore cancelled absences. Leave out weekends and holidays. |
| FR-08 | Timeline | Generate calendar quarters (fiscal quarters are reserved for later) and fixed-length sprints from a first sprint start, sprint length, sprint count and ID prefix. Mark each period Future, Open or Closed, and flag the current one. |
| FR-09 | Timeline | Extend the horizon one sprint or quarter at a time. Warn if the sprint horizon ends before the quarter horizon. |
| FR-10 | Allocation | Team default from an effective date: overhead %, Run %, Fix %, Sustain % and Change %. Status is Draft, Active or Retired. |
| FR-11 | Allocation | Quarter and sprint overrides of R/F/S/C, plus an optional overhead %, each with a reason, owner and status. |
| FR-12 | Allocation | Work out the effective allocation (section 3) and show which source was used. |
| FR-13 | Calculation | Calculate capacity for each person and as a team total, as set out in section 3. |
| FR-14 | Calculation | Label each result Ready, Calendar capacity only, Provisional or Excluded. |
| FR-15 | Data quality | Issue log: ID, severity, type, entity, details, suggested action and status (Open, Resolved, Accepted). Show counts by severity. |
| FR-16 | Reporting | Team readiness: headcount, people with complete inputs, completeness %, contracted and allocated FTE, shared resources, default status, and readiness (None, Partial, Ready). Include an org roll-up. |
| FR-17 | Migration | Map legacy members onto people records. Split the old single "factor" into contracted FTE × team %. Flag people who don't match. |
| FR-18 | Organisation | Add, rename and retire teams with an effective date and an audit trail. Never hard-delete. |
| FR-19 | Organisation | All screens, reports and totals pick up new and retired teams automatically. There are no fixed limits on teams, people or members per team. |
| FR-20 | Calendars | Load public holidays for DE, FR, AT and BE from the **OpenHolidays API** (https://openholidaysapi.org), including regional holidays by ISO 3166-2 subdivision (e.g. DE-BY). Map each location to a country and subdivision. Refresh every year in the horizon and cache the data locally, so calculations don't depend on the API being available. **India** is not covered: the Capacity Admin uploads the company holiday list as a CSV each year. |

## 6. Business rules

| ID | Rule |
| --- | --- |
| BR-01 | Run + Fix + Sustain + Change = 100% (tolerance 0.01%). Overhead is separate and is taken off first. |
| BR-02 | Every percentage is between 0 and 100%. |
| BR-03 | A team default can be Active only when its effective date, overhead and all four percentages are filled in and BR-01 passes. |
| BR-04 | An Active override needs a team, level, period and reason. Its level must match the period type. |
| BR-05 | Draft and Retired allocations are ignored. With no Active allocation, show calendar capacity only. |
| BR-06 | An override can set overhead %. If it is blank, the value is inherited from the quarter override, then the team default. |
| BR-07 | A person counts only if they are active and their inputs are complete. |
| BR-08 | Capacity counts only within the employment dates. A blank date means no limit. |
| BR-09 | Holidays are taken off only if they fall on a weekday and match the person's location. |
| BR-10 | If there is no holiday data for a location and year, the result is Provisional. Never invent holidays. |
| BR-11 | If there is no forecast for the month, use 100% and label it "No forecast". |
| BR-12 | The forecast month is the month containing the period's midpoint. |
| BR-13 | Sprint IDs are prefix + number (S001). Quarter IDs are year + quarter (2026-Q4). All teams share one sprint calendar. |
| BR-14 | People changes apply immediately and are logged. |
| BR-15 | Team IDs are permanent and never reused. Everything links by ID, never by name. |
| BR-16 | Team names are unique under the same parent. The same name under a different parent is allowed but flagged. |
| BR-17 | A new team starts with a Draft default and shows calendar capacity only. |
| BR-18 | A team cannot be retired while anyone is assigned to it after the end date. |
| BR-19 | Retiring a team retires its default and any overrides after the end date. Past data stays reportable. |
| BR-20 | Renames keep a dated name history. Past periods can show the name the team had at the time. |
| BR-21 | Adding a member creates an assignment with a start date, team % and location. They count from that date once their inputs are complete. |
| BR-22 | Removing a member ends the assignment on a date and deletes nothing. A move ends one assignment and starts another on the same date. |
| BR-23 | Merges and splits are done by hand (retire, add, move members). A retired team can record one or more successor teams. |

## 7. Non-functional requirements

- **Auditable:** every calculation step can be inspected (FTE → days → split). No hidden logic.
- **Honest about gaps:** missing data is flagged and never filled with invented values.
- **Audit trail:** every change records who made it, when and why.
- **Scale:** about 70 teams and about 700 people, up to 24 quarters and 160 sprints, with no hard-coded limits.
- **Multi-country:** Germany (several states), Austria, France, Belgium and India, each with its own standard hours and holidays.

## 8. Decisions (8 Nov 2026)

| Topic | Decision |
| --- | --- |
| Actors | One Capacity Admin in v1. Roles come later. |
| Overhead | One % per team for now. The data model leaves room to add categories later. |
| Overrides | Quarter and sprint overrides can also change overhead. |
| Absence vs forecast | Take off whichever is larger, per person per period. |
| Holidays | OpenHolidays API for DE/FR/AT/BE. India via a yearly company CSV upload. |
| Team IDs | The Capacity Admin confirms provisional IDs and ambiguous teams with group leads before go-live. |
| Planning unit | Person-days. |
| Merges and splits | Done by hand, plus a successor-team link. |

**Parked until roles are added:** which roles come first, and whether adding or retiring a team needs a Group Lead's approval.

## 9. Workbook defects (do not replicate)

- A blank employment end date was read as 0, which gave every member 0 working days (see BR-08).
- Absence overlap was calculated only for the first row of the absence table.
- Auto mode dropped the forecast entirely if a person had any absence at all (replaced by the "larger of" rule).
- "Active today" FTE used today's date instead of the selected period.
- The admin password was stored in plain text.
- Ranges were hard-coded: 73 teams, 25 members per team, fixed people rows.

## 10. Not in v1 / later

- Plan vs actual tracking
- Roles and permissions, and an approval workflow for people changes
- Overhead broken down by category
- Different sprint calendars for each team
- Checking that a person's allocations across teams add up to 100% or less
- Fiscal quarters
