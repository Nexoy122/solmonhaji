# Explore video index → Postgres (setup)

The Explore feed's video/channel index now lives in **Postgres** (on your server)
instead of Firestore — so it can hold **every Short from every seed creator** with
no read caps. Auth + everything else still uses Firebase.

Do these once, on the Ubuntu server where the app will run.

## 1. Install Postgres

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

## 2. Create the database + user

```bash
sudo -u postgres psql
```
Then paste (change `YOUR_STRONG_PASSWORD`):
```sql
CREATE DATABASE nichespy;
CREATE USER nichespy_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE nichespy TO nichespy_user;
\c nichespy
GRANT ALL ON SCHEMA public TO nichespy_user;
\q
```

## 3. Add the connection string to `.env`

```
DATABASE_URL="postgres://nichespy_user:YOUR_STRONG_PASSWORD@localhost:5432/nichespy"
```
(No SSL needed for localhost. For a remote/managed DB, also set `DATABASE_SSL="1"`.)

## 4. Create the tables

```bash
node scripts/setup-postgres.mjs
```
You should see: `✓ Explore tables created`.

## 5. Do the first video crawl (fills the index)

Start the app, then hit the refresh endpoint once with `force=1`:
```bash
# CRON_SECRET is the value in your .env
curl "http://localhost:3000/api/explore/refresh?secret=YOUR_CRON_SECRET&force=1"
```
This deep-crawls **every Short from every seed creator** into Postgres. It takes a
while (many YouTube API calls) — run it in a screen/tmux if over SSH. When done it
returns `{ ok: true, channels: N, videos: M }`.

Explore will then show all those videos, paginated, sorted by best-performing.

## 6. Weekly auto-refresh

`vercel.json` already schedules `/api/explore/refresh` for **Mondays 04:00 UTC**.
Once deployed, the index refreshes weekly on its own — new uploads appear after
each weekly refresh. The endpoint self-skips if it's not been 7 days yet (unless
`force=1`). If you're **not** on Vercel, add a server cron instead:
```bash
# crontab -e  →  Mondays 4am
0 4 * * 1 curl -s "http://localhost:3000/api/explore/refresh?secret=YOUR_CRON_SECRET" >/dev/null
```

## Notes
- The old Firestore Explore code (`lib/explore.ts`) is unused now but left in place;
  it can be deleted later.
- Scale: Postgres handles millions of rows fine. If a channel has thousands of
  Shorts, adjust `MAX_PER_CHANNEL` in `lib/exploreDb.ts` (default 1000).
