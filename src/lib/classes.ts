// Pure computation — safe to import from both Server and Client Components
//
// Race classes come from the result sheets in Swedish ("Herr", "Barn 10+",
// "Staffet"). Every page shows them through classLabel() so they read the same
// everywhere and follow the chosen language.

import { t } from './translations.ts'
import type { Lang } from './types'

const CLASS_KEYS: Record<string, string> = {
  herr: 'men',
  dam: 'women',
  ungdom: 'class_youth',
  barn: 'class_children',
  'barn 0-10': 'class_children_0_10',
  'barn 10+': 'class_children_10plus',
  pojkar: 'class_boys',
  flickor: 'class_girls',
  'ungdom herr': 'class_youth_men',
  'ungdom dam': 'class_youth_women',
  // The sheets spell it "Staffet"; the correct Swedish is "Stafett"
  staffet: 'class_relay',
  stafett: 'class_relay',
}

/** "Herr" → "Men" / "Herrar", "Staffet" → "Relay" / "Stafett"; an unknown class as written. */
export function classLabel(cls: string, lang: Lang): string {
  const key = CLASS_KEYS[cls.toLowerCase().trim()]
  return key ? t(key, lang) : cls
}
