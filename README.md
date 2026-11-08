# Capacity App

Engineering capacity planning for Dedalus teams.

```bash
npm install     # once
npm test        # run all tests
```

See `docs/requirements.md` for what the app must do and `docs/architecture.md` for how it is organised.

## Public holidays

Open **Holidays** in the top bar to load each country's public holidays for a year from the
[OpenHolidays API](https://openholidaysapi.org) (DE, FR, AT, BE). Tests never call the internet: they read
saved answers from `tests/fixtures/openholidays` (set `OPENHOLIDAYS_FIXTURE_DIR`).

India (and any country OpenHolidays doesn't cover) uses the yearly company list: save it as CSV with
headings `date,name` and an optional `regions` column, then use **Upload a company holiday list** on the
same page. Example: `tests/fixtures/holiday-csv/IN-2027.csv`.
