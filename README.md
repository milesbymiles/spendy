# spendy

A tiny, private expense tracker. React + Vite + TypeScript, installable as a PWA, designed for a 390px phone first.
All data lives in the browser's `localStorage` on your device. Back it up from **Settings → Back up to file**.

## Run

```sh
npm install
npm run dev        # http://localhost:5173 (also printed: a LAN URL for your phone)
npm run build      # type-check + production build into dist/ (includes sw.js + manifest)
npm run preview    # serve the production build
npm run icons      # regenerate app icons in public/ from scripts/icons.mjs
```

## Live app

https://milesbymiles.github.io/spendy/

Every push to `main` rebuilds and redeploys it via GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
The installed app picks up the new version the next time it's opened.

## Installing on your phone

- **iPhone (Safari):** open the link above → Share → Add to Home Screen
- **Android (Chrome):** menu → Install app (or the button in spendy's Settings)

Install requires HTTPS, so the LAN URL from `npm run dev` is only for trying the UI.
On iOS the home-screen app has its own storage, separate from the Safari tab.

## Accounts & sync (Supabase)

spendy works fully offline without an account. Signing in (email + one-time code) syncs expenses
to Supabase so they're backed up and shared across devices. Data is local-first: changes are saved
on the device immediately and pushed/pulled in the background (only rows changed since the last sync).

Setup:
1. Run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor (tables + Row Level Security).
2. Authentication → Emails → make the **Magic Link** and **Confirm signup** templates include `{{ .Token }}`.
3. Put the project URL and publishable/anon key in [src/supabase-config.ts](src/supabase-config.ts).
   Both are public by design; RLS keeps each user's rows private. Never use the secret/service_role key.

## Add-expense link

`./?add` opens the add sheet; `amount`, `note`, `category` and `method` (`upi`/`card`/`cash`) pre-fill it,
e.g. `https://milesbymiles.github.io/spendy/?add&amount=250&note=Zomato&method=upi`.
The Android home-screen shortcut uses it, and it's the hook for automations like iOS Shortcuts.

## Native iOS app (optional)

`npm run ios` builds, syncs into the Capacitor project in `ios/`, and opens Xcode (Xcode required).
