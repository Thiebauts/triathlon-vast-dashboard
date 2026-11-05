'use client'
import { useEffect, useRef, useState } from 'react'
import { t, tf } from '@/lib/translations'
import type { Lang } from '@/lib/types'

/** Everything the picture shows about one result. */
export interface ShareData {
  name: string
  sportLabel: string
  year: string
  /** Long date, already formatted for the language. */
  dateLabel: string
  time: string
  /** Place among the adult finishers of the same class (men or women). */
  place: number
  fieldSize: number
  gender: 'men' | 'women'
  points: number | null
  tag: 'pb' | 'debut' | null
  splits: Array<{ label: string; time: string; fastest: boolean }>
  /** Race and distance, e.g. "Running — 5 km Track Race" (shown when there are no splits). */
  raceLabel: string
}

const W = 1080
const H = 1350
const SITE = 'triathlon-vast-dashboard.vercel.app'
const C = { brand: '#d52435', dark: '#ad1d1d', navy: '#212934', mist: '#f2f3f5', muted: '#4a4e57', soft: '#c3c6d1' }

function ordinal(n: number, lang: Lang) {
  if (lang === 'sv') return `${n}:${n % 10 === 1 || n % 10 === 2 ? (n % 100 === 11 || n % 100 === 12 ? 'e' : 'a') : 'e'}`
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}

/** The family names next/font gave the club fonts (they are hashed). */
function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** Rounded rectangle with the club's one big corner (bottom right). */
function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, small: number, big: number) {
  ctx.beginPath()
  ctx.moveTo(x + small, y)
  ctx.lineTo(x + w - small, y); ctx.quadraticCurveTo(x + w, y, x + w, y + small)
  ctx.lineTo(x + w, y + h - big); ctx.quadraticCurveTo(x + w, y + h, x + w - big, y + h)
  ctx.lineTo(x + small, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - small)
  ctx.lineTo(x, y + small); ctx.quadraticCurveTo(x, y, x + small, y)
  ctx.closePath()
}

