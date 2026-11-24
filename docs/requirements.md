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
| Enabling/Training | Planned learning and enabling work: training, onboarding, tooling, communities of practice (added 15 Nov 2026; settings saved before then count as 0%) |

Overhead (meetings, admin and so on) is taken off **before** the Run/Fix/Sustain/Change/Enabling split. Planned training goes in Enabling/Training.

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
   One 100% (sean, 15 Nov 2026): overhead %, contingency % and the five work-type % add up to 100% of calendar-available days.
8. **Contingency days** = calendar-available days × contingency % (added 8 Nov 2026; blank = 0%).
9. **Run / Fix / Sustain / Change / Enabling/Training days** = calendar-available days × the effective % for each.
   Settings saved before 15 Nov 2026 were converted so every number stayed the same (migration 0007).

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
| UC01 | Team Planner: view a team's capacity plan | Pick a team, then see one row per sprint (current sprint to the end of next quarter) and per quarter (current quarter to the end of next calendar year). Each row shows FTE, available days, engineering days, R/F/S/C, where the allocation came from and a status, with an Edit button that opens that period's override (agreed 8 Nov 2026) |
| UC02 | Choose availability mode | Recalculated using Auto, Explicit only or Forecast only |
| UC03 | Set a team's default allocation | Effective-from date, overhead %, and R/F/S/C % totalling 100%. Status is Draft, Active or Retired |
| UC04 | Create a quarter or sprint override | A dated exception (R/F/S/C, optional overhead %) with a reason and status |
| UC05 | See which allocation applies | Shows the sprint override, quarter override or default actually used |
| UC06 | Review team members | Location, contracted hours, team %, shared flag and employment dates |
| UC07 | Add, remove or change a team member | Add, edit, move or end an assignment. The change applies immediately and is logged |
| UC08 | Approve a people change | **Deferred** (not needed with one actor) |
| UC09 | Record an absence | One record per absence: dates, type, day fraction and status |
| UC10 | Maintain calendars and assumptions | Location standard hours, holidays and monthly availability forecast |
| UC11 | Extend the planning horizon (automatic) | Whenever the planner opens, any missing sprints and quarters in its window are created from the timeline settings (first sprint start, length, prefix). Existing periods are never changed (decided 8 Nov 2026) |
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
| FR-01 | Organisation | Team hierarchy: team → value stream (the parent level) → grandparent → top-level group, each level with a lead email. Teams get provisional IDs (e.g. T017) until confirmed. |
| FR-02 | Organisation | Teams with the same name under different parents stay separate and are flagged, never merged. |
| FR-03 | People | Store email, team, role, location, contracted hours, team allocation %, shared-resource flag, employment start and end, and an active flag. |
| FR-04 | People | Input status: Complete, Missing location, Missing contracted hours, Missing standard hours, Missing team allocation or Inactive. Incomplete people are left out of the capacity figures. |
| FR-05 | People | The Capacity Admin adds, edits, moves or ends assignments directly, and every change is logged. An approval queue is deferred. |
| FR-05a | Each person (team member) has an optional First name and Last name (trimmed, at most 100 characters), set on Add/Edit member and shown as Name on the Team members list. |
| FR-05b | Engineering managers import team members into their project from the Team Members sheet saved as CSV (Team planning → Import team members from spreadsheet). Team_ID and Email needed; blank Team_Pct = 100, blank Start_Date = today, blank Location = team base location. Same checks as Add member; team must be in the project; all-or-nothing; audited. |
| FR-05c | All emails are optional (sean, 24 Nov 2026). Lead emails were already optional. A person needs an email or a first/last name; without an email they are identified by their name (same name = same person, in Add member and the member import). An email can be added later on the member page; their memberships and leave move with it. Member lists show the name, and the email only when there is one. |
| FR-05d | One-time fix (sean, 24 Nov 2026): Team_Pct imported as a fraction (1 = 100%, 0.8 = 80%) was saved as 1% and 0.8%; every team % of 1% or less is multiplied by 100 in every project (migration 0020). |
| FR-06 | Calendars | Store each location's standard hours, public holidays and monthly forecast availability %. Use a central working-day calendar covering at least 2025 to 2035. |
| FR-07 | Absence | One record per absence: person, start, end, type, day fraction, status and source. Ignore cancelled absences. Leave out weekends and holidays. |
| FR-08 | Timeline | Generate calendar quarters (fiscal quarters are reserved for later) and fixed-length sprints from a first sprint start, sprint length, sprint count and ID prefix. Mark each period Future, Open or Closed, and flag the current one. |
| FR-09 | Timeline | Extend the horizon one sprint or quarter at a time. Warn if the sprint horizon ends before the quarter horizon. |
| FR-10 | Allocation | Team default from an effective date: overhead %, Run %, Fix %, Sustain %, Change % and Enabling/Training %. Status is Draft, Active or Retired. |
| FR-11 | Allocation | Quarter and sprint overrides of R/F/S/C, plus an optional overhead %, each with a reason, owner and status. |
| FR-12 | Allocation | Work out the effective allocation (section 3) and show which source was used. |
| FR-13 | Calculation | Calculate capacity for each person and as a team total, as set out in section 3. |
| FR-14 | Calculation | Label each result Ready, Calendar capacity only, Provisional or Excluded. |
| FR-15 | Data quality | Issue log: ID, severity, type, entity, details, suggested action and status (Open, Resolved, Accepted). Show counts by severity. |
| FR-16 | Reporting | Team readiness: headcount, people with complete inputs, completeness %, contracted and allocated FTE, shared resources, default status, and readiness (None, Partial, Ready). Include an org roll-up. |
| FR-17 | Migration | Map legacy members onto people records. Split the old single "factor" into contracted FTE × team %. Flag people who don't match. |
| FR-18 | Organisation | Add, rename and retire teams with an effective date and an audit trail. Never hard-delete. |
| FR-18a | Organisation | Each team has a base location (sean, 15 Nov 2026), set on Add team, Manage or CSV import (`base_location`), shown on the Teams list and used by its Country filter. Each member keeps their own location, which decides their public holidays; a new member's location starts as the team's base. |
| FR-18b | Organisation | Teams carry the original workbook's Teams attributes (sean, 15 Nov 2026): Team_Lead_Email, Parent_Team_Name and lead email, Grandparent_Team_Name and lead email, Top_Level_Group and lead email, Source_Headcount (whole number), ID_Status (Provisional or Confirmed; new teams Provisional) and Data_Quality_Flag. Edited on the team's Manage page (Details) and imported from CSV with those headings plus Value_Stream, Base_Location and Start_Date. |
| FR-18c | Reference data | Value streams and locations are reference data set once at system level and shared by every project (sean, 15 Nov 2026), on the Reference data page. A team's Value stream and Base location, and each person's Location, are picked from them; an unknown value stream or location is refused. Location codes are ISO 3166-2 region codes (or a country code); the workbook's eight LocationProfiles plus IN-KA can be added in one go. |
| FR-18f | Reference data | Reference data tabs (sean, 15 Nov 2026): Value streams, Locations, Public holidays, Sprint calendar. The Sprint calendar tab shows the shared calendar (first sprint, length, prefix) with its sprints and quarters, current one marked; it can be set up once on a fresh system and is read-only after that, because sprints already created never change. |
| FR-18g | Reference data | System standard allocation (sean, 15 Nov 2026): a Standard allocation tab where the Admin sets the seven percentages (same rules as a team default). A project without its own standard uses it for new teams; Project reference data shows "Using the system standard allocation", lets the manager save the project's own, and "Use the system standard" to go back. Changes never alter existing teams. |
| FR-18h | Reference data | Extend the sprint calendar (sean, 15 Nov 2026): on the Sprint calendar tab the Admin picks a later quarter (e.g. 2029-Q4); sprints and quarters are then created up to the end of it, as well as the automatic range. Sprint numbers never change; extensions can only move later; audited. Projects receive the new periods when a team planner opens. The Team Planner still shows its agreed horizon. |
| FR-18i | Reference data | Projects tab (sean, 15 Nov 2026): the Admin adds new projects in Reference data → Projects, which also lists every project (open or archived). Engineering managers can no longer add projects from the project picker; they still rename, archive and restore. |
| FR-18j | Reference data | Master team list (sean, 15 Nov 2026): the Admin adds, imports and edits every team once in Reference data → Teams (details, rename, value stream, base location). A project's teams are those in its value streams plus the teams without a value stream it includes; each project keeps a synced copy of every team for its own members, allocations, plans and retirements. A new copy starts with the project's (or the system) standard allocation. Teams that existed only in one project join the master list. Engineering managers see team details read-only. |
| FR-18k | Reference data | While the team list is provisional (sean, 16 Nov 2026): the master team list is an editable table (Name, Value stream and Base location drop-downs, Lead email, ID status) saved together; rows with problems are reported by team ID and the others are saved. A Provisional team that no project has used yet (no members, retirement, successors or allocation changes) can be deleted from its Edit page; it goes from every project. All changes audited. |
| FR-18l | Reference data | Retire in the master list (sean, 16 Nov 2026): the Admin retires a team on its Edit page in Reference data → Teams, for every project at once (UC17 rules). Every project is checked first; anyone still on the team after its last day is listed with their project and nothing changes. Projects opened later get the team as retired. The project Team details tab no longer retires. |
| FR-18m | Reference data | Delete a team and all its data (sean, 16 Nov 2026): from a team's Edit page, any status. Shows what will be removed per project, needs the team ID typed, then removes the team, its memberships, people on no other team (with their leave), defaults/overrides, names and successor links in every project and the master list. Audited (counts only). |
| FR-18n | Admin can paste a list of value streams (one per line) on Reference data → Value streams; names already there (any case) and repeats are skipped. |
| FR-18o | Each team has an optional Team type: Mission Team, Domain Team or Enabling Team. Set in the master team table, on the team Edit page and via the Team_Type import column (any case, "Team" optional); shown read-only on Team details. |
| FR-18p | Every lead in the team hierarchy (team, parent, grandparent, top-level) has an optional first and last name beside their email: on the team Edit page, the read-only Team details tab, and import columns like Team_Lead_First_Name / Parent_Team_Lead_Last_Name. |
| FR-18q | Reference data → Teams → "Delete all provisional teams": after typing DELETE, every Provisional team no project uses is deleted from the master list and every project (as single Delete). Confirmed teams stay; used provisional teams are kept and listed. |
| FR-18r | Master team table (sean, 22 Nov 2026): columns ID, Team Name, Parent Team Name, Grandparent Team Name, Value stream, Base location, Team type, ID status; no email column (lead email stays on the Edit page and import). Filters: Team Name (part of name), Parent and Grandparent Team Name. Smaller text, wrapped headings. |
| FR-18s | Project setup moves to Reference data → Projects (Admin): pick a project (Set up) or add one (opens its setup). Value streams list with Include ticks + Update value streams; Teams list (all active teams, grouped by value stream) with Include ticks + Update teams. Rule: a team is in a project when ticked; ticking a value stream ticks its teams, unticking unticks them; single teams can then be changed. New teams / teams moved to another value stream are ticked only if the project has that value stream. Managers' Project home is read-only. |
| FR-18t | A team's Base location is a country code (e.g. DE, AT, IN), picked from the countries of the system locations. Location (region) codes apply only to individual people. Existing teams are converted to their country (migration 0018); imports accept a region code and store its country. A new member's location defaults to the only location in the team's country, otherwise the manager picks one. |
| FR-18u | Reference data → Teams table: Parent Team Name and Grandparent Team Name are editable inline and saved with Save changes; blank clears the name. |
| FR-18v | Team details layout (Admin edit form and the manager's read-only Team details tab): the other details (team type, ID status, headcount, data quality flag, top-level group and lead) on top, then a Team hierarchy table with one row each for the team, its parent and its grandparent (name, lead first name, last name, email). |
| FR-18w | Headcount (replaces Source_Headcount, sean 22 Nov 2026): read-only, counted as the people on the team today. A project shows its own count; the master list (Admin) adds up every project and names them when more than one. Not stored or imported: the import ignores a Source_Headcount column, and both spreadsheets no longer have it. |
| FR-18x | Team import reads the template's % columns (Overhead_Pct, Contingency_Pct, Run_Pct, Fix_Pct, Sustain_Pct, Change_Pct, Enabling_Training_Pct) and saves them as the team's first Active default (reason "Imported starting allocation") in the master list and in every project that later gets the team, instead of the standard allocation. All blank = standard; once any is filled, blank = 0% and the seven must add up to 100% (BR-01); Total_Pct is ignored. |
| FR-18y | Any project can be archived and restored, Default included (sean 22 Nov 2026: retire Default as a project). Admin: Archive / Restore on Reference data → Projects; managers: Archive on Project reference data. Archiving only hides the project from managers; the Default database still holds what all projects share (master team list, sprint calendar, holidays, reference data). |
| FR-19a | Team planning | Team planning (sean, 16 Nov 2026): the Engineering manager menu item "Team planning" first asks the manager to choose a team (remembered per project; "Change team" returns to the list). A chosen team has tabs: Team members (default: list with missing-input flags; add, edit incl. location/holiday calendar, end or move members, book leave), Capacity (sprints and quarters, team default, edit by period) and Team details (read-only master details, retire). |
| FR-19b | Team planning has two tabs (sean, 22 Nov 2026): Team details (the team list as before) and Default capacity (each team's default in force today: overhead, contingency, Run/Fix/Sustain/Change/Enabling %, from-date, and Standard / Own / No active default). Filters apply to both. |
| FR-19c | Capacity summary (sean, 24 Nov 2026): menu item for managers (/p/<id>/summary). Pick All teams (total), one value stream or one team; for each sprint and quarter of the planner horizon it shows teams, people, FTE, available days and the breakdown Overhead, Contingency, Run, Fix, Sustain, Change, Enabling/Training and Not allocated (teams without an allocation), which add up to the available days. Retired teams are left out. |
| FR-18d | Access | Home screen (sean, 15 Nov 2026): the app opens on a screen with no menu asking "Admin" or "Engineering manager" (remembered in a cookie; a choice, not a login, until personal logins). Admin goes to Reference data; the Admin side is project-agnostic (no project name, Teams or project pages). Engineering manager chooses a project and lands on the project home page (to be designed); Reference data is hidden from them and its addresses send them to the project list. Each project's own settings (standard allocation, rename, archive) are on a "Project reference data" menu item shown only to Engineering managers. |
| FR-18e | Organisation | Project makeup on the project home page (sean, 15 Nov 2026): the project has its own list of value streams (added from the system list, removable; removing one takes its teams out of the project: unmapped and Excluded, never deleted). Each value stream's page lists its teams, with Remove and a tick-list to add several unmapped teams at once. Teams need not be in a value stream; those that aren't are Included or Excluded (excluded = greyed, left out of the project). Using a value stream on a team adds it to the project. With no value streams the page shows "No value streams in the project". |
| FR-19 | Organisation | All screens, reports and totals pick up new and retired teams automatically. There are no fixed limits on teams, people or members per team. |
| FR-20 | Calendars | Load public holidays for DE, FR, AT and BE from the **OpenHolidays API** (https://openholidaysapi.org), including regional holidays by ISO 3166-2 subdivision (e.g. DE-BY). Map each location to a country and subdivision. Refresh every year in the horizon and cache the data locally, so calculations don't depend on the API being available. **India** is not covered: the Capacity Admin uploads the company holiday list as a CSV each year. |
| FR-20a | Calendars | Add or remove single public holidays in a loaded calendar (sean, 15 Nov 2026), on the calendar's View page: date, name, regions (none = whole country), optional reason. Added holidays are kept on reload; removed loaded holidays stay removed (listed, with Put back). Every change is audited and applies to all projects. |

## 6. Business rules

| ID | Rule |
| --- | --- |
| BR-01 | Overhead + Contingency + Run + Fix + Sustain + Change + Enabling/Training = 100% (tolerance 0.01%). The error message shows the actual total. |
| BR-02 | Every percentage is between 0 and 100%. |
| BR-03 | A team default can be Active only when its effective date, overhead and all four percentages are filled in and BR-01 passes. |
| BR-04 | An Active override needs a team, level, period and reason. Its level must match the period type. |
| BR-05 | Draft and Retired allocations are ignored. With no Active allocation, show calendar capacity only. |
| BR-06 | Replaced 15 Nov 2026: an Active override gives all seven numbers (the Edit form starts from what currently applies); nothing is inherited. |
| BR-07 | A person counts only if they are active and their inputs are complete. |
| BR-08 | Capacity counts only within the employment dates. A blank date means no limit. |
| BR-09 | Holidays are taken off only if they fall on a weekday and match the person's location. |
| BR-10 | If there is no holiday data for a location and year, the result is Provisional. Never invent holidays. |
| BR-11 | If there is no forecast for the month, use 100% and label it "No forecast". |
| BR-12 | The forecast month is the month containing the period's midpoint. |
| BR-13 | Sprint IDs are prefix + number (S001). Quarter IDs are year + quarter (2026-Q4). All teams share one sprint calendar. |
| BR-14 | People changes apply immediately and are logged. |
| BR-15 | Team IDs are permanent and never reused. Everything links by ID, never by name. |
| BR-16 | Team names are unique within the same value stream. The same name in a different value stream is allowed but flagged. |
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
| Contingency | A separate contingency % held back after overhead and before the R/F/S/C split; default 0% (decided 8 Nov 2026). |
| Value streams | The value stream is the org level just above a team (the former "parent group"). A team is in at most one value stream; changes are logged (decided 8 Nov 2026). |
| Merges and splits | Done by hand, plus a successor-team link. |
| New sprints and quarters | Created automatically, on demand, from the timeline settings. |

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

## Standard allocation (added 15 Nov 2026)

Each project has one **standard allocation**: overhead %, contingency % and the Run/Fix/Sustain/Change/Enabling-Training split,
set on the project's Project reference data page (Engineering managers only; sean, 15 Nov 2026) with the same rules as an Active team default (BR-01 to BR-03).
A team added to the project starts with it as an Active team default from its start date. Without one, a new team
starts with a Draft default (BR-17). Changing the standard never changes existing teams.
