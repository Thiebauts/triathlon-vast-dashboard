#!/usr/bin/env python3
"""
Extra (non-KM) event results retriever — timed training sessions and other
events that are not official club championships (e.g. the Rådasjön SuperSprint
triathlon trainings).

Differences from retrieve_event_results.py (the KM pipeline):
- Output goes to ../data/extra/ and the event is registered in
  ../data/extra/events.json — the manifest the dashboard's Extra Events tab
  reads. Edit the manifest afterwards to polish the EN/SV titles or location.
- Participants may complete only some legs (e.g. swim + run without the bike).
  Each segment is computed only when both bounding checkpoints were recorded;
  rows missing one or more segments get Status 'partial', no total time, and
  no rank (a partial wall-clock total would include idle time between legs).
- Participants with no recorded times at all are excluded.
- No club points apply to these events, so ranks are informational only.

Usage (run from the nytatime/ directory):
    python3 retrieve_extra_event_results.py <race_id> <format> [access_token]

Example:
    python3 retrieve_extra_event_results.py jj6c3TnjKrhLnAtpo triathlon

Formats supported:
    triathlon       — four intermediate mats (Sim IN / Cykel UT / Cykel IN / Löp UT)
    triathlon-kids  — the children's KM course: two mats only (Sim IN and the
                      transition-area mat), mass start, finish time official
"""

import json
import os
import sys
from pathlib import Path

import pandas as pd

from nytatime_api import NytatimeAPI, format_time, fix_encoding_issues, determine_club_name
from retrieve_event_results import load_dotenv

# Known misspellings in NyTaTime profiles, mapped to the canonical spelling
# used across the data/ CSVs (a different spelling fragments the athlete's
# profile in the dashboard).
NAME_CORRECTIONS = {
    'Christian Salgueiro frödeberg': 'Christian Salgueiro Frödeberg',
    'Charlie hellberg': 'Charlie Hellberg',
}

# Segment layout per format. Checkpoints are cumulative times since the class
# start: [seg1 end, T1 end, seg2 end, T2 end]; the finish time is raceTime.
FORMAT_CONFIGS = {
    'triathlon': {
        'segments': ['Swim', 'T1', 'Bike', 'T2', 'Run'],
        'description': 'Triathlon (Swim-Bike-Run)',
        'compute': 'four_checkpoints',
        # Training sessions are à la carte: only an athlete with every segment
        # measured gets a total time and a rank (see module docstring).
        'finisher': 'all_segments',
    },
    'triathlon-kids': {
        'segments': ['Swim', 'Bike', 'Run'],
        'description': "Children's triathlon (Swim-Bike-Run, transitions inside the bike leg)",
        'compute': 'kids_two_checkpoints',
        # A championship with a mass start: everyone rides the same full course,
        # so a finish read is what makes the result official.
        'finisher': 'finish_time',
        # Written to the CSV name and the manifest: the dashboard renders this
        # event with the normal triathlon columns, and the untimed T1/T2 ones
        # simply stay empty.
        'manifest_format': 'triathlon',
    },
}


def assign_ranks(complete):
    """Assign Overall_Rank and Class_Rank over ranked finishers.

    Competition ranking, same convention as the KM data: tied times share a
    rank (1, 1, 3, ...). `complete` must already be sorted by total time.
    """
    for i, result in enumerate(complete):
        if i > 0 and result['Total_Time_Seconds'] == complete[i - 1]['Total_Time_Seconds']:
            result['Overall_Rank'] = complete[i - 1]['Overall_Rank']
        else:
            result['Overall_Rank'] = i + 1
    by_class = {}
    for result in complete:
        by_class.setdefault(result['Class'], []).append(result)
    for class_results in by_class.values():
        for i, result in enumerate(class_results):
            if i > 0 and result['Total_Time_Seconds'] == class_results[i - 1]['Total_Time_Seconds']:
                result['Class_Rank'] = class_results[i - 1]['Class_Rank']
            else:
                result['Class_Rank'] = i + 1


def assert_csv_safe(results):
    """Refuse to write fields the dashboard cannot parse.

    The dashboard's CSV parser is a plain comma split with no quote handling
    (fine for author-controlled data) — a comma, quote, or newline in any
    field would silently shift that row's columns. Extra events are open to
    anyone, so guest club names are not under our control.
    """
    for result in results:
        for key, value in result.items():
            s = str(value)
            if any(ch in s for ch in (',', '"', '\n', '\r')):
                sys.exit(
                    f"❌ {result['Name']}: field {key}={s!r} contains a comma/quote/newline — "
                    "the dashboard CSV parser cannot handle quoted fields. "
                    "Clean the value in NyTaTime and re-run."
                )


