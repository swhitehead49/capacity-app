# Capacity App

Engineering capacity planning for Dedalus teams.

```bash
npm install     # once
npm test        # run all tests
```

## Run it on your own computer

You need **Node.js 22 (LTS)** from https://nodejs.org and **Git** from https://git-scm.com.
No database to install: the app keeps its data in a local folder (`data/dev`).

```bash
git clone https://github.com/swhitehead49/capacity-app.git
cd capacity-app
npm install        # once, and again after pulling changes
npm run seed       # FIRST TIME ONLY: creates demo data (DRGW etc.). It wipes data/dev!
npm run dev        # starts the app; open http://localhost:3000
```

Stop it with Ctrl+C. Next time just run `npm run dev`. To get the latest changes: `git pull`, then `npm install`.

See `docs/requirements.md` for what the app must do and `docs/architecture.md` for how it is organised.

## Public holidays

Open **Holidays** in the top bar to load each country's public holidays for a year from the
[OpenHolidays API](https://openholidaysapi.org) (DE, FR, AT, BE). Tests never call the internet: they read
saved answers from `tests/fixtures/openholidays` (set `OPENHOLIDAYS_FIXTURE_DIR`).

India (and any country OpenHolidays doesn't cover) uses the yearly company list: save it as CSV with
headings `date,name` and an optional `regions` column, then use **Upload a company holiday list** on the
same page. Example: `tests/fixtures/holiday-csv/IN-2027.csv`.
