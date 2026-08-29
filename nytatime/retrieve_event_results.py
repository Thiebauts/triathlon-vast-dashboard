#!/usr/bin/env python3
"""
Generic Event Results Retriever for Triathlon Väst KM Events.

Writes a CSV directly into ../data/ (the dashboard's input folder) so a fresh
result set becomes a one-step refresh: run this script, commit data/, push.

Usage (run from the nytatime/ directory):
    python3 retrieve_event_results.py <race_id> <event_type> [access_token]

Examples:
    python3 retrieve_event_results.py oFKCts95sE2c36XPp duathlon
    python3 retrieve_event_results.py JQdkcKx8TfibPuWqx triathlon YOUR_TOKEN

Event types supported: triathlon, duathlon, running, cycling, swimming, swimrun
"""

import sys
import os
import pandas as pd
from pathlib import Path
from nytatime_api import NytatimeAPI, format_time, fix_encoding_issues, determine_club_name


# Known NyTaTime name variants mapped to the canonical spelling used across the
# data/ CSVs. A different spelling — or a first-name-only registration — would
# otherwise fragment an athlete's cross-year profile in the dashboard. Mirrors
# NAME_CORRECTIONS in retrieve_extra_event_results.py. Keys are the name AFTER
# fix_encoding_issues + strip. The bare-first-name keys ('andre', 'Göran') are
# specific to known members — revisit if a namesake ever races.
NAME_CORRECTIONS = {
    'Marcelo Tognato Chiaverini': 'Marcelo Chiaverini',
    'andre': 'André du Rietz',
    'Göran': 'Göran Hilmersson',
    'Kornelia': 'Kornelia Krumkühler',
    'Tim suits': 'Tim Suits',
    'Alexander berggren': 'Alexander Berggren',
}

# Per-race fixes for fields NyTaTime holds wrong or blank, confirmed with the
# club. Keyed by race id so a re-fetch keeps them and no other race is touched;
# fix the entry upstream in NyTaTime and the override becomes a no-op.
RACE_OVERRIDES = {
    # Triathlon KM 2026 (Inseros): the club column was left empty for eight
    # entrants, and the relay team is registered under a team name only.
    '2iqikGzZZxBt5M7dA': {
        'date': '2026-08-29',  # race date never filled in in NyTaTime
        'clubs': {
            'Karl Wackerberg': 'TriVäst',
            'Jan Ljungcrantz': 'TriVäst',
            'Jonatan Hägerström': 'TriVäst',
            'Ida Stjernkvist': 'TriVäst',
            'Michael Kossenjans': 'TriVäst',
            'Jens Lejhall': 'TriVäst',
            'Rasmus Johansson': 'TriVäst',
            'Arvid Månesjö': 'Gäst',
        },
        'names': {
            # Swim / bike / run, in race order.
            'Staffet Gänget': 'Staffet Gänget (Adam Millberg / Josephine Flod / My Försberg)',
        },
    },
}

# TriVäst spellings that participants self-enter (case/format varies); collapse
# them to the canonical club label so the dashboard shows one consistent name
# and membership detection stays trivial. Mirrors CLUB_ALIASES in
# src/lib/data.ts. Real guest club names pass through untouched.
TRIVAST_ALIASES = {'triväst', 'tri väst', 'triathlon väst', 'triathväst', 'tv', 'medlem',
                   'trivästare'}


def canonical_club(club_field):
    """Normalise a raw club field: trim stray whitespace, then collapse known
    TriVäst spellings to the canonical label (real guest club names survive)."""
    club = determine_club_name(club_field).strip()
    return 'TriVäst' if club.lower() in TRIVAST_ALIASES else club


# Relay classes: a team splits the course between its members, so its time is
# not comparable with an individual's. Both NyTaTime spellings are matched.
RELAY_CLASSES = ('staffet', 'stafett', 'relay')


def ranks_overall(class_name):
    """Whether a class competes for an overall placing.

    Youth (Ungdom) and children (Barn) race a shorter course and relay teams
    share the course between three athletes, so all of them are ranked only
    within their own class — never given an overall rank against the
    full-distance individual field. Mirrors the Herr/Dam-only "all mixed" field
    in the dashboard's ResultsTab and racesOverall() in src/lib/data.ts.
    """
    c = (class_name or '').lower()
    if any(r in c for r in RELAY_CLASSES):
        return False
    return 'barn' not in c and 'ungdom' not in c and 'youth' not in c


