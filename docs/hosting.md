# Hosting a test copy (Render + Neon)

Decided 8 Nov 2026: a free test copy on **Render** (runs the app) with a free **Neon** database
(keeps the data). Every push to `main` on GitHub redeploys it automatically.

> **Only demo or anonymised data** until Dedalus IT has agreed where real employee data may live.
> The app is protected by one shared password, not personal logins.

## 1. Create the database on Neon (about 3 minutes)

1. Go to <https://neon.tech> and sign up (the "Continue with GitHub" button is easiest).
2. Create a project: name `capacity-app`, Postgres version **16**, region **AWS Europe Central (Frankfurt)**.
3. On the project dashboard click **Connect**. Copy the **connection string**. It looks like
   `postgresql://neondb_owner:…@ep-….eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it somewhere safe for step 2. **Don't paste it into chat**: it works like a password.

## 2. Create the app on Render (about 5 minutes)

1. Go to <https://render.com> and sign up with **GitHub**. Allow Render to see the `capacity-app` repository.
2. Click **New → Blueprint**, pick `swhitehead49/capacity-app`, and click **Connect**.
   Render reads `render.yaml` from the repository and sets almost everything up.
3. It asks for two values:
   - `DATABASE_URL`: paste the Neon connection string from step 1.
   - `APP_PASSWORD`: make up a password that you'll share with testers.
4. Click **Apply**. The first build takes about 5 minutes. When it says **Live**, open the address at the
   top (something like `https://capacity-app-xxxx.onrender.com`).
5. The browser asks for a user name and password. Type anything as the user name and `APP_PASSWORD` as the password.

On first start the app sets up the database and loads the demo teams (DRGW etc.).
That only happens while the database is empty, so your later changes are never overwritten.

## Good to know

- **Free plan sleeps** after 15 minutes without visitors. The next visit takes 30–60 seconds to wake it.
- **Updates:** every change pushed to GitHub `main` redeploys automatically in a few minutes.
- **Change the password:** Render → capacity-app → Environment → `APP_PASSWORD` → Save. It redeploys.
- **Start again with fresh demo data:** create a new, empty Neon database, put its connection string in
  `DATABASE_URL` on Render, and save. The app fills it with the demo teams when it starts.
- **Holidays:** "Load" on the Holidays page calls the OpenHolidays API from the server, so it works when hosted.
