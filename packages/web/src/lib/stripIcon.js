// Strips a leading emoji / symbol (and following space) from a translated label,
// so we can render a Tabler <i> icon in its place WITHOUT touching the i18n
// dictionary (the emoji stays part of the t() key — which disambiguates homonyms
// like Block / Block user — but is dropped from what the user sees).
export const stripIcon = (s) =>
  typeof s === 'string' ? s.replace(/^[^\p{L}\p{N}]+/u, '') : s
