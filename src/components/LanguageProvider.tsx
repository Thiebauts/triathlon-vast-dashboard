'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Lang } from '@/lib/types'

const STORAGE_KEY = 'triathlon-vast-lang'

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start with 'en' to match the statically-rendered HTML. Reading
  // localStorage during the first render makes returning Swedish visitors
  // hydrate with different text than the server sent — a full-tree hydration
  // mismatch on every load. The saved language is applied right after mount
  // instead (brief EN flash for SV users, no mismatch).
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      // The post-mount re-render is the point: applying the saved language
      // only after hydration is what keeps server and client HTML identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(STORAGE_KEY) === 'sv') setLangState('sv')
    } catch { /* private browsing */ }
  }, [])

  // Keep the document language in sync so screen readers use the right voice.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* private browsing */ }
  }, [])

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>
}

export function useLang() {
  return useContext(LangCtx)
}
