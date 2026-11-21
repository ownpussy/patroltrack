# PatrolTrack

A lightweight, client-side web app for daily testing of security patrol operations and personal location history tracking.

**Inspired by:**
- [THERMS](https://www.therms.io) — security guard scheduling, patrol checkpoints, incident reporting, GPS tracking, DARs.
- [Dawarich](https://dawarich.app) — private location history, map trails, visits, stats, and visualization.

## Features

- Clock in / clock out (on-duty tracking)
- Interactive map (Leaflet + OpenStreetMap) with live position and full trail
- Scan checkpoints (with notes)
- Log incidents (with notes)
- Automatic background location points while on duty (configurable interval)
- Activity log with timestamps and coordinates
- Basic stats (distance, counts, days active)
- Daily activity report you can copy
- All data stored in browser localStorage (private to your device)
- Export full history as JSON

## How to use

1. Open the app (GitHub Pages link or local).
2. Allow location permission.
3. Clock In to start a shift.
4. Use "Scan Checkpoint" or "Log Incident" as needed.
5. Optional: set auto-track interval.
6. Switch tabs to review log, stats, or generate today's report.
7. Data persists across sessions in this browser.

## Running it

### Option A — GitHub Pages (recommended for daily access)

1. Go to the repository **Settings → Pages**.
2. Source: Deploy from a branch.
3. Branch: `main` / `/ (root)`.
4. Save. After a minute the site will be at:  
   `https://ownpussy.github.io/patroltrack/`

### Option B — Local

Just open `index.html` in a browser (or use a simple static server).

## Notes

- This is a pure frontend prototype for personal daily testing. No server, no accounts, no sync between devices.
- Location requires HTTPS (GitHub Pages provides it) or localhost.
- Accuracy depends on your device’s GPS.
- Clear All Data removes everything from localStorage.

Built for quick iteration and daily use. Feel free to fork and extend.
