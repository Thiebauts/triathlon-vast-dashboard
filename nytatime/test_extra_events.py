#!/usr/bin/env python3
"""Unit tests for the extra-event pipeline's pure logic.

Run from the nytatime/ directory:
    python3 -m unittest test_extra_events -v
"""

import unittest

from retrieve_extra_event_results import assign_ranks, compute_segments


class ComputeSegmentsTest(unittest.TestCase):
    def test_full_course(self):
        # Cumulative: swim end 480, T1 end 540, bike end 1740, T2 end 1780; finish 2380
        seg = compute_segments([480, 540, 1740, 1780], 2380)
        self.assertEqual(seg, {'Swim': 480, 'T1': 60, 'Bike': 1200, 'T2': 40, 'Run': 600})

    def test_swim_run_only(self):
        # The Ida/Jenny pattern: no bike — middle checkpoints empty
        seg = compute_segments([782.0, 0, 0, 1154.2], 2341.8)
        self.assertEqual(set(seg), {'Swim', 'Run'})
        self.assertAlmostEqual(seg['Swim'], 782.0)
        self.assertAlmostEqual(seg['Run'], 1187.6, places=3)

    def test_no_swim(self):
        # The Peter pattern: first checkpoint empty
        seg = compute_segments([0, 802.1, 1968.1, 1995.0], 2795.6)
        self.assertEqual(set(seg), {'Bike', 'T2', 'Run'})
        self.assertAlmostEqual(seg['Bike'], 1166.0, places=3)
        self.assertAlmostEqual(seg['T2'], 26.9, places=3)
        self.assertAlmostEqual(seg['Run'], 800.6, places=3)

    def test_no_data_at_all(self):
        # The Andreas pattern: nothing recorded — caller excludes the athlete
        self.assertEqual(compute_segments([0, 0, 0, 0], 0), {})
        self.assertEqual(compute_segments([], 0), {})

    def test_no_finish(self):
        # Full splits but no finish beam: everything except Run
        seg = compute_segments([480, 540, 1740, 1780], 0)
        self.assertEqual(set(seg), {'Swim', 'T1', 'Bike', 'T2'})

    def test_non_monotonic_splits_are_dropped(self):
        # A checkpoint earlier than its predecessor must not yield a negative
        # segment — it is treated as missing instead.
        seg = compute_segments([480, 400, 1740, 1780], 2380)
        self.assertNotIn('T1', seg)
        self.assertTrue(all(v > 0 for v in seg.values()))


def mk(name, cls, total):
    return {'Name': name, 'Class': cls, 'Total_Time_Seconds': total}


class AssignRanksTest(unittest.TestCase):
    def test_sequential_ranks(self):
        rows = [mk('A', 'Herr', 100), mk('B', 'Herr', 110), mk('C', 'Dam', 120)]
        assign_ranks(rows)
        self.assertEqual([r['Overall_Rank'] for r in rows], [1, 2, 3])
        self.assertEqual([r['Class_Rank'] for r in rows], [1, 2, 1])

    def test_tied_times_share_rank(self):
        # Same convention as the KM data: 1, 1, 3
        rows = [mk('A', 'Herr', 100), mk('B', 'Herr', 100), mk('C', 'Herr', 120)]
        assign_ranks(rows)
        self.assertEqual([r['Overall_Rank'] for r in rows], [1, 1, 3])
        self.assertEqual([r['Class_Rank'] for r in rows], [1, 1, 3])

    def test_class_ties_independent_of_overall(self):
        # Two Dam athletes tied behind a faster Herr: Dam class rank 1, 1
        rows = [mk('A', 'Herr', 100), mk('B', 'Dam', 110), mk('C', 'Dam', 110)]
        assign_ranks(rows)
        self.assertEqual([r['Overall_Rank'] for r in rows], [1, 2, 2])
        self.assertEqual([r['Class_Rank'] for r in rows], [1, 1, 1])

    def test_empty(self):
        assign_ranks([])  # must not raise


if __name__ == '__main__':
    unittest.main()
