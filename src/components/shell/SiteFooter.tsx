import { t, tf } from '@/lib/translations'
import { formatDate } from '@/lib/dates'
import type { Lang } from '@/lib/types'

const REPORT_MAIL = 'mailto:schirmer.thiebaut@gmail.com?subject=%5Btriathlon-vast-dashboard%5D%20'

/** Slim footer: the side menu already lists every section, so only About links and the club site here. */
export function SiteFooter({ lang, lastUpdated }: { lang: Lang; lastUpdated: string }) {
  const link = 'flex min-h-11 w-fit items-center text-[15px] text-white no-underline hover:underline'
  return (
    <footer className="mt-auto bg-brand text-white">
      {/* Same gutters and 1200px column as the pages above */}
      <div className="px-4 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-[1200px] gap-x-6 gap-y-4 py-7 sm:grid-cols-2">
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
      </div>
      <div className="bg-brand-dark px-4 sm:px-8 lg:px-10">
        <p className="mx-auto my-0 max-w-[1200px] py-3.5 text-[13px]">
          Triathlon Väst {t('site_name', lang)} · {t('footer_source_line', lang)}
          {lastUpdated && <> · {tf('footer_updated', lang, { date: formatDate(lastUpdated, lang) })}</>}
        </p>
      </div>
    </footer>
  )
}
