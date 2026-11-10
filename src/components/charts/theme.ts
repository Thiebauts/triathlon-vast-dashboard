// One look for every chart on the site.
//
// Series colours: a categorical palette checked for colour-blind separation
// and contrast (the club's own red / navy / greys can't tell six sports apart:
// greys fail the checks). Colour only ever marks a series — text, axes and
// tooltips use the club's ink, navy and line tokens, and every chart also
// gives its numbers as text or a table.

/** Fixed order; a series keeps its colour wherever it appears. */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'] as const

export const SPORT_COLOR = {
  triathlon: SERIES[0],
  duathlon: SERIES[1],
  swimming: SERIES[2],
  cycling: SERIES[3],
  running: SERIES[4],
  swimrun: SERIES[5],
} as const

/** Who started: men / women / youth, and relay runners as a neutral. */
export const GROUP_COLOR = { men: SERIES[0], women: SERIES[1], youth: SERIES[2], relay: '#888780' } as const

export const INK = { text: '#4a4e57', navy: '#212934', line: '#e2e2e2', brand: '#d52435', neutral: '#888780' } as const

/** Tooltip box: navy with the club corner, the same in every chart. */
export const TOOLTIP_BOX = 'rounded-[4px_4px_16px_4px] bg-navy px-3 py-2 text-sm text-white shadow'

/** Round axis steps for times, in seconds. */
const TIME_STEPS = [15, 30, 60, 120, 300, 600, 900, 1800, 3600]

/** Evenly spaced, round tick values covering [min, max] (at most `count` gaps). */
export function timeTicks(min: number, max: number, count = 4): number[] {
  const step = TIME_STEPS.find((s) => (max - min) / s <= count) ?? 3600
  const ticks: number[] = []
  for (let v = Math.floor(min / step) * step; v < max + step; v += step) ticks.push(v)
  return ticks
}
