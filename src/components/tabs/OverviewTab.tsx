'use client'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { t } from '@/lib/translations'
import { getParticipationByYear } from '@/lib/data'
import type { CompetitionsData, Lang } from '@/lib/types'

const ParticipationChart = dynamic(
  () => import('@/components/charts/ParticipationChart').then((m) => m.ParticipationChart),
  { ssr: false, loading: () => <div className="h-[320px] bg-gray-50 animate-pulse rounded" /> },
)

interface Props {
  data: CompetitionsData
  lang: Lang
}

// Card content lives in translations.ts (project rule: all user-facing
// strings go through the catalogue); this only fixes the display order.
const DISCIPLINES = ['running', 'swimming', 'cycling', 'duathlon', 'triathlon', 'swimrun'] as const

export function OverviewTab({ data, lang }: Props) {
  const participationByYear = useMemo(() => getParticipationByYear(data), [data])
  return (
    <div className="space-y-3">
      {/* Championships overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-1">{t('championships_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{t('championships_intro', lang)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DISCIPLINES.map((d) => (
            <div key={d} className="border border-gray-100 rounded-lg p-2.5">
              <div className="text-xs font-semibold text-gray-800 mb-0.5">{t(`discipline_${d}_title`, lang)}</div>
              <div className="text-[11px] text-gray-500 leading-relaxed">{t(`discipline_${d}_desc`, lang)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-1">{t('created_by_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-1.5">{t('created_by_text1', lang)}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{t('created_by_text2', lang)}</p>
      </div>

      {/* Participation chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-3">{t('participation_by_year', lang)}</h2>
        <ParticipationChart data={participationByYear} lang={lang} />
      </div>

      {/* Contact & Contribute */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-1">{t('contact_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          {t('contact_text', lang)}{' '}
          <code className="bg-gray-100 rounded px-1 py-0.5 text-[11px] text-gray-700">
            [triathlon-vast-dashboard] {t('contact_subject_placeholder', lang)}
          </code>
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-2">
          {t('contribute_text', lang)}{' '}
          <a
            href="https://github.com/Thiebauts/triathlon-vast-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-700 hover:underline font-medium"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  )
}
