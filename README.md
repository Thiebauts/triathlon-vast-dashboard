# Triathlon Väst Dashboard

> Club results dashboard for Triathlon Väst — explore competition history, athlete rankings, and participation trends across 6 sports from 2021 to 2025.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38bdf8)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

## Overview

An internal analytics dashboard for Triathlon Väst members. It aggregates CSV result files from club competitions (triathlon, duathlon, swimming, cycling, running, swimrun) spanning 2021–2025 and makes them searchable and visual. Athletes can look up their personal results, track rankings over time, and compare against the full field.

The dataset currently covers **25 competitions** across 6 sports (triathlon, duathlon, swimming, cycling, running, swimrun) from **2021–2025**, including 1 swimrun event added in 2025.

## Highlights

### Features

- **Overview tab**: Season-level participation trends and summary stats
- **Results tab**: Filter and browse all competition results by sport, year, and category
- **Athletes tab**: Individual athlete profiles with full result history and segment breakdowns
- **Rankings tab**: Club-wide leaderboard based on aggregated points across events
- **Bilingual UI**: Swedish / English toggle throughout

## Tech Stack

| Tool | Version |
|------|---------|
| Next.js | 16.1 |
| React | 19.2 |
| Recharts | 3.8 |
| PapaParse | 5.5 |
| Tailwind CSS | 4.x |
| Playwright | 1.58 |

## Getting Started

### Prerequisites

- Node.js 20+

### Installation

```bash
git clone --recurse-submodules https://github.com/Thiebauts/triathlon-vast-dashboard.git
cd triathlon-vast-dashboard
npm install
```

> **Note:** The `data/` directory is a private Git submodule ([triathlon-vast-data](https://github.com/Thiebauts/triathlon-vast-data)). If you cloned without `--recurse-submodules`, run `git submodule update --init` to populate it.

### Quick Start

```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
triathlon-vast-dashboard/
├── CLAUDE.md                    # AI assistant context
├── README.md
├── package.json
├── next.config.ts
├── test-dashboard.mjs           # Smoke test script (Playwright)
├── data/                        # Private submodule (triathlon-vast-data)
│   └── processed_<sport>_results_<date>.csv
├── public/                      # Static assets (logo, favicon)
└── src/
    ├── app/                     # Next.js App Router
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   └── favicon.ico
    ├── components/
    │   ├── Dashboard.tsx        # Main shell with tab navigation
    │   ├── Header.tsx
    │   ├── LanguageProvider.tsx
    │   ├── charts/
    │   │   ├── AthleteCharts.tsx
    │   │   └── ParticipationChart.tsx
    │   └── tabs/
    │       ├── OverviewTab.tsx
    │       ├── ResultsTab.tsx
    │       ├── AthletesTab.tsx
    │       └── RankingsTab.tsx
    └── lib/
        ├── loader.ts            # Server-side CSV parsing (PapaParse)
        ├── data.ts              # Query helpers over parsed data
        ├── types.ts             # Shared TypeScript types
        └── translations.ts      # EN/SV string catalogue
```

## Data Entry Rules (NyTaTime)

When exporting results from NyTaTime, follow these rules to keep the data consistent:

**Names**
- Always use **full first name and surname** — no nicknames (e.g., "Tobias Olsson", not "Tobbe")
- Use **proper capitalization** for both first and last name (e.g., "Daniel Sastre", not "Daniel sastre")
- Keep surname particles lowercase: "van", "du", "de" (e.g., "Stijn van Weegberg")
- Use the **same spelling** consistently across seasons — check previous files if unsure

**Class (gender)**
- Only two values allowed: `Herr` or `Dam`
- Do not use: ~~Herrar~~, ~~Damer~~, ~~Man~~, ~~Male~~, ~~Female~~

**Club**
- Only two values allowed: `TriVäst` or `Gäst`
- Do not use: ~~Triväst~~, ~~Triathlon Väst~~, ~~Ej medlem~~, ~~-~~

**Times**
- If a split time was not captured, leave the field **empty** — do not enter `0` or a negative value

**Rankings**
- `Overall_Rank` must be sequential starting from 1
- `Class_Rank` must be sequential within each class (Herr and Dam ranked separately)

**Status**
- Only two values: `ok` or `dnf`

**General**
- No trailing whitespace in any field
- File encoding: **UTF-8**
- One empty line at end of file maximum

## Deployment

Deployed on Vercel. Push to `main` triggers an automatic production deploy. CSV data files live in a [private submodule](https://github.com/Thiebauts/triathlon-vast-data) and are bundled at build time — update the submodule and redeploy to refresh results.

## License

© Triathlon Väst. All rights reserved. Private internal tool — not for redistribution.
