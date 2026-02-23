# Swim Meet Timer — Design System

## Overview

Two visual contexts:

- **Admin / Control** — Admin Dashboard, Maestro Upload. Minimal, modern “control center”: neutral palette, subtle accents, clean spacing, structured layout.
- **Outdoor / Timer** — Timer and Officials. High-contrast for bright sunlight: large typography, bold contrast, simple shapes. Large Start/Stop remains the primary CTA.

## Color Tokens

### Admin (control center)

| Token           | Usage                    | Value        |
|----------------|--------------------------|--------------|
| `admin-bg`     | Page background          | Neutral 950  |
| `admin-surface`| Cards, panels, sidebar   | Neutral 900  |
| `admin-border` | Dividers, card borders   | Neutral 800  |
| `admin-muted`  | Secondary text, labels   | Neutral 500  |
| `admin-text`   | Primary text             | Neutral 200  |
| `admin-accent` | Links, primary actions  | Teal 400     |
| `admin-accent-hover` | Button hover       | Teal 300     |

### Outdoor (timer / officials)

| Token            | Usage              | Value        |
|------------------|--------------------|--------------|
| `outdoor-bg`     | Page background    | Black        |
| `outdoor-surface` | Inputs, panels     | Near-black   |
| `outdoor-text`   | Primary text       | White        |
| `outdoor-muted`  | Secondary text     | Neutral 400  |
| `outdoor-cta-start`  | Start / primary CTA | Cyan or Yellow |
| `outdoor-cta-stop`   | Stop               | Red 500      |
| `outdoor-cta-save`   | Save & Next        | Yellow/Amber |

## Spacing Scale

Use a consistent scale (Tailwind default 4px base). Prefer:

- **xs** `0.5` (2px) — tight gaps
- **sm** `2` (8px) — inline spacing
- **md** `4` (16px) — section padding, gaps
- **lg** `6` (24px) — between major blocks
- **xl** `8` (32px) — page margins, large gaps
- **2xl** `10`–`12` — hero spacing

## Typography

### Admin

- **Font**: System UI or Inter (sans). Monospace only for codes/numbers.
- **Page title**: `text-2xl font-semibold tracking-tight`
- **Section title**: `text-sm font-semibold uppercase tracking-wider text-admin-muted`
- **Body**: `text-sm` / `text-base`
- **Code/PIN**: `font-mono text-admin-accent font-semibold`

### Outdoor

- **Font**: JetBrains Mono (or similar) for clarity.
- **Timer display**: `text-[5rem]–text-[6rem] font-black tabular-nums`
- **Primary CTA label**: `text-2xl–text-3xl font-black tracking-widest uppercase`
- **Labels**: `text-xs font-bold uppercase tracking-wider`
- **High contrast**: Prefer bold weights and uppercase for critical labels.

## Components

- **Button** — Variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`. Outdoor: `cta` (large Start/Stop).
- **Panel** — Card container with border and padding; admin uses `admin-surface` + `admin-border`.
- **HeaderBar** — Top bar with title and actions; admin uses minimal style.
- **TimerDisplay** — Large monospace time; outdoor only, high contrast.
- **UploadCard** — Maestro upload area: title, file inputs, status, actions.

Use design tokens (Tailwind classes mapped to the tokens above) in these components so Admin vs Outdoor is a matter of which tokens/classes are applied (e.g. wrapper class or variant).

## Applying to Other Pages

1. **Admin Maestro** — Wrap in same admin layout as dashboard; use `HeaderBar`, `Panel`, `Button`, `UploadCard`; stick to admin color tokens and spacing.
2. **Timer** — Use `TimerDisplay`, outdoor CTA button, outdoor tokens; keep large Start/Stop as single primary action.
3. **Officials** — Same outdoor tokens and typography; reuse `Button` (e.g. danger for Submit DQ), `Panel` for DQ form; keep layout simple and high contrast.

Keep all UI changes modular: one component per file, tokens in Tailwind/theme, no duplicated layout logic.
