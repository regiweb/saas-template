/**
 * Lightweight i18n (EZL-US-020) — RU/EN, RU default.
 *
 * The codebase is written in English; the design dictionary (ru-en.json) is
 * keyed by the Russian source and was reverse-engineered from the deployed app,
 * so its English *values* match the strings in code. We invert it once to get
 * an English→Russian map and translate by source string (gettext style):
 *   t('Sign out')  → 'Выйти'  (lang=ru)  |  'Sign out' (lang=en, identity)
 * Uncovered strings fall back to the English source.
 *
 * No external dependency — a small React context is enough for RU/EN.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import ruEn from './ru-en.json'

// English source → Russian (inverted from the RU→EN design dictionary)
const EN_TO_RU = Object.fromEntries(
  Object.entries(ruEn).map(([ru, en]) => [en, ru])
)

const STORAGE_KEY  = 'ezl_lang'
const DEFAULT_LANG = 'ru'

function initLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch { /* ignore */ }
  return DEFAULT_LANG
}

const I18nContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, t: (s) => s })

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initLang)

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang(next) {
      if (next !== 'ru' && next !== 'en') return
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      setLangState(next)
    },
    t: (s) => (lang === 'ru' ? (EN_TO_RU[s] ?? s) : s),
  }), [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() { return useContext(I18nContext) }
export function useT()    { return useContext(I18nContext).t }
