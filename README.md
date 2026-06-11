# Dog Training Tracker

A first working React + Vite version of a mobile-friendly kennel training tracker.

## What is included

- Dashboard with season statistics
- Dogs overview with initial dog list
- Add and edit dogs
- Guided New Training Entry flow
- Training Sessions list
- Detailed Training Log with one row per dog per training
- Simple Routes management
- Local browser storage
- CSV exports for Dogs, Training Sessions and Training Log

## How to run locally

```bash
npm install
npm run dev
```

## Build test

```bash
npm run build
```

## Data storage

Version 1 stores data in the browser localStorage. This is stable for first local testing, but it is not yet a shared OneDrive/Excel database. CSV export is included so the data can be opened in Excel.

## Next possible steps

- Edit individual log entries after saving
- Import CSV/JSON backup
- Export one combined Excel workbook
- Add OneDrive, SharePoint, Microsoft Forms or database sync
- Add user accounts and multi-guide shared access


## Version 4 additions

- Dashboard now separates Training km (route/team kilometers counted once per session) from Dog workload km (all individual dog log kilometers combined).
- Fixed Teams tab for reusable team templates.
- New Training can load a fixed team template and still allows manual adjustments before saving.
- Training Sessions and CSV export include the selected fixed team name when used.
- JSON backups include fixed teams and remain migration-friendly for future versions.

## v11 updates

- Quick Training remembers the last used setup (route, km, team, guide and training type) and can load it again with one tap.
- Dog profiles now show simple no-dependency bar charts for monthly kilometers and recent form scores.
- Training review/edit has a dog jump list so editing many dogs is easier on mobile.
- Local data migration was updated to data version 11 while keeping older JSON backups importable.
