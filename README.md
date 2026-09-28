# Patient Risk Monitoring System

A web app that captures patient data, calculates clinical risk with a deterministic rule-based
engine, and keeps a full audit history of every change.

## Tech stack
Plain HTML, CSS and JavaScript (no framework, no build step).
Chart.js and pdf.js are loaded from a CDN, so an internet connection is needed for the dashboard
charts and PDF upload.

## Setup and run
1. Clone or download this repository.
2. Open `index.html` in Chrome, Edge or Firefox.
   (Optional local server: `python -m http.server 8000`, then visit http://localhost:8000)

No installation, environment variables or build commands are needed.

## Database configuration
There is **no separate database server**. Data is persisted in the browser's `localStorage`
(key `prm_patients`) through `js/storage.js`. To reset all data, run `localStorage.clear()` in
the browser console and reload.

## Seed / sample data
On first run, four sample patients are created automatically (only if storage is empty):
- **Sarah Jenkins**: the worked example from the brief (score 6, HIGH)
- **Ramesh Iyer**: LOW
- **Fatima Noor**: MEDIUM
- **Priya Menon**: low score, but HR > 140 triggers the critical escalation, so HIGH

## Project structure
- `index.html`: the three screens (Dashboard, Patient List, Patient Entry/Details with Audit Log)
- `css/style.css`: styling
- `js/riskEngine.js`: scoring engine, pure logic with no UI or storage code
- `js/storage.js`: persistence (localStorage) and audit-trail diffing
- `js/pdfParser.js`: rule-based (regex) text extraction from PDFs
- `js/app.js`: UI rendering and event handling

## Features fully implemented
- Manual entry of demographics, vitals, medical history, lab indicators and notes, with validation
- PDF upload (drag and drop or click) that auto-fills the form using rule-based extraction; the
  user reviews and corrects before saving
- Risk scoring exactly per the scoring table, LOW / MEDIUM / HIGH classification, and the
  Critical Escalation Protocol (SpO2 < 85, systolic BP < 80, HR > 140 always give HIGH)
- Risk is always system-calculated; there is no input anywhere to set it manually
- Any edit triggers automatic recalculation; the risk display updates live while typing
- Dashboard: total patients, high-risk count, admissions in the last 7 days, risk distribution
  chart and a 7-day trend chart of HIGH-risk events
- Patient list with colour-coded risk badges, expandable quick view and edit mode
- Audit log per patient: timestamped timeline, previous vs new value for every changed field,
  and risk level/score after each update (including "Risk moved from X to Y")
- Risk engine is decoupled from the UI (no DOM or storage access inside `riskEngine.js`)

## Not completed / known limitations
- **No SQL/NoSQL database server**: persistence uses browser localStorage instead (single browser,
  single user). All data access is isolated in `js/storage.js`, so it could be swapped for a
  server-side database without touching the risk engine or UI.
- **PDF extraction is best-effort regex**: it handles common label formats (for example
  `HR: 102`, `BP: 110/70`, `SpO2: 91%`) but not unusual report layouts. Scanned/image-only PDFs
  are not supported (no OCR). The review step before saving is mandatory for this reason.
- **7-day trend chart** is built from the audit log timestamps recorded by this app, not from
  imported historical data.
- No authentication or multi-user support, and no automated test suite.
