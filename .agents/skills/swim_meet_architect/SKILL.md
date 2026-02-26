---
name: Swim Meet Timer Architect
description: Core architecture, design system, and golden rules for the Swim Meet Timer monorepo.
---

# Swim Meet Timer Architect Skills Sheet

## Context & Goals
The Swim Meet Timer is a high-precision, mission-critical ecosystem designed to replace manual stopwatches and paper trails at competitive swim meets. It bridges the gap between pool-deck timing and the SwimTopia/Meet Maestro cloud environment.

* **Data Integrity:** Complete isolation of meet data via `meet_id`.
* **Operational Continuity:** "Offline-First" architecture for all deck-level interactions.
* **Auditability:** A permanent record of original vs. corrected times for legal/compliance review.

## Technical Stack
* **Frontend:** React 18, Vite, Tailwind CSS (Neumorphic Design).
* **Backend:** Node.js, Express.
* **Database:** SQLite via asynchronous `sqlite3` package (WAL Mode explicitly enabled via `PRAGMA journal_mode = WAL;`).
* **Real-Time:** 5s Polling (Dashboard) / 120s Polling (Sync Utility).
* **Offline:** Service Workers (PWA) + localStorage queuing.
* **Tooling:** pkg (Windows Executable bundling for the Maestro Sync bridge).
* **Downstream Integrations:** Supports direct SD3 (SwimTopia/Hy-Tek) binary file generation and CSV exports.
* **Maestro Cloud-to-Local Bridge:** The system relies on isolated Meet endpoints (`/api/sync/pending-files`) that serve JSON payloads to the custom Windows `maestro-sync.exe` utility, which acts as the physical bridge to the Meet Maestro file directory.

## The 'Golden Rules' for Logic
* **Millisecond Precision:** All race results must be stored as integers in milliseconds (`time_ms`). Never convert to strings (MM:SS.ss) until the final UI display layer.
* **Strict Multi-Tenancy:** Every query must include a `WHERE meet_id = ?` clause. Data "bleeding" between meets is a critical failure.
* **Auto-Advance Physics:** Heats and Events must increment based on the `session_summary` boundaries. If `Heat_current >= Heat_total_for_event`, then `Event = Event + 1` and `Heat = 1`. If Maestro is not connected, fallback to generic auto-increment (e.g., 5 heats per event).
* **Offline-First:** All API calls from the deck must be wrapped in a "Capture-and-Queue" helper that saves to `localStorage` if the network is unavailable.

## Data States & Edge Cases
* **No Shows & DQs:** Scratches/No Shows are stored with `time_ms: 0` and the `is_no_show: true` boolean. The UI must intercept this flag and explicitly render a "NO SHOW" badge, rather than reverting to a `00:00.00` fallback string.
* **Correction Auditing:** When an Admin edits a time in the dashboard, the *original* time must be shifted to the `raw_time` column to preserve the digital footprint for disputes.
* **Input Handling:** Any numeric input field (like Heat/Lane editing) must override the global Neumorphic rounded styles with an internal `inset` shadow to denote a writable field.

## UI Design System (Neumorphic Premium)
* **Viewport Strictness:** The Admin Dashboard must *always* be locked to `100vh` and `100vw` with `overflow-hidden`. The `<body>` tag must never scroll.
* **Independent Swim-Lanes:** The dual-column layout (30% Sidebar / 70% Content) handles its own localized scrolling using custom scrollbars (thin `#f25b2a` thumb, transparent track).
* **Physical Buttons:** Clickable elements (table rows, buttons) must utilize the `inset` shadow variant on `:active` and selection states to create physical compression into the Neumorphic material.

### Palette:
* **Base Background:** `#1b1d21` (Matte Charcoal).
* **Panel/Card Base:** `#282a2f` (Slate Grey).
* **Primary Accent:** Gradient `#f25b2a` to `#e83323` (Orange-Red).

### Shadow Tokens (Tailwind Arbitrary Values):
* **Outer Shadow:** `shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]`
* **Card Shadow:** `shadow-[8px_8px_16px_#0e0f11,-8px_-8px_16px_#363940]`
* **Button Shadow:** `shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940]`
* **Pushed/Inset:** `shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]`
* *Note: Do not use standard Tailwind shadow scales. Always use these exact custom physical tokens.*

### Typography & Structure:
* **UI Text:** 'Inter' (San-Serif).
* **Timing/Numeric:** 'JetBrains Mono' (Monospace).
* **Constraints:** All primary panels and cards must use `border-radius` between `24px` and `40px` (e.g., `rounded-[32px]`). No sharp corners anywhere.
* **Table UI:** Standard table borders are banned. Use alternating subtle opacity fills (`bg-[#1b1d21]/20`) for row separation.

## QA Protocols
* **The "Ghost Meet" Test:** Simulate 100 consecutive "Save & Next" operations to verify that the auto-increment logic never hangs or skips an event.
* **The "Tunnel" Test:** Disable the network tab in DevTools, record 5 times, re-enable the network, and verify the `localStorage` queue flushes correctly.
* **The "Admin Correction" Audit:** Verify that `raw_time` remains unchanged in the DB even after multiple Admin edits.
* **Sync Reliability:** Verify the Windows utility marks files as "synced" only after a successful local file-write to prevent data loss.
