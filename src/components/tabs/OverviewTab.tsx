'use client'
import dynamic from 'next/dynamic'
import { t } from '@/lib/translations'
import type { Lang } from '@/lib/types'

const ParticipationChart = dynamic(
  () => import('@/components/charts/ParticipationChart').then((m) => m.ParticipationChart),
  { ssr: false, loading: () => <div className="h-[320px] bg-gray-50 animate-pulse rounded" /> },
)

interface Props {
  participationByYear: Array<{ year: string; triathlon: number; duathlon: number; swimming: number; cycling: number; running: number; swimrun: number }>
  lang: Lang
}

const DISCIPLINES: Array<{
  title: { en: string; sv: string }
  desc:  { en: string; sv: string }
}> = [
  {
    title: { en: 'Running — 5 km Track Race',  sv: 'Löpning — 5 km sprintlopp' },
    desc:  {
      en: 'A 5 km race on the track, held at Åby or Slottsskogsvallen.',
      sv: 'Ett 5 km-lopp på banan, vid Åby eller Slottsskogsvallen.',
    },
  },
  {
    title: { en: 'Swimming — 2 km Open Water', sv: 'Simning — 2 km öppet vatten' },
    desc:  {
      en: 'A 2 km race in the beautiful Delsjön lake.',
      sv: 'Ett 2 km-lopp i vackra Delsjön.',
    },
  },
  {
    title: { en: 'Cycling — 20 km Tempo',      sv: 'Cykling — 20 km tempo' },
    desc:  {
      en: 'A 20 km individual tempo effort held near Kungsbacka.',
      sv: 'Ett 20 km individuellt tempolopp nära Kungsbacka.',
    },
  },
  {
    title: { en: 'Duathlon — Sprint Format',   sv: 'Duathlon — sprintformat' },
    desc:  {
      en: '5 km run / 20 km bike / 2.5 km run, located near the iconic Gunnebo Castle.',
      sv: '5 km löp / 20 km cykel / 2,5 km löp, vid det ikoniska Gunnebo slott.',
    },
  },
  {
    title: { en: 'Triathlon — Sprint Format',  sv: 'Triathlon — sprintformat' },
    desc:  {
      en: '750 m swim / 20 km bike / 5 km run, held at Inseros.',
      sv: '750 m sim / 20 km cykel / 5 km löp, vid Inseros.',
    },
  },
  {
    title: { en: 'Swimrun — Sisjön',           sv: 'Swimrun — Sisjön' },
    desc:  {
      en: 'A swimrun adventure at Sisjön.',
      sv: 'Ett swimrun-äventyr vid Sisjön.',
    },
  },
]

export function OverviewTab({ participationByYear, lang }: Props) {
  return (
    <div className="space-y-3">
      {/* Championships overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-700 mb-1">{t('championships_title', lang)}</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{t('championships_intro', lang)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DISCIPLINES.map((d) => (
            <div key={d.title.en} className="border border-gray-100 rounded-lg p-2.5">
              <div className="text-xs font-semibold text-gray-800 mb-0.5">{d.title[lang]}</div>
              <div className="text-[11px] text-gray-500 leading-relaxed">{d.desc[lang]}</div>
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
