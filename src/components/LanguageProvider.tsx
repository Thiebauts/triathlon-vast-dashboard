'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import type { Lang } from '@/lib/types'

const STORAGE_KEY = 'triathlon-vast-lang'

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')
  const [hydrated, setHydrated] = useState(false)

  // Read persisted language on first client render (state-during-render pattern)
  if (!hydrated && typeof window !== 'undefined') {
    setHydrated(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'sv' || saved === 'en') setLangState(saved)
  }

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>
}

export function useLang() {
  return useContext(LangCtx)
}
