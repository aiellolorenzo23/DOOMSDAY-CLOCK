<p align="center">
  <img src="./src/renderer/src/assets/icon.svg" alt="Doomsday Clock icon" width="160" />
</p>

# DOOMSDAY CLOCK

Desktop app built with Electron, React and TypeScript that turns the Bulletin of the Atomic Scientists' Doomsday Clock into a stylized live display inspired by *Watchmen*.

The app shows:
- an analog clock and digital clock tied to the current `seconds to midnight`;
- the latest known Bulletin update date;
- a source status badge: `live`, `cached`, or `fallback`;
- a manual refresh button with animated refresh feedback.

When the Bulletin page is reachable, the app fetches the latest value on startup and on manual refresh. If the request fails, it falls back to the locally cached value; if no cache is available, it uses the built-in fallback value.

## Requirements

- Node.js 20+ recommended
- npm
- Windows if you want to build the Windows installer locally

## Install

```bash
npm install
```

## Run In Development

Start the Electron app in development mode:

```bash
npm run dev
```

Notes:
- if you change `src/main` or `src/preload`, do a full restart of the dev process to make sure the Electron main process is updated;
- renderer-only changes usually refresh more smoothly during development.

## Type Check

```bash
npm run typecheck
```

## Build The App

Create the production app bundle:

```bash
npm run build
```

## Build For Windows

Build the Windows distributables:

```bash
npm run build:win
```

This generates two useful outputs:
- `doomsday-clock-1.0.0-setup.exe`: the Windows installer
- `win-unpacked/`: the portable unpacked app folder

Use:
- `setup.exe` if you want the normal installed app experience
- `win-unpacked` if you want to test the app quickly without installing it

## Cache Behavior

The app stores the last valid Doomsday Clock payload locally in:

```text
%APPDATA%\doomsday-clock\doomsday-clock-data.json
```

Source badge meanings:
- `live`: data fetched successfully from the Bulletin
- `cached`: network fetch failed, local cache used
- `fallback`: network fetch failed and no valid cache was available

## Scripts

```bash
npm run dev
npm run build
npm run build:win
npm run build:unpack
npm run typecheck
npm run lint
```
