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

## Native iOS app (optional)

`npm run ios` builds, syncs into the Capacitor project in `ios/`, and opens Xcode (Xcode required).
