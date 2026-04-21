export const DEFAULT_HEADERS = {
  'User-Agent': 'GunplaManager/2.0 (Electron; provider lookup; +https://github.com/)',
  Accept: 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const GRADE_ALIASES = {
  HG: ['HGUC', 'High Grade'],
  HGUC: ['HG', 'High Grade Universal Century'],
  RG: ['Real Grade'],
  MG: ['Master Grade'],
  PG: ['Perfect Grade'],
}

const MODEL_ALIASES = [
  { pattern: /(钢加农|guncannon|ガンキャノン)/i, aliases: ['Guncannon', 'ガンキャノン', 'RX-77-2'] },
  { pattern: /(钢坦克|guntank|ガンタンク)/i, aliases: ['Guntank', 'ガンタンク', 'RX-75-4'] },
  { pattern: /(元祖高达|rx-78-2|gundam|ガンダム)/i, aliases: ['RX-78-2 Gundam', 'ガンダム', 'RX-78-2'] },
  { pattern: /(扎古|zaku|ザク)/i, aliases: ['Zaku', 'ザク', 'MS-06'] },
  { pattern: /(吉姆|gm|ジム)/i, aliases: ['GM', 'ジム', 'RGM'] },
  { pattern: /(百式|hyaku shiki|百式)/i, aliases: ['Hyaku Shiki', '百式', 'MSN-00100'] },
  { pattern: /(沙扎比|sazabi|サザビー)/i, aliases: ['Sazabi', 'サザビー', 'MSN-04'] },
  { pattern: /(高达mk-ii|mk-ii|mk ii|ガンダムmk-ii)/i, aliases: ['Gundam Mk-II', 'ガンダムMk-II', 'RX-178'] },
]

export async function fetchText(url, ms = 15000, headers = {}) {
  const res = await fetch(url, {
    headers: { ...DEFAULT_HEADERS, ...headers },
    signal: AbortSignal.timeout(ms),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export async function fetchJson(url, ms = 15000, headers = {}) {
  const res = await fetch(url, {
    headers: { ...DEFAULT_HEADERS, ...headers },
    signal: AbortSignal.timeout(ms),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(value) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 || /^[a-z]+\d+$/i.test(token))
}

export function buildQueryParts(payload) {
  return [
    String(payload?.brand || '').trim(),
    String(payload?.grade || '').trim(),
    String(payload?.series || '').trim(),
    String(payload?.modelCode || '').trim(),
    String(payload?.boxNumber || '').trim(),
    String(payload?.name || '').trim(),
  ].filter(Boolean)
}

export function buildSearchQuery(payload) {
  return buildQueryParts(payload).join(' ').trim()
}

function uniqueTexts(list) {
  const seen = new Set()
  const output = []
  for (const item of list) {
    const value = String(item || '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function extractModelAliases(payload) {
  const source = `${payload?.name || ''} ${payload?.modelCode || ''} ${payload?.series || ''}`
  const aliases = []
  for (const item of MODEL_ALIASES) {
    if (item.pattern.test(source)) aliases.push(...item.aliases)
  }
  return uniqueTexts(aliases)
}

function extractGradeAliases(grade) {
  return uniqueTexts([grade, ...(GRADE_ALIASES[String(grade || '').toUpperCase()] || [])])
}

export function buildSearchQueries(payload) {
  const parts = buildQueryParts(payload)
  const base = buildSearchQuery(payload)
  const gradeAliases = extractGradeAliases(payload?.grade)
  const modelAliases = extractModelAliases(payload)
  const queries = [base]

  for (const modelAlias of modelAliases) {
    const variantParts = parts.map((part) => {
      if (String(part).trim() === String(payload?.name || '').trim()) return modelAlias
      return part
    })
    queries.push(variantParts.join(' ').trim())
  }

  for (const gradeAlias of gradeAliases) {
    const nameAlias = modelAliases[0] || String(payload?.name || '').trim()
    const variant = [
      String(payload?.brand || '').trim(),
      gradeAlias,
      String(payload?.series || '').trim(),
      String(payload?.modelCode || '').trim(),
      String(payload?.boxNumber || '').trim(),
      nameAlias,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
    queries.push(variant)
  }

  for (const modelAlias of modelAliases) {
    queries.push(modelAlias)
    for (const gradeAlias of gradeAliases) {
      queries.push([gradeAlias, String(payload?.modelCode || '').trim(), modelAlias].filter(Boolean).join(' ').trim())
    }
  }

  if (payload?.modelCode) queries.push(String(payload.modelCode).trim())
  return uniqueTexts(queries)
}

export function scoreMatch(candidate, payload) {
  const haystack = normalizeSearchText(candidate)
  const tokens = uniqueTexts(buildSearchQueries(payload).flatMap((query) => tokenize(query)))
  if (!haystack || tokens.length === 0) return 0

  let score = 0
  for (const token of tokens) {
    if (haystack.includes(token)) score += token.length >= 4 ? 3 : 2
  }

  const modelCode = normalizeSearchText(payload?.modelCode)
  if (modelCode && haystack.includes(modelCode)) score += 6

  const boxNumber = normalizeSearchText(payload?.boxNumber)
  if (boxNumber && haystack.includes(boxNumber)) score += 3

  const brand = normalizeSearchText(payload?.brand)
  if (brand && haystack.includes(brand)) score += 2

  return score
}

export function parseMetaImage(html) {
  return (
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    ''
  )
}

export function parsePriceNumber(value) {
  const raw = String(value || '').replace(/[^\d]/g, '')
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function dedupeBy(list, keyFn) {
  const seen = new Set()
  const out = []
  for (const item of list || []) {
    const key = keyFn(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
