#!/usr/bin/env python3
"""
One-command fetch for extra (non-KM) events: look up the race by year and a
name keyword, then retrieve and save its results like
retrieve_extra_event_results.py does.

Loads NYTATIME_TOKEN from nytatime/.env (gitignored).

Usage:
    python3 fetch_extra.py <year> <keyword> [format]

Examples:
    python3 fetch_extra.py 2026 supersprint
    python3 fetch_extra.py 2026 "supersprint training #3"

Format defaults to 'triathlon'. If the keyword matches several races, the
candidates are listed — re-run with a more specific keyword or pass the race
id directly to retrieve_extra_event_results.py.
"""

import os
import sys

from nytatime_api import NytatimeAPI, fix_encoding_issues
from retrieve_event_results import load_dotenv
from retrieve_extra_event_results import FORMAT_CONFIGS, process_extra_event, save_results


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    year = sys.argv[1]
    keyword = sys.argv[2].lower()
    event_format = sys.argv[3].lower() if len(sys.argv) >= 4 else 'triathlon'

    if not (year.isdigit() and len(year) == 4):
        print(f"❌ Invalid year: {year} (expected 4-digit, e.g. 2026)")
        sys.exit(1)
    if event_format not in FORMAT_CONFIGS:
        print(f"❌ Unsupported format: {event_format}")
        print(f"   Supported: {', '.join(FORMAT_CONFIGS.keys())}")
        sys.exit(1)

    load_dotenv()
    token = os.getenv('NYTATIME_TOKEN')
    if not token:
        print("❌ NYTATIME_TOKEN not set. Add it to nytatime/.env (see .env.example).")
        sys.exit(1)

    api = NytatimeAPI(token)
    print(f"🔎 Looking up '{keyword}' in {year}...")
    matches = [
        r for r in (api.get_all_races() or [])
        if (r.get('date') or '').startswith(year)
        and keyword in fix_encoding_issues(r.get('name', '') or '').lower()
    ]

    if not matches:
        print(f"❌ No race matching '{keyword}' found in {year}.")
        sys.exit(1)
    if len(matches) > 1:
        print("⚠️  Multiple matches — be more specific or pass the race id to retrieve_extra_event_results.py:")
        for r in matches:
            print(f"   - {r.get('_id')}  {r.get('date')}  {fix_encoding_issues(r.get('name', ''))}")
        sys.exit(1)

    race = matches[0]
    print(f"✅ Match: {fix_encoding_issues(race.get('name', ''))} ({race.get('date')}) — {race.get('_id')}")

    results, race_data = process_extra_event(api, race.get('_id'), event_format)
    if not results:
        print("❌ No results found")
        sys.exit(1)

    save_results(results, race_data, event_format)


if __name__ == '__main__':
    main()
