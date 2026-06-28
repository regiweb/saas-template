/**
 * LanguageSwitcher (EZL-US-020) — one reusable control.
 *   variant="compact" → RU/EN segment (navbars, drawer)
 *   variant="full"    → Русский | English segment (Settings)
 */
import { useI18n } from '../../i18n/index.jsx'

const LANGS = [
  { code: 'ru', short: 'RU', full: 'Русский' },
  { code: 'en', short: 'EN', full: 'English' },
]

export function LanguageSwitcher({ variant = 'compact' }) {
  const { lang, setLang } = useI18n()

  return (
    <div className={`lang-switch lang-${variant}`} role="group" aria-label="Language / Язык">
      <i className="ti ti-world lang-globe" aria-hidden="true" />
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-opt${lang === l.code ? ' active' : ''}`}
          aria-pressed={lang === l.code}
          onClick={() => setLang(l.code)}
        >
          {variant === 'full' ? l.full : l.short}
        </button>
      ))}
    </div>
  )
}
