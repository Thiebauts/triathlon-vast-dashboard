#!/usr/bin/env python3
"""Unit tests for the finish-time plausibility check.

Run from the nytatime/ directory:
    python3 -m unittest test_plausibility -v
"""

import tempfile
import unittest
from pathlib import Path

from plausibility import find_implausible_times, is_adult, load_history


def row(name, seconds, cls='Herr', status='ok'):
    return {'Name': name, 'Class': cls, 'Status': status, 'Total_Time_Seconds': seconds}


# Seven adults around 20 minutes: a realistic 5 km field.
FIELD = [row(f'Runner {i}', 1200 + 30 * i) for i in range(7)]


class FindImplausibleTimesTest(unittest.TestCase):
    def test_slower_than_own_history(self):
        # The Running KM 2026 case: ~22 min runner keyed in at 31:29
        warnings = find_implausible_times(FIELD + [row('Thiébaut', 1889.8)], {'Thiébaut': [1161.0, 1287.0]})
        self.assertEqual(len(warnings), 1)
        self.assertIn('Thiébaut: 31:29 vs own median 20:24', warnings[0])

    def test_within_own_history_is_quiet(self):
        self.assertEqual(find_implausible_times(FIELD + [row('Karl', 1310.0)], {'Karl': [1109.0, 1170.0, 1225.0]}), [])

    def test_new_athlete_far_off_the_field(self):
        warnings = find_implausible_times(FIELD + [row('Joakim', 2170.4)], {})
        self.assertEqual(len(warnings), 1)
        self.assertIn('vs field median', warnings[0])
        self.assertIn('no earlier race to compare', warnings[0])

    def test_suspiciously_fast_is_flagged(self):
        self.assertEqual(len(find_implausible_times(FIELD + [row('Too fast', 600.0)], {})), 1)

    def test_youth_dnf_and_tiny_fields_are_skipped(self):
        results = FIELD + [row('Kid', 2500.0, cls='Ungdom'), row('Quit', 999999, status='dnf')]
        self.assertEqual(find_implausible_times(results, {}), [])
        # Too few finishers for a meaningful field median
        self.assertEqual(find_implausible_times([row('A', 1200), row('B', 3000)], {}), [])


class IsAdultTest(unittest.TestCase):
    def test_classes(self):
        for c in ('Herr', 'Dam', 'Man', 'Kvinna', 'Herr Sprint '):
            self.assertTrue(is_adult(c), c)
        for c in ('Ungdom', 'Barn 0-10', 'Staffet', ''):
            self.assertFalse(is_adult(c), c)


class LoadHistoryTest(unittest.TestCase):
    def test_reads_adult_finishers_and_skips_the_race_itself(self):
        header = 'Name,Class,Status,Total_Time_Seconds\n'
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            (d / 'processed_running_results_2025-09-23.csv').write_text(
                header + 'Jan,Herr,ok,1147.0\nKid,Ungdom,ok,1700.0\nQuit,Herr,dnf,999999\n', encoding='utf-8')
            (d / 'processed_running_results_2026-10-07.csv').write_text(
                header + 'Jan,Herr,ok,2136.5\n', encoding='utf-8')
            (d / 'processed_cycling_results_2025-05-20.csv').write_text(
                header + 'Jan,Herr,ok,1500.0\n', encoding='utf-8')
            self.assertEqual(load_history(d, 'running', '2026-10-07'), {'Jan': [1147.0]})


if __name__ == '__main__':
    unittest.main()
