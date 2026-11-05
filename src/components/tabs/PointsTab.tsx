'use client'
import { t, tf } from '@/lib/translations'
import { calculatePoints } from '@/lib/data'
import type { Lang } from '@/lib/types'
import { CARD_MIST, PageTitle } from '@/components/ui/brand'

interface Props {
  lang: Lang
}

const RULES = ['members', 'gender', 'adults', 'finish', 'ties', 'season'] as const
const PLACES = Array.from({ length: 32 }, (_, i) => i + 1)

export function PointsTab({ lang }: Props) {
  return (
    <div className="flex flex-col gap-10">
      <PageTitle eyebrow={t('pts_eyebrow', lang)} title={t('pts_title', lang)} subtitle={t('pts_subtitle', lang)} />

      <section aria-labelledby="pts-table">
        <h3 id="pts-table" className="mb-2 mt-0 font-display text-[30px] font-semibold text-navy">{t('pts_table_title', lang)}</h3>
        <p className="mb-5 mt-0 max-w-[720px] text-[15px] leading-relaxed">{t('pts_table_text', lang)}</p>
        <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-8">
          {PLACES.map((n) => (
            <li key={n} className={`flex flex-col items-center rounded-[4px_4px_14px_4px] py-2 ${n <= 3 ? 'bg-navy text-white' : 'bg-mist'}`}>
              <span className={`text-xs font-semibold ${n <= 3 ? 'text-[#c3c6d1]' : 'text-muted'}`}>{tf('pts_place', lang, { n })}</span>
              <span className={`font-display text-2xl font-semibold ${n <= 3 ? 'text-white' : 'text-brand'}`}>{calculatePoints(n)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pts-rules">
        <h3 id="pts-rules" className="mb-4 mt-0 font-display text-[30px] font-semibold text-navy">{t('pts_rules_title', lang)}</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {RULES.map((r) => (
            <div key={r} className={`${CARD_MIST} px-6 py-5`}>
              <h4 className="mb-1.5 mt-0 font-display text-xl font-semibold text-navy">{t(`pts_rule_${r}_t`, lang)}</h4>
              <p className="m-0 text-[15px] leading-relaxed">{t(`pts_rule_${r}`, lang)}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="m-0 text-[15px] text-muted">{t('pts_wrong', lang)}</p>
    </div>
  )
}