def load_dotenv():
    """Tiny dependency-free loader for nytatime/.env. Existing env vars win."""
    env_path = Path(__file__).parent / '.env'
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def save_and_summarize(results, race_info, event_type):
    """Write the processed CSV into ../data/ and print a short summary.

    Returns the path to the written CSV.
    """
    df = pd.DataFrame(results)

    race_date = (race_info.get('date') or '').strip()[:10]
    if not race_date:
        sys.exit(
            "❌ This race has no date in NyTaTime, so the CSV would not carry one either.\n"
            "   Set the date on the race in NyTaTime and re-run, or add it to "
            "RACE_OVERRIDES for this race id."
        )

    script_dir = Path(__file__).parent
    csv_folder = script_dir.parent / 'data'
    csv_folder.mkdir(exist_ok=True)
    csv_path = csv_folder / f"processed_{event_type}_results_{race_date}.csv"
    df.to_csv(csv_path, index=False, encoding='utf-8')

    print(f"\n💾 Results saved:")
    print(f"   📄 CSV: {csv_path}")

    print(f"\n📊 {EVENT_CONFIGS[event_type]['description'].upper()} RESULTS SUMMARY")
    print(f"   Race: {race_info.get('name', 'Unknown')}")
    print(f"   Date: {race_info.get('date', 'Unknown')}")
    print(f"   Participants: {len(results)}")

    dnf_count = len([r for r in results if r['Status'] == 'dnf'])
    # Top 3 over the overall-ranked field only (youth/children carry no overall
    # rank, so they never headline the podium of the full-distance race).
    overall_ranked = sorted(
        (r for r in results if isinstance(r['Overall_Rank'], int)),
        key=lambda r: r['Overall_Rank'],
    )

    print(f"\n🏆 TOP 3 FINISHERS:")
    for r in overall_ranked[:3]:
        print(f"   {r['Overall_Rank']}. {r['Name']} ({r['Class']}) - {r['Total_Time']}")

    if dnf_count > 0:
        print(f"\n⚠️  DNF: {dnf_count} participants started but did not finish")

    print(f"\n🏅 CLASS WINNERS:")
    for class_name in sorted(df['Class'].unique()):
        class_finishers = df[(df['Class'] == class_name) & (df['Status'] == 'ok')]
        if len(class_finishers) > 0:
            w = class_finishers.iloc[0]
            print(f"   {class_name}: {w['Name']} - {w['Total_Time']}")
        else:
            print(f"   {class_name}: No finishers")

    print(f"\n✅ Done. Commit data/ and the dashboard will pick it up on the next build.")
    return csv_path

# Event type configurations
EVENT_CONFIGS = {
    'triathlon': {
        'segments': ['Swim', 'T1', 'Bike', 'T2', 'Run'],
        'expected_splits': 5,  # Start + 4 segments
        'description': 'Triathlon (Swim-Bike-Run)'
    },
    'duathlon': {
        'segments': ['Run1', 'T1', 'Bike', 'T2', 'Run2'],
        'expected_splits': 5,  # Start + 4 segments  
        'description': 'Duathlon (Run-Bike-Run)'
    },
    'running': {
        'segments': ['Run'],
        'expected_splits': 1,  # Start + finish
        'description': 'Running'
    },
    'cycling': {
        'segments': ['Bike'],
        'expected_splits': 1,  # Start + finish
        'description': 'Cycling'
    },
    'swimming': {
        'segments': ['Swim'],
        'expected_splits': 1,  # Start + finish
        'description': 'Swimming'
    },
    'swimrun': {
        'segments': ['Swim1', 'Run1', 'Swim2', 'Run2'],  # Can vary
        'expected_splits': 4,  # Flexible
        'description': 'Swimrun'
    }
}

