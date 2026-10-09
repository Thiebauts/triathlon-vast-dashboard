"""Flag finish times that look wrong before a result CSV is published.

Finish times are sometimes keyed in by hand against bibs (Running KM 2026), and
a time typed against the wrong bib looks perfectly valid to the pipeline. Two
checks catch that class of error:

- against the athlete's own earlier results in the same sport, and
- against the field: far slower or faster than the median adult finisher.

Both only warn — some outliers are real (an injury, a bad day, a new course).
"""

import statistics
from pathlib import Path

import pandas as pd

# A finish this far off the athlete's own median in the sport is flagged.
OWN_HISTORY_TOLERANCE = 0.25
# A finish beyond these multiples of the field's median adult time is flagged.
FIELD_SLOW_FACTOR = 1.5
FIELD_FAST_FACTOR = 0.6
# The field check needs enough finishers for the median to mean something.
MIN_FIELD_SIZE = 5

# Youth and children race shorter courses, so they're compared with nobody.
ADULT_CLASSES = ('herr', 'dam', 'man', 'kvinna')


def is_adult(class_name: str) -> bool:
    """Whether a class races the full course (Herr/Dam, incl. NyTaTime's
    "Man"/"Kvinna" and suffixed variants like "Herr Sprint")."""
    c = (class_name or '').strip().lower()
    return any(c.startswith(a) for a in ADULT_CLASSES)


def load_history(data_dir: Path, event_type: str, exclude_date: str) -> dict[str, list[float]]:
    """Finish times (seconds) per athlete from every earlier CSV of this sport.

    The CSV being written (same date) is excluded so a race isn't compared
    with itself on a re-fetch.
    """
    history: dict[str, list[float]] = {}
    for csv_path in sorted(data_dir.glob(f'processed_{event_type}_results_*.csv')):
        if exclude_date and exclude_date in csv_path.name:
            continue
        df = pd.read_csv(csv_path, encoding='utf-8')
        for _, row in df.iterrows():
            if row.get('Status') != 'ok' or not is_adult(str(row.get('Class', ''))):
                continue
            seconds = float(row.get('Total_Time_Seconds') or 0)
            if 0 < seconds < 999999:
                history.setdefault(str(row['Name']).strip(), []).append(seconds)
    return history


def _mmss(seconds: float) -> str:
    total = int(seconds)  # truncate, like the HH:MM:SS shown everywhere else
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'


def find_implausible_times(results: list[dict], history: dict[str, list[float]]) -> list[str]:
    """One human-readable warning per adult finisher whose time looks wrong."""
    finishers = [
        r for r in results
        if r.get('Status') == 'ok' and is_adult(r.get('Class', ''))
        and 0 < float(r.get('Total_Time_Seconds') or 0) < 999999
    ]
    times = [float(r['Total_Time_Seconds']) for r in finishers]
    field_median = statistics.median(times) if len(times) >= MIN_FIELD_SIZE else None

    warnings = []
    for r in finishers:
        name, t = r['Name'], float(r['Total_Time_Seconds'])
        past = history.get(name)
        if past:
            own = statistics.median(past)
            change = (t - own) / own
            if abs(change) > OWN_HISTORY_TOLERANCE:
                warnings.append(
                    f'{name}: {_mmss(t)} vs own median {_mmss(own)} over '
                    f'{len(past)} earlier race(s) ({change:+.0%})'
                )
                continue
        if field_median and not (FIELD_FAST_FACTOR * field_median <= t <= FIELD_SLOW_FACTOR * field_median):
            warnings.append(
                f'{name}: {_mmss(t)} vs field median {_mmss(field_median)} '
                f'({t / field_median:.1f}×){"" if past else " — no earlier race to compare"}'
            )
    return warnings