def compute_segments(splits, race_time):
    """Compute per-segment seconds from cumulative checkpoint times.

    A segment is included only when both its bounding checkpoints were
    recorded, so athletes who skipped a leg simply lack that segment instead
    of getting a negative or absurd time.

    Args:
        splits: Cumulative checkpoint seconds [seg1_end, t1_end, seg2_end, t2_end].
        race_time: Finish time in seconds since class start (0 if no finish).

    Returns:
        Dict of segment name -> seconds, containing only measured segments.
    """
    s = (list(splits) + [0, 0, 0, 0])[:4]
    seg = {}
    if s[0] > 0:
        seg['Swim'] = s[0]
    if s[0] > 0 and s[1] > s[0]:
        seg['T1'] = s[1] - s[0]
    if s[1] > 0 and s[2] > s[1]:
        seg['Bike'] = s[2] - s[1]
    if s[2] > 0 and s[3] > s[2]:
        seg['T2'] = s[3] - s[2]
    if s[3] > 0 and race_time > s[3]:
        seg['Run'] = race_time - s[3]
    return seg


def compute_segments_kids(splits, race_time):
    """Compute Swim/Bike/Run for the children's championship course.

    The kids' race is timed with two intermediate mats only — 'Sim In' at the
    end of the swim and one mat at the transition area — so T1 and T2 are never
    measured and fall inside the bike leg. Reads at the transition area land on
    either the 'Löp Ut' or the 'Cykel In' channel; both mats sit at the same
    physical point on this course, so either one is accepted.

    Args:
        splits: Cumulative checkpoint seconds [Sim In, Cykel Ut, Cykel In, Löp Ut].
        race_time: Finish time in seconds since class start (0 if no finish).

    Returns:
        Dict of segment name -> seconds, containing only measured segments.
    """
    s = (list(splits) + [0, 0, 0, 0])[:4]
    swim_end = s[0]
    transition = s[3] or s[2]
    seg = {}
    if swim_end > 0:
        seg['Swim'] = swim_end
    if swim_end > 0 and transition > swim_end:
        seg['Bike'] = transition - swim_end
    if transition > 0 and race_time > transition:
        seg['Run'] = race_time - transition
    return seg


COMPUTE_SEGMENTS = {
    'four_checkpoints': compute_segments,
    'kids_two_checkpoints': compute_segments_kids,
}


def process_extra_event(api, race_id, event_format):
    """Fetch and normalise results for one extra event.

    Returns:
        (results, race_data): list of CSV-ready row dicts and the race info.
    """
    config = FORMAT_CONFIGS[event_format]
    compute = COMPUTE_SEGMENTS[config['compute']]
    rank_on_finish_time = config['finisher'] == 'finish_time'
    print(f"🏁 Processing {config['description']} extra event...")

    race_data = None
    for race in api.get_all_races() or []:
        if race.get('_id') == race_id:
            race_data = race
            break
    if not race_data:
        print("❌ Could not find race in accessible races list")
        return [], {}

    print(f"📋 Race: {fix_encoding_issues(race_data.get('name', 'Unknown'))}")
    print(f"📅 Date: {race_data.get('date', 'Unknown')}")

    participants = api.get_race_participants(race_id)
    if not participants:
        print("⚠️  No participant data available for this race")
        return [], race_data

    classes = api.get_race_classes(race_id) or []
    class_dict = {cls['_id']: fix_encoding_issues(cls['name']) for cls in classes}

    segments = config['segments']
    complete, partial = [], []

    for participant in participants:
        name = fix_encoding_issues(participant.get('name', 'Unknown')).strip()
        name = NAME_CORRECTIONS.get(name, name)

        splits = participant.get('splitTimesv2', []) or participant.get('splits', [])
        split_times = [s['time'] if isinstance(s, dict) else s for s in splits]
        race_time = participant.get('raceTime', 0) or 0
        segment_times = compute(split_times, race_time)

        if not segment_times and not (rank_on_finish_time and race_time > 0):
            print(f"  ⚠️  Skipping {name}: no recorded times")
            continue

        if rank_on_finish_time:
            # A missed intermediate mat costs the athlete a split, not their
            # placing: the finish read is what makes the result official.
            is_complete = race_time > 0
        else:
            is_complete = all(seg in segment_times for seg in segments)
        status = 'ok' if is_complete else 'partial'
        if status == 'partial':
            done = ' + '.join(seg for seg in segments if seg in segment_times)
            hint = (f"; finish recorded at {format_time(race_time)} — verify the legs were "
                    "truly skipped and not a missed chip read" if race_time > 0 else "")
            print(f"  ℹ️  Partial: {name} ({done}) — listed unranked{hint}")
        elif len(segment_times) < len(segments):
            missing = ' + '.join(seg for seg in segments if seg not in segment_times)
            print(f"  ℹ️  {name}: ranked on finish time, no {missing} split "
                  "(intermediate mat not read)")

        result = {
            'Name': name,
            'Bib': participant.get('bib', ''),
            'Class': class_dict.get(participant.get('class_id'), 'Unknown'),
            'Club': determine_club_name(participant.get('club', '')),
            'Total_Time': format_time(race_time) if is_complete else '',
            'Total_Time_Seconds': round(race_time, 1) if is_complete else 0,
            'Status': status,
        }
        for seg in segments:
            if seg in segment_times:
                result[f'{seg}_Time'] = format_time(segment_times[seg])
                result[f'{seg}_Seconds'] = round(segment_times[seg], 1)
            else:
                result[f'{seg}_Time'] = ''
                result[f'{seg}_Seconds'] = 0
        (complete if is_complete else partial).append(result)

    # Finishers ranked by total time; partial participants follow, unranked,
    # ordered by name.
    complete.sort(key=lambda r: r['Total_Time_Seconds'])
    partial.sort(key=lambda r: r['Name'])

    assign_ranks(complete)
    for result in partial:
        result['Overall_Rank'] = ''
        result['Class_Rank'] = ''

    results = complete + partial
    print(f"✅ Processed {len(results)} results ({len(complete)} ranked, {len(partial)} partial)")
    return results, race_data