def process_participant_splits(splits, event_type, race_time=None):
    """Process participant splits based on event type"""
    config = EVENT_CONFIGS.get(event_type, EVENT_CONFIGS['triathlon'])
    segments = config['segments']

    # Use splitTimesv2 if available, else fallback to splitTimes
    if splits and isinstance(splits[0], dict) and 'time' in splits[0]:
        split_times = [s['time'] for s in splits]
    else:
        split_times = splits if splits else []

    # Check if we have any meaningful split data (at least one non-zero split)
    if not split_times or all(s == 0 for s in split_times):
        return {seg: 0 for seg in segments}, {}, 0

    segment_times = {}
    split_times_formatted = {}

    if event_type == 'duathlon':
        # Duathlon timing points: Run1_end, T1_end(Bike_start), Bike_end, T2_end(Run2_start)
        # splitTimes = [Run1_end, T1_end, Bike_end, T2_end], then Run2 = total - T2_end
        if len(split_times) >= 4:
            # Handle case where first split might be 0 (missing Run1_end checkpoint)
            if split_times[0] == 0 and split_times[1] > 0:
                # Missing Run1 checkpoint, splits are: [0, T1_end, Bike_end, T2_end]
                # We can't separate Run1 and T1, so combine them
                segment_times['Run1'] = 0  # Unknown
                segment_times['T1'] = 0    # Unknown  
                segment_times['Bike'] = split_times[2] - split_times[1]
                segment_times['T2'] = split_times[3] - split_times[2]
                total_race_time = race_time if race_time else split_times[-1]
                segment_times['Run2'] = total_race_time - split_times[3]

                # Use combined Run1+T1 time
                run1_t1_combined = split_times[1]
                
                split_times_formatted.update({
                    'Run1_In': '',  # Unknown
                    'T1': '',       # Unknown
                    'Bike_Out': format_time(split_times[1]),
                    'Bike_In': format_time(split_times[2]),
                    'T2': format_time(segment_times['T2']),
                    'Run2_Out': format_time(split_times[3])
                })
                
                # Set Run1 as the combined time minus estimated T1 (assume ~1 min transition)
                estimated_t1 = 60  # 1 minute estimate
                segment_times['Run1'] = max(0, run1_t1_combined - estimated_t1)
                segment_times['T1'] = min(run1_t1_combined, estimated_t1)
                
            elif split_times[3] == 0 and split_times[2] > 0:
                # Missing T2_end checkpoint: T2 and Run2 can't be separated, so
                # keep T2 unknown and put the combined time in Run2 instead of
                # computing a negative T2 (mirrors the missing-Run1 handling
                # above). Flagged so the CSV can be reviewed before publishing.
                print("  ⚠️  Missing T2 checkpoint for a participant — "
                      "T2/Run2 left combined in Run2; review the CSV.")
                segment_times['Run1'] = split_times[0]
                segment_times['T1'] = split_times[1] - split_times[0]
                segment_times['Bike'] = split_times[2] - split_times[1]
                segment_times['T2'] = 0  # not recorded
                total_race_time = race_time if race_time else split_times[2]
                segment_times['Run2'] = max(0, total_race_time - split_times[2])

                split_times_formatted.update({
                    'Run1_In': format_time(split_times[0]),
                    'T1': format_time(segment_times['T1']),
                    'Bike_Out': format_time(split_times[1]),
                    'Bike_In': format_time(split_times[2]),
                    'T2': '',  # unknown
                    'Run2_Out': format_time(split_times[2]),
                })

            else:
                # Normal case: all checkpoints recorded [Run1_end, T1_end, Bike_end, T2_end]
                segment_times['Run1'] = split_times[0]
                segment_times['T1'] = split_times[1] - split_times[0]
                segment_times['Bike'] = split_times[2] - split_times[1]
                segment_times['T2'] = split_times[3] - split_times[2]
                total_race_time = race_time if race_time else split_times[-1]
                segment_times['Run2'] = total_race_time - split_times[3]

                split_times_formatted.update({
                    'Run1_In': format_time(split_times[0]),
                    'T1': format_time(segment_times['T1']),
                    'Bike_Out': format_time(split_times[1]),
                    'Bike_In': format_time(split_times[2]),
                    'T2': format_time(segment_times['T2']),
                    'Run2_Out': format_time(split_times[3])
                })
        else:
            segment_times = {seg: 0 for seg in segments}
    else:
        # Triathlon: Swim -> T1 -> Bike -> T2 -> Run
        if len(split_times) >= 4 and split_times[3] == 0 and split_times[2] > 0:
            # Missing T2 checkpoint: T2 and Run can't be separated, so keep T2
            # unknown and put the combined time in Run instead of computing a
            # negative T2 and a Run equal to the whole race (mirrors the
            # missing-T2 handling in the duathlon branch above).
            print("  ⚠️  Missing T2 checkpoint for a participant — "
                  "T2/Run left combined in Run; review the CSV.")
            segment_times['Swim'] = split_times[0]
            segment_times['T1'] = split_times[1] - split_times[0]
            segment_times['Bike'] = split_times[2] - split_times[1]
            segment_times['T2'] = 0  # not recorded
            total_race_time = race_time if race_time else split_times[2]
            segment_times['Run'] = max(0, total_race_time - split_times[2])

            split_times_formatted.update({
                'Swim_In': format_time(split_times[0]),
                'T1': format_time(segment_times['T1']),
                'Bike_Out': format_time(split_times[1]),
                'Bike_In': format_time(split_times[2]),
                'T2': '',       # not recorded
                'Run_Out': '',  # not recorded
            })
        elif len(split_times) >= 4:
            # Calculate individual segment times from cumulative splits
            segment_times['Swim'] = split_times[0]
            segment_times['T1'] = split_times[1] - split_times[0]
            segment_times['Bike'] = split_times[2] - split_times[1]
            segment_times['T2'] = split_times[3] - split_times[2]
            # Run time is total race time minus T2 finish time
            total_race_time = race_time if race_time else (split_times[-1] if len(split_times) > 4 else 0)
            segment_times['Run'] = total_race_time - split_times[3]
            
            split_times_formatted.update({
                'Swim_In': format_time(split_times[0]),
                'T1': format_time(segment_times['T1']),
                'Bike_Out': format_time(split_times[1]),
                'Bike_In': format_time(split_times[2]),
                'T2': format_time(segment_times['T2']),
                'Run_Out': format_time(split_times[3])
            })
        else:
            # Fallback for incomplete data
            segment_times = {seg: 0 for seg in segments}
    
    # Single discipline events
    if event_type in ['running', 'cycling', 'swimming']:
        segment_name = segments[0]
        # For single discipline, use race_time if no splits available
        if split_times:
            segment_times[segment_name] = split_times[-1]  # Total time from splits
            split_times_formatted[f'{segment_name}_Finish'] = format_time(split_times[-1])
        elif race_time and race_time > 0:
            segment_times[segment_name] = race_time  # Use race time directly
            split_times_formatted[f'{segment_name}_Finish'] = format_time(race_time)
        else:
            segment_times[segment_name] = 0
            split_times_formatted[f'{segment_name}_Finish'] = ''
    
    elif event_type == 'swimrun':
        # Swimrun: Variable segments, try to detect pattern
        if len(split_times) >= 4:
            for i, segment in enumerate(segments):
                if i < len(split_times):
                    if i == 0:
                        segment_times[segment] = split_times[i]
                    else:
                        segment_times[segment] = split_times[i] - split_times[i-1]
                else:
                    segment_times[segment] = 0
        else:
            segment_times = {seg: 0 for seg in segments}
    
    # Calculate total time - use race_time if provided, otherwise last split time
    total_time = race_time if race_time else (split_times[-1] if split_times else 0)
    
    # For single discipline events, ensure segment time matches total time
    if event_type in ['running', 'cycling', 'swimming'] and total_time > 0:
        segment_name = segments[0]  # Use segments instead of config['segments']
        if segment_times.get(segment_name, 0) == 0:  # If segment time wasn't set properly
            segment_times[segment_name] = total_time
            split_times_formatted[f'{segment_name}_Finish'] = format_time(total_time)
    
    return segment_times, split_times_formatted, total_time

