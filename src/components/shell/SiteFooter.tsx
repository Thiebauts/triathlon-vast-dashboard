import { t, tf } from '@/lib/translations'
import { formatDate } from '@/lib/dates'
import type { Lang } from '@/lib/types'

const REPORT_MAIL = 'mailto:schirmer.thiebaut@gmail.com?subject=%5Btriathlon-vast-dashboard%5D%20'

/** Slim footer: the side menu already lists every section, so only About links and the club site here. */
export function SiteFooter({ lang, lastUpdated }: { lang: Lang; lastUpdated: string }) {
  const link = 'block text-[15px] leading-[1.9] text-white no-underline hover:underline'
  return (
    <footer className="mt-auto bg-brand text-white">
      <div className="grid gap-x-6 gap-y-4 px-4 py-7 sm:grid-cols-2 sm:px-10">
        <div>
          <h2 className="mb-2 text-[15px] font-bold uppercase">{t('footer_about', lang)}</h2>
          <a className={link} href={REPORT_MAIL}>{t('footer_report', lang)}</a>
          <a className={link} href="https://github.com/Thiebauts/triathlon-vast-dashboard">{t('footer_source', lang)}</a>
        </div>
        <div>
          <h2 className="mb-2 text-[15px] font-bold uppercase">{t('footer_club', lang)}</h2>
          <a className={link} href="https://triathlonvast.se">triathlonvast.se</a>
        </div>
      </div>
      <div className="bg-brand-dark">
        <p className="m-0 px-4 py-3.5 text-[13px] sm:px-10">
          Triathlon Väst {t('site_name', lang)} · {t('footer_source_line', lang)}
          {lastUpdated && <> · {tf('footer_updated', lang, { date: formatDate(lastUpdated, lang) })}</>}
        </p>
      </div>
    </footer>
  )
}
