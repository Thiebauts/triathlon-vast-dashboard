// Shared pieces of the club look (design B). Keep page styling here so every
// view uses the same eyebrow, headings, cards and buttons.

/** Card with the club's one big rounded corner (bottom right). */
export const CARD = 'rounded-[4px_4px_40px_4px]'
/** Light grey card. */
export const CARD_MIST = `${CARD} bg-mist`
/** Dark navy card. */
export const CARD_NAVY = `${CARD} bg-navy text-white`

export const BTN_PRIMARY =
  'inline-flex min-h-12 items-center justify-center rounded bg-brand px-5 font-display text-base font-semibold text-white no-underline hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2'
export const BTN_OUTLINE_LIGHT =
  'inline-flex min-h-12 items-center justify-center rounded border-2 border-white px-5 font-display text-base font-semibold text-white no-underline hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy'
/** Text-style link button (e.g. "See results"). */
export const LINK_BTN =
  'min-h-11 font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded'

/** Small script line above a heading, e.g. "Results". */
export function Eyebrow({ children, light = false, className = '' }: { children: React.ReactNode; light?: boolean; className?: string }) {
  return <div className={`font-script text-[22px] leading-tight ${light ? 'text-white' : 'text-brand'} ${className}`}>{children}</div>
}

/** The page's main heading block: eyebrow, big title, optional italic subtitle and a short rule. */
export function PageTitle({ eyebrow, title, subtitle, intro }: { eyebrow: string; title: string; subtitle?: React.ReactNode; intro?: React.ReactNode }) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-1.5 hyphens-auto break-words font-display text-[clamp(28px,8.6vw,36px)] font-semibold leading-[1.16] text-navy sm:text-[52px]">{title}</h2>
      {subtitle && <p className="m-0 font-display text-lg font-semibold italic leading-snug text-muted sm:text-2xl">{subtitle}</p>}
      <div aria-hidden="true" className="mt-5 h-px w-20 bg-[#a3a8ac]" />
      {intro && <p className="mb-0 mt-4 max-w-[720px] text-[15px] leading-relaxed text-muted">{intro}</p>}
    </div>
  )
}

/** Section heading with an eyebrow, e.g. "The races / Season 2026". */
export function SectionTitle({ eyebrow, title, id }: { eyebrow?: string; title: string; id?: string }) {
  return (
    <div>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h3 id={id} className="mt-1.5 hyphens-auto break-words font-display text-[30px] font-semibold leading-tight text-navy sm:text-[40px]">{title}</h3>
    </div>
  )
}

/** The two heading sizes used inside a page: a section (h3) and a block within it. */
export const H_SECTION = 'm-0 hyphens-auto break-words font-display text-[26px] font-semibold leading-tight text-navy sm:text-[30px]'
export const H_BLOCK = 'm-0 hyphens-auto break-words font-display text-[22px] font-semibold leading-tight text-navy'

/** Form controls: one look for every select and search field. */
export const FIELD = 'h-11 rounded border border-[#8a8e94] bg-white px-3 text-[15px] text-navy placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/** Medal colours for places 1–3 (all pass 4.5:1 on white and the light grey). */
export const MEDAL_COLORS = ['#7d6300', '#56677a', '#85552b']