def process_event_results(api, race_id, event_type):
    """Process event results into standardized format"""
    print(f"🏁 Processing {EVENT_CONFIGS[event_type]['description']} results...")
    
    # Get race information - try direct race info first, fallback to all races list
    race_info = api.get_race_info(race_id)
    race_data = None
    
    if race_info:
        # Handle different response formats
        if isinstance(race_info, list) and len(race_info) > 0:
            race_data = race_info[0]
        else:
            race_data = race_info
    else:
        # Fallback: get race info from all races list
        print("⚠️  Direct race info not available, checking all races list...")
        all_races = api.get_all_races()
        if all_races:
            for race in all_races:
                if race.get('_id') == race_id:
                    race_data = race
                    print("✅ Found race info in all races list!")
                    break
    
    if not race_data:
        print("❌ Could not get race information")
        return [], {}
    
    overrides = RACE_OVERRIDES.get(race_id, {})
    if overrides.get('date') and not (race_data.get('date') or '').strip():
        race_data['date'] = overrides['date']
        print(f"📌 Race date missing in NyTaTime — using the confirmed date {overrides['date']}")
    if overrides:
        print(f"📌 Applying {len(overrides.get('clubs', {}))} club and "
              f"{len(overrides.get('names', {}))} name override(s) for this race")

    print(f"📋 Race: {race_data.get('name', 'Unknown')}")
    print(f"📅 Date: {race_data.get('date', 'Unknown')}")
    
    # Get participants
    participants = api.get_race_participants(race_id)
    if not participants:
        print("⚠️  No participant data available for this race")
        print("   This could mean:")
        print("   - The race hasn't happened yet")
        print("   - Participant data hasn't been uploaded")
        print("   - The API doesn't have access to this data")
        print(f"\n📋 Race exists: {race_data.get('name', 'Unknown')}")
        print(f"📅 Scheduled for: {race_data.get('date', 'Unknown')}")
        print(f"📊 Expected participants: {race_data.get('statistics', {}).get('p_count', 'Unknown')}")
        return [], race_data
    
    print(f"👥 Total participants: {len(participants)}")
    
    # Get classes for mapping
    classes = api.get_race_classes(race_id)
    class_dict = {}
    if classes:
        class_dict = {cls['_id']: fix_encoding_issues(cls['name']) for cls in classes}
        print(f"🏆 Classes: {list(class_dict.values())}")
    
    processed_results = []
    config = EVENT_CONFIGS[event_type]
    
    # Process each participant
    for participant in participants:
        # Basic info — strip whitespace to keep names stable across years
        # (a trailing space would otherwise fragment an athlete's profile).
        name = fix_encoding_issues(participant.get('name', 'Unknown')).strip()
        name = NAME_CORRECTIONS.get(name, name)
        name = overrides.get('names', {}).get(name, name)
        bib = participant.get('bib', '')
        
        # Determine class
        class_id = participant.get('class_id')
        if class_id and class_id in class_dict:
            participant_class = class_dict[class_id]
        else:
            # Fallback: try to determine from gender
            gender = participant.get('gender', '').lower()
            if gender in ['m', 'male', 'man', 'herr']:
                participant_class = 'Herr'
            elif gender in ['f', 'female', 'woman', 'dam']:
                participant_class = 'Dam'
            else:
                participant_class = 'Unknown'
        
        # Club name — a per-race override fills in what NyTaTime left blank.
        club = canonical_club(participant.get('club', ''))
        club = overrides.get('clubs', {}).get(name, club)
        
        # Process splits
        splits = participant.get('splitTimesv2', []) or participant.get('splits', [])
        race_time = participant.get('raceTime', 0)
        status = participant.get('status', 'unknown')
        segment_times, split_times_formatted, total_time = process_participant_splits(splits, event_type, race_time)
        
        # Include participants if they:
        # 1. Finished the race (total_time > 0), OR 
        # 2. Started but didn't finish but have some split data (DNF with splits), OR
        # 3. Single discipline events with race time but no splits (common for swimming/running/cycling)
        has_meaningful_splits = splits and any(s.get('time', 0) > 0 if isinstance(s, dict) else s > 0 for s in splits)
        has_race_time = race_time and race_time > 0
        is_single_discipline = event_type in ['running', 'cycling', 'swimming']
        
        if total_time <= 0 and not has_meaningful_splits and not (is_single_discipline and has_race_time):
            continue  # Skip only if no valid time AND no meaningful splits AND not single discipline with race time
        
        # For DNF participants, use the last recorded split as "total time" for sorting
        if total_time <= 0 and has_meaningful_splits:
            if isinstance(splits[0], dict):
                last_split_times = [s.get('time', 0) for s in splits if s.get('time', 0) > 0]
            else:
                last_split_times = [s for s in splits if s > 0]
            total_time = max(last_split_times) if last_split_times else 0
        
        # Calculate transition times
        transition_segments = [seg for seg in config['segments'] if seg.startswith('T')]
        total_transition = sum(segment_times.get(seg, 0) for seg in transition_segments)
        
        # Build result record
        # Determine status: ok if finished, dnf if started but didn't finish, dns if never started
        final_status = status
        if race_time > 0:
            final_status = 'ok'  # Finished 
        elif has_meaningful_splits:
            final_status = 'dnf'  # Started but didn't finish
        else:
            final_status = 'dns'  # Did not start
            
        # Round seconds to 1 decimal so the CSV matches the precision used in
        # prior years (e.g. "1420.0", not "1420.000000095367").
        def r1(v):
            return round(v, 1) if isinstance(v, (int, float)) else v

        result = {
            'Name': name,
            'Bib': bib,
            'Class': participant_class,
            'Club': club,
            'Total_Time': format_time(race_time) if race_time > 0 else 'DNF',
            'Total_Time_Seconds': r1(race_time) if race_time > 0 else 999999,
            'Status': final_status,
            'Total_Transition': format_time(total_transition) if final_status == 'ok' else '',
            'Transition_Seconds': r1(total_transition) if final_status == 'ok' else 0,
        }

        # Add segment times
        for segment in config['segments']:
            if final_status == 'ok':
                result[f'{segment}_Time'] = format_time(segment_times.get(segment, 0))
                result[f'{segment}_Seconds'] = r1(segment_times.get(segment, 0))
            else:
                # For DNF, only show segments they actually completed (non-zero)
                segment_time = segment_times.get(segment, 0)
                if segment_time > 0:
                    result[f'{segment}_Time'] = format_time(segment_time)
                    result[f'{segment}_Seconds'] = r1(segment_time)
                else:
                    result[f'{segment}_Time'] = ''
                    result[f'{segment}_Seconds'] = 0
        
        # Add split times
        result.update(split_times_formatted)
        
        processed_results.append(result)
    
    # Sort by status first (finishers before DNF), then by total time
    processed_results.sort(key=lambda x: (x['Status'] != 'ok', x['Total_Time_Seconds']))
    
    # Add overall rankings. Finishers get normal ranks; DNFs get a 'DNF'
    # designation; youth/children (shorter course) are ranked within their
    # class only and carry no overall placing (blank).
    finisher_rank = 1
    for result in processed_results:
        if result['Status'] != 'ok':
            result['Overall_Rank'] = 'DNF'
        elif not ranks_overall(result['Class']):
            result['Overall_Rank'] = ''
        else:
            result['Overall_Rank'] = finisher_rank
            finisher_rank += 1
    
    # Add class rankings (same logic: finishers first, then DNF)
    classes = set(result['Class'] for result in processed_results)
    for class_name in classes:
        class_results = [r for r in processed_results if r['Class'] == class_name]
        # Sort class results the same way
        class_results.sort(key=lambda x: (x['Status'] != 'ok', x['Total_Time_Seconds']))
        
        class_rank = 1
        for result in class_results:
            if result['Status'] == 'ok':
                result['Class_Rank'] = class_rank
                class_rank += 1
            else:
                result['Class_Rank'] = 'DNF'
    
    print(f"✅ Processed {len(processed_results)} valid results")
    return processed_results, race_data

def main():
    """Main function"""
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    
    race_id = sys.argv[1]
    event_type = sys.argv[2].lower()
    
    # Get access token (CLI arg > env var / .env > interactive prompt)
    if len(sys.argv) >= 4:
        access_token = sys.argv[3]
    else:
        load_dotenv()
        access_token = os.getenv('NYTATIME_TOKEN')
        if not access_token:
            access_token = input("Enter your Nytatime access token: ").strip()
    
    if not access_token:
        print("❌ No access token provided")
        sys.exit(1)
    
    # Validate event type
    if event_type not in EVENT_CONFIGS:
        print(f"❌ Unsupported event type: {event_type}")
        print(f"   Supported types: {', '.join(EVENT_CONFIGS.keys())}")
        sys.exit(1)
    
    try:
        print(f"🚀 Retrieving {event_type} results for race ID: {race_id}")
        
        # Create API client
        api = NytatimeAPI(access_token)
        
        # Process results
        results, race_info = process_event_results(api, race_id, event_type)
        
        if not results:
            print("❌ No results found")
            sys.exit(1)

        save_and_summarize(results, race_info, event_type)
        
    except KeyboardInterrupt:
        print("\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 