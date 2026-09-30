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

## v12 updates

- Fixed the More menu so it opens above the page instead of being clipped inside the horizontal navigation bar.
- Quick Training now shows a backup warning when several trainings have been saved since the last JSON backup.
- Dog profiles now include best/most-used position, most-used route, problem rate, position history and problem history.
- Monthly kilometers in Dog Profile now also show as a small bar chart.
- Local data migration was updated to data version 12 while keeping older JSON backups importable.

## v13 updates

- Health now includes a Deworming / worm cure event type.
- Added a batch deworming panel in Health to record worm cure for many dogs at once.
- Batch deworming creates one health note per selected dog, so each dog profile keeps its own history.
- Dog Profile health notes can also use the Deworming type.
- Local data migration was updated to data version 13 while keeping older JSON backups importable.

## Shared Neon storage / Cloud Sync

This version can use Neon Postgres as a shared database through the Vercel API route `api/sync.js`.

### What it does

- On page load, the app tries to load the shared kennel data from `/api/sync`.
- When data changes, the app saves the merged state back to Neon.
- Users can also open **Data → Cloud Sync → Sync now**.
- Local browser storage stays as a fallback if the cloud API is unavailable.

### Required Vercel environment variables

Add these in Vercel under **Project Settings → Environment Variables**:

```text
DATABASE_URL=your Neon pooled or standard Postgres connection string
```

Optional:

```text
KENNEL_ACCESS_CODE=choose-a-simple-internal-code
```

If `KENNEL_ACCESS_CODE` is set, users must enter it under **Data → Cloud Sync** before syncing.

### How to deploy

1. Push the project to GitHub.
2. Connect the GitHub repository to Vercel.
3. Set the environment variables above.
4. Deploy.
5. Open the Vercel link in two different browsers and use **Data → Cloud Sync → Sync now**.

### Important limitations

This is shared-state sync, not yet a full multi-user database with row-level conflict handling. It is good for the first company test phase because several browsers can load and save the same shared kennel data. If two people edit the exact same record at the same time, the newest merged version may win. Keep JSON backups until the workflow has been tested in daily use.

## v17 notes: mobile menu and cloud deletion sync

This version improves shared cloud usage after real device testing:

- Deleted training sessions now create internal delete markers, so normal Cloud Sync should not bring deleted sessions back from Neon.
- Editing a training and removing dogs from it also marks the removed dog log entries as deleted for sync.
- Recent trainings are shown on Dashboard and Quick Training with direct Edit and Delete actions.
- The mobile More menu opens as a larger overlay instead of disappearing behind the scroll area.
- Data > Cloud Sync now separates normal Sync from a stronger "Force save this device to cloud" action.

For normal work, use **Sync now**. Use **Force save this device to cloud** only when the current device has the correct data and the cloud should be overwritten with that exact state.
