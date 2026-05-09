#!/usr/bin/env python3
"""
One-command fetch: refresh a race's results by year + event type.

Loads NYTATIME_TOKEN from nytatime/.env (gitignored), looks up the matching
race in your Nytatime races list, and writes the processed CSV into ../data/.

Usage:
    python3 fetch.py <year> <event_type>

Examples:
    python3 fetch.py 2026 cycling
    python3 fetch.py 2025 triathlon

Event types: triathlon, duathlon, running, cycling, swimming, swimrun

If the lookup is ambiguous, the script lists the candidates and exits — pass
the race id directly to retrieve_event_results.py in that case.
"""

import sys

from nytatime_api import NytatimeAPI, fix_encoding_issues
from retrieve_event_results import (
    EVENT_CONFIGS,
    load_dotenv,
    process_event_results,
    save_and_summarize,
)
import os

# Keywords that identify each event type inside the Swedish race name.
# The "i" segmentation is needed for triathlon because every Triathlon Väst KM
# race name starts with "Triathlon Västs Klubbmästerskap i ...".
SPORT_KEYWORDS = {
    'triathlon': ['triathlon'],
    'duathlon':  ['duathlon'],
    'running':   ['löpning', 'lopning', 'running'],
    'cycling':   ['cykling', 'cycling'],
    'swimming':  ['simning', 'swimming'],
    'swimrun':   ['swimrun'],
}


def find_races(api, year, event_type):
    races = api.get_all_races() or []
    keywords = SPORT_KEYWORDS[event_type]
    matches = []
    for r in races:
        date = r.get('date') or ''
        if not date.startswith(year):
            continue
        name = fix_encoding_issues(r.get('name', '') or '').lower()
        if event_type == 'triathlon':
            tail = name.split(' i ', 1)[-1] if ' i ' in name else name
            if 'triathlon' not in tail:
                continue
        else:
            if not any(k in name for k in keywords):
                continue
        matches.append(r)
    return matches


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    year = sys.argv[1]
    event_type = sys.argv[2].lower()

    if not (year.isdigit() and len(year) == 4):
        print(f"❌ Invalid year: {year} (expected 4-digit, e.g. 2026)")
        sys.exit(1)
    if event_type not in EVENT_CONFIGS:
        print(f"❌ Unsupported event type: {event_type}")
        print(f"   Supported: {', '.join(EVENT_CONFIGS.keys())}")
        sys.exit(1)

    load_dotenv()
    token = os.getenv('NYTATIME_TOKEN')
    if not token:
        print("❌ NYTATIME_TOKEN not set. Add it to nytatime/.env (see .env.example).")
        sys.exit(1)

    api = NytatimeAPI(token)
    print(f"🔎 Looking up {event_type} {year}...")
    candidates = find_races(api, year, event_type)

    if not candidates:
        print(f"❌ No {event_type} race found in {year}.")
        sys.exit(1)
    if len(candidates) > 1:
        print(f"⚠️  Multiple matches — pass the race id directly to retrieve_event_results.py:")
        for r in candidates:
            print(f"   - {r.get('_id')}  {r.get('date')}  {fix_encoding_issues(r.get('name', ''))}")
        sys.exit(1)

    race = candidates[0]
    race_id = race.get('_id')
    print(f"✅ Match: {fix_encoding_issues(race.get('name', ''))} ({race.get('date')}) — {race_id}")

    results, race_info = process_event_results(api, race_id, event_type)
    if not results:
        print("❌ No results found")
        sys.exit(1)

    save_and_summarize(results, race_info, event_type)


if __name__ == "__main__":
    main()
