# Triathlon Väst Dashboard

> Club results dashboard for Triathlon Väst — explore competition history, athlete rankings, and participation trends across 6 sports from 2021 to 2025.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

## Overview

An internal analytics dashboard for Triathlon Väst members. It aggregates CSV result files from club competitions (triathlon, duathlon, swimming, cycling, running, swimrun) spanning 2021–2025 and makes them searchable and visual. Athletes can look up their personal results, track rankings over time, and compare against the full field.

## Highlights

### Features

- **Overview tab**: Season-level participation trends and summary stats
- **Results tab**: Filter and browse all competition results by sport, year, and category
- **Athletes tab**: Individual athlete profiles with full result history and segment breakdowns
- **Rankings tab**: Club-wide leaderboard based on aggregated points across events
- **Bilingual UI**: Swedish / English toggle throughout

## Getting Started

### Prerequisites

- Node.js 20+

### Installation

```bash
git clone <repo-url>
cd triathlon-vast-dashboard-vercel
npm install
```

### Quick Start

```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
triathlon-vast-dashboard-vercel/
├── README.md
├── package.json
├── next.config.ts
├── data/                        # CSV result files (inputs, not edited manually)
│   ├── competitions.csv
│   ├── processed_triathlon_results_*.csv
│   └── ...
├── public/                      # Static assets
└── src/
    ├── app/                     # Next.js App Router (layout, page, globals)
    ├── components/
    │   ├── Dashboard.tsx        # Main shell with tab navigation
    │   ├── Header.tsx
    │   ├── LanguageProvider.tsx
    │   ├── charts/              # Recharts wrappers
    │   └── tabs/                # One component per tab
    └── lib/
        ├── loader.ts            # Server-side CSV parsing (PapaParse)
        ├── data.ts              # Query helpers over parsed data
        ├── types.ts             # Shared TypeScript types
        └── translations.ts      # EN/SV string catalogue
```

## Deployment

Deployed on Vercel. Push to `main` triggers an automatic production deploy. CSV data files are bundled at build time — update `data/` and redeploy to refresh results.

## License

© Triathlon Väst. All rights reserved. Private internal tool — not for redistribution.