/** Shrinks the font until the text fits the width. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: string, family: string) {
  let s = size
  ctx.font = `${weight} ${s}px ${family}`
  while (ctx.measureText(text).width > maxW && s > 24) { s -= 2; ctx.font = `${weight} ${s}px ${family}` }
  return s
}

async function drawCard(canvas: HTMLCanvasElement, d: ShareData, lang: Lang) {
  const plex = fontVar('--font-plex', 'sans-serif')
  const raleway = fontVar('--font-raleway', 'sans-serif')
  const script = fontVar('--font-yellowtail', 'cursive')
  await Promise.all([`600 80px ${plex}`, `600 30px ${raleway}`, `400 50px ${script}`].map((f) => document.fonts.load(f).catch(() => null)))
  const logo = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/OGLogo-2.png'
  })

  const ctx = canvas.getContext('2d')!
  canvas.width = W
  canvas.height = H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = C.brand
  ctx.fillRect(0, 0, W, 18)

  // Logo on white (the brand rule), site name in script on the right
  if (logo) {
    const lw = 360, lh = (logo.height / logo.width) * lw
    ctx.drawImage(logo, 72, 56 + (80 - lh) / 2, lw, lh)
  }
  ctx.fillStyle = C.brand
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.font = `400 54px ${script}`
  ctx.fillText(t('site_name', lang), W - 72, 98)

  // Slanted navy band
  const top = 190, bottom = 900
  ctx.fillStyle = C.navy
  ctx.beginPath()
  ctx.moveTo(0, top); ctx.lineTo(W, top + 50); ctx.lineTo(W, bottom - 50); ctx.lineTo(0, bottom)
  ctx.closePath(); ctx.fill()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.font = `400 52px ${script}`
  ctx.fillText(`${d.sportLabel} ${d.year}`, 72, 330)
  fitText(ctx, d.name, W - 144, 84, '600', plex)
  ctx.fillText(d.name, 72, 430)
  fitText(ctx, d.time, W - 144, 200, '600', plex)
  ctx.fillText(d.time, 68, 630)

  // Chips: place, points, PB/Debut
  const chips: Array<{ text: string; fill: string; color: string; outline?: boolean }> = [
    { text: tf(d.gender === 'men' ? 'share_place_men' : 'share_place_women', lang, { ord: ordinal(d.place, lang), n: d.fieldSize }), fill: C.brand, color: '#ffffff' },
  ]
  if (d.points !== null) chips.push({ text: tf('share_points', lang, { n: d.points }), fill: '#ffffff', color: C.navy })
  if (d.tag) chips.push({ text: t(d.tag === 'pb' ? 'share_tag_pb' : 'share_tag_debut', lang), fill: 'transparent', color: '#ffffff', outline: true })
  let x = 72
  let y = 700
  ctx.font = `600 34px ${plex}`
  for (const c of chips) {
    const w = ctx.measureText(c.text).width + 52
    if (x + w > W - 72) { x = 72; y += 84 }
    card(ctx, x, y, w, 64, 4, 28)
    if (c.outline) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke() } else { ctx.fillStyle = c.fill; ctx.fill() }
    ctx.fillStyle = c.color
    ctx.textBaseline = 'middle'
    ctx.fillText(c.text, x + 26, y + 34)
    ctx.textBaseline = 'alphabetic'
    x += w + 16
  }

  // Splits (triathlon/duathlon), or the race date for single-sport races
  if (d.splits.length) {
    const gap = 24, n = d.splits.length
    const bw = (W - 144 - gap * (n - 1)) / n
    d.splits.forEach((s, i) => {
      const bx = 72 + i * (bw + gap), by = 940
      card(ctx, bx, by, bw, 220, 4, 40)
      ctx.fillStyle = C.mist; ctx.fill()
      ctx.fillStyle = C.muted
      ctx.font = `700 26px ${raleway}`
      ctx.fillText(s.label.toUpperCase(), bx + 28, by + 54)
      ctx.fillStyle = C.navy
      fitText(ctx, s.time, bw - 56, 64, '600', plex)
      ctx.fillText(s.time, bx + 28, by + 132)
      if (s.fastest) {
        ctx.fillStyle = C.brand
        ctx.font = `600 24px ${raleway}`
        ctx.fillText(t('share_fastest', lang), bx + 28, by + 184)
      }
    })
  } else {
    card(ctx, 72, 940, W - 144, 220, 4, 40)
    ctx.fillStyle = C.mist; ctx.fill()
    ctx.fillStyle = C.muted
    ctx.font = `700 26px ${raleway}`
    ctx.fillText(d.dateLabel.toUpperCase(), 100, 994)
    ctx.fillStyle = C.navy
    fitText(ctx, d.raceLabel, W - 200, 52, '600', plex)
    ctx.fillText(d.raceLabel, 100, 1080)
  }

  // Footer bar
  ctx.fillStyle = C.brand
  ctx.fillRect(0, H - 130, W, 130)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  fitText(ctx, `${t('share_footer', lang)} · ${d.dateLabel}`, W - 144, 30, '700', raleway)
  ctx.fillText(`${t('share_footer', lang)} · ${d.dateLabel}`, 72, H - 84)
  ctx.font = `500 26px ${raleway}`
  ctx.fillText(SITE, 72, H - 42)
}

function fileName(d: ShareData) {
  return `${d.sportLabel}-${d.year}-${d.name}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-') + '.png'
}

/** Dialog with the picture, a Share button (phones) and a Download button. */
export function ShareDialog({ data, lang, onClose }: { data: ShareData; lang: Lang; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    let cancelled = false
    const canvas = canvasRef.current!
    drawCard(canvas, data, lang).then(() => {
      canvas.toBlob((b) => {
        if (cancelled || !b) return
        setBlob(b)
        setUrl(URL.createObjectURL(b))
      }, 'image/png')
    })
    return () => { cancelled = true }
  }, [data, lang])

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const file = blob ? new File([blob], fileName(data), { type: 'image/png' }) : null
  const canShare = !!file && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] })

  const share = async () => {
    if (!file) return
    try { await navigator.share({ files: [file], title: `${data.name} · ${data.sportLabel} ${data.year}` }) } catch { /* cancelled */ }
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="share-title"
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[4px_4px_32px_4px] p-0 backdrop:bg-navy/60">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="share-title" className="m-0 font-display text-2xl font-semibold text-navy">{t('share_title', lang)}</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label={t('share_close', lang)}
            className="flex h-11 w-11 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#212934" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {url
          // eslint-disable-next-line @next/next/no-img-element -- a generated blob URL, not an optimisable asset
          ? <img src={url} alt={`${data.name}, ${data.sportLabel} ${data.year}: ${data.time}`} className="w-full rounded border border-line" />
          : <div className="aspect-[4/5] w-full animate-pulse rounded bg-mist" />}
        <p className="m-0 text-sm text-muted">{t('share_text', lang)}</p>
        <div className="flex flex-wrap gap-3">
          {canShare && (
            <button type="button" onClick={share}
              className="inline-flex min-h-12 items-center rounded bg-brand px-5 font-display font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
              {t('share_share', lang)}
            </button>
          )}
          {url && (
            <a href={url} download={fileName(data)}
              className={`inline-flex min-h-12 items-center rounded px-5 font-display font-semibold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${canShare ? 'border-2 border-navy text-navy' : 'bg-brand text-white'}`}>
              {t('share_download', lang)}
            </a>
          )}
        </div>
      </div>
    </dialog>
  )
}

/** Small share button shown next to a result. */
export function ShareButton({ name, lang, onClick }: { name: string; lang: Lang; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={tf('share_button_label', lang, { name })} title={t('share_title', lang)}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line bg-white text-navy hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
    </button>
  )
}
