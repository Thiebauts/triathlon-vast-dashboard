# Supabase (race calendar)

The race calendar ("Who's going?") stores its data in the Supabase project
**triathlon-vast-dashboard** (region eu-north-1, Stockholm).

- `races`: the races on the calendar. Only the owner adds or edits them (SQL).
- `plans`: one row per person per race: status, ride offered/needed, note.

`migrations/` holds every change to the database, in order. Apply new ones
through the Supabase connection in Claude (or `supabase db push` with the
Supabase CLI) and commit the SQL file here at the same time.

**Test phase:** anyone with the page can add, change or delete plans (no
log-in). Before the page is linked from the live dashboard, replace the
"(test phase)" policies with per-member ones.

The browser uses the project's *publishable* key (in `src/lib/raceCalendar.ts`).
It is meant to be public; what it can do is limited by the policies above.
