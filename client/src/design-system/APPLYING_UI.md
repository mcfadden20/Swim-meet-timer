# Applying the Design System to Other Pages

## Summary

- **Admin Dashboard** — Refactored. Uses `admin-*` tokens, `Button`, `Panel`, `HeaderBar`, `StatusBanner`.
- **Admin Maestro** — Apply the same pattern below.
- **Timer** — Use `outdoor-*` tokens and keep the large Start/Stop CTA; optionally use `TimerDisplay` and `Button` variants `outdoor-cta` / `outdoor-stop` / `outdoor-save`.
- **Officials** — Same as Timer: outdoor tokens, high contrast, reuse `Button` and `Panel` where it fits.

---

## 1. Admin Maestro Page

**Goal:** Minimal, modern “control center” like the dashboard.

**Steps:**

1. **Layout shell**
   - Wrap the page in the same admin chrome:
     - Root: `className="w-full min-h-screen bg-admin-bg text-admin-text font-sans overflow-auto"`
     - Constrain width: `max-w-4xl mx-auto p-6 md:p-8`

2. **Header**
   - Use `<HeaderBar>` with title e.g. “Maestro Integration”, subtitle optional, and a “Refresh” `<Button variant="secondary">` as action.
   - Back link: use `<Button as="a" href="/admin" variant="ghost" size="sm">` with ArrowLeft icon.

3. **Cards**
   - “Initial Setup: Cloud Sync” → Use `<UploadCard>` with `title`, `description`, and optional `status` (success/error). Put the form (file inputs + submit button) in `children`. Use `<Button variant="primary">` for “Upload files”.
   - “Connection Status” and “Local Network Operation” → Use `<Panel>` with consistent padding. Section titles: `text-sm font-semibold text-admin-muted uppercase tracking-wider`.

4. **Buttons**
   - Primary actions: `<Button variant="primary">`.
   - Secondary (e.g. Refresh, Download bundle): `<Button variant="secondary">`.
   - Replace ad-hoc link/button styles with these.

5. **Colors**
   - Replace `navy-900` → `admin-bg`, `navy-800` → `admin-surface`, `border-navy-800` → `border-admin-border`, `text-cyan-400` → `text-admin-accent`, `text-slate-*` → `text-admin-muted` / `text-admin-text`.

---

## 2. Timer Page (TimerApp + Stopwatch)

**Goal:** High-contrast for outdoor sunlight; large Start/Stop remains the primary CTA.

**Steps:**

1. **Layout**
   - Keep full viewport, simple structure. Root: `bg-outdoor-bg text-outdoor-text font-mono`.

2. **Tokens**
   - Use `outdoor-*` colors: `outdoor-bg`, `outdoor-surface`, `outdoor-text`, `outdoor-muted`, `outdoor-cta-start`, `outdoor-cta-stop`, `outdoor-cta-save`, `outdoor-border`.

3. **Timer display**
   - Optionally use `<TimerDisplay value={formatTime(elapsedTime)} muted={isNoShow} />` for the big time. It uses `text-timer` and outdoor colors.

4. **Primary CTA**
   - Start: `<Button variant="outdoor-cta" size="cta" onClick={handleStart}>` with Play icon and “START”.
   - Stop: `<Button variant="outdoor-stop" size="cta" onClick={handleStop}>` with Pause icon and “STOP”.
   - Save & Next: `<Button variant="outdoor-save" size="cta" onClick={handleSaveAndNext}>` with Save icon and “SAVE & NEXT”.
   - Keep the same size and prominence (e.g. `min-h-[160px]`) so the big CTA stays.

5. **Secondary controls**
   - Event/Heat/Lane inputs: keep large, bold numbers; use `bg-outdoor-surface border-outdoor-border text-outdoor-text`. Labels: `text-xs font-bold uppercase text-outdoor-cta-start` (or `outdoor-muted`).
   - “Mark No Show” / “Reset”: `<Button variant="secondary">` with outdoor-friendly classes if needed, or small custom buttons with `outdoor-*` tokens.

6. **JoinMeet**
   - Same outdoor context: `bg-outdoor-bg`, `text-outdoor-text`. Primary button can use `variant="outdoor-cta"` or keep current high-contrast styling.

---

## 3. Officials Page

**Goal:** Same high-contrast, minimal layout; reuse components where useful.

**Steps:**

1. **Layout**
   - Root: `bg-outdoor-bg text-outdoor-text font-mono`. Max width for form: `max-w-md` already present is fine.

2. **Header**
   - Can use a simple header bar (back link + “Officials Mode” + meet name) with same spacing as Timer. No need for full `HeaderBar` unless you want consistency with admin; if so, use a minimal bar with back link and title.

3. **Form blocks**
   - Event/Heat/Lane row: same pattern as Timer (outdoor surface, bold numbers).
   - DQ selection card: `<Panel variant="outdoor">` or a div with `bg-outdoor-surface border-outdoor-border` and `border-red-500/50` for the DQ accent.
   - Official initials: same input style as other outdoor inputs.

4. **Submit DQ**
   - Use `<Button variant="danger" size="lg">` or a large custom button with `bg-outdoor-cta-stop` and big typography so it reads clearly in sunlight.

5. **Auth / no-meet screens**
   - Keep centered layout; use `outdoor-*` colors and a single clear CTA (e.g. “Return to Timer”) with `Button variant="outdoor-cta"` or `primary` depending on contrast preference.

---

## 4. Consistency Checklist

- **Admin:** Only `admin-*` tokens and sans (or system) font for body; mono for codes.
- **Timer/Officials:** Only `outdoor-*` tokens and mono font; large, bold type for key info and CTAs.
- **Components:** Prefer `Button`, `Panel`, `HeaderBar`, `TimerDisplay`, `UploadCard`, `StatusBanner` from `@/components/ui` (or relative path) instead of one-off styled divs/buttons.
- **Spacing:** Use the spacing scale (e.g. `gap-4`, `p-6`, `mb-4`) consistently; avoid arbitrary values unless needed.
- **JSX:** One component per file; extract repeated blocks (e.g. meet card, result row) into small components if they grow.

These steps keep the app modular and production-ready while applying the same design patterns across all four areas.
