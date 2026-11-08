# OpenHolidays sample answers

`DE-2026.json` is the answer from
`https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=EN&validFrom=2026-01-01&validTo=2026-12-31`
(checked 8 Nov 2026; ids replaced). Tests and the browser tests use it so they never need the internet.
Set `OPENHOLIDAYS_FIXTURE_DIR=tests/fixtures/openholidays` to make the app read files from here instead of calling the API.