def update_manifest(extra_dir, csv_name, race_data, manifest_format):
    """Insert or replace this event's entry in events.json (newest first)."""
    manifest_path = extra_dir / 'events.json'
    manifest = []
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    race_name = fix_encoding_issues(race_data.get('name', 'Unknown')).strip()
    race_id = race_data.get('_id')
    date = (race_data.get('date') or '')[:10]
    entry = {
        'file': csv_name,
        'race_id': race_id,
        'date': date,
        'format': manifest_format,
        'title': {'en': race_name, 'sv': race_name},
    }

    # Match by race id so a corrected date in NyTaTime updates the existing
    # entry (new file name) instead of leaving a duplicate event behind.
    existing = next(
        (e for e in manifest if e.get('race_id') == race_id or e.get('file') == csv_name),
        None,
    )
    if existing:
        old_file = existing.get('file')
        if old_file != csv_name:
            print(f"   ⚠️  Race date changed — manifest now points to {csv_name}; "
                  f"delete the stale CSV data/extra/{old_file}.")
        # Keep manually edited titles/location; only refresh the basics.
        existing.update({'file': csv_name, 'race_id': race_id, 'date': date, 'format': manifest_format})
    else:
        manifest.append(entry)

    manifest.sort(key=lambda e: e.get('date', ''), reverse=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8',
    )
    print(f"   📒 Manifest: {manifest_path}")
    if not existing:
        print("   ✏️  Default titles written — edit events.json to set EN/SV titles, location,")
        print("       and an optional EN/SV 'description' (event context shown above the results).")


def save_results(results, race_data, event_format):
    """Write the processed CSV into ../data/extra/ and update the manifest."""
    assert_csv_safe(results)
    race_date = (race_data.get('date') or '')[:10]
    script_dir = Path(__file__).parent
    extra_dir = script_dir.parent / 'data' / 'extra'
    extra_dir.mkdir(parents=True, exist_ok=True)

    # Import layouts that share a display format (e.g. triathlon-kids) are
    # named and listed as that format — it is what the dashboard renders.
    display_format = FORMAT_CONFIGS[event_format].get('manifest_format', event_format)
    csv_name = f"processed_{display_format}_results_{race_date}.csv"
    csv_path = extra_dir / csv_name
    pd.DataFrame(results).to_csv(csv_path, index=False, encoding='utf-8')

    print(f"\n💾 Results saved:")
    print(f"   📄 CSV: {csv_path}")
    update_manifest(extra_dir, csv_name, race_data, display_format)

    ranked = [r for r in results if r['Status'] == 'ok']
    print(f"\n🏆 TOP 3:")
    for r in ranked[:3]:
        print(f"   {r['Overall_Rank']}. {r['Name']} ({r['Class']}) - {r['Total_Time']}")
    print(f"\n✅ Done. Commit data/extra/ and the dashboard will pick it up on the next build.")
    return csv_path


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    race_id = sys.argv[1]
    event_format = sys.argv[2].lower()
    if event_format not in FORMAT_CONFIGS:
        print(f"❌ Unsupported format: {event_format}")
        print(f"   Supported: {', '.join(FORMAT_CONFIGS.keys())}")
        sys.exit(1)

    if len(sys.argv) >= 4:
        access_token = sys.argv[3]
    else:
        load_dotenv()
        access_token = os.getenv('NYTATIME_TOKEN')
    if not access_token:
        print("❌ No access token provided. Add NYTATIME_TOKEN to nytatime/.env.")
        sys.exit(1)

    api = NytatimeAPI(access_token)
    results, race_data = process_extra_event(api, race_id, event_format)
    if not results:
        print("❌ No results found")
        sys.exit(1)

    save_results(results, race_data, event_format)


if __name__ == '__main__':
    main()
