/**
 * Gunpla Wiki（gunpla.fandom.com）MediaWiki API：发售价与封面对应的盒绘图片。
 */

import { buildSearchQueries } from './shared.js'

const API = 'https://gunpla.fandom.com/api.php'
export const SITE_LABEL = 'gunpla-fandom'

const DEFAULT_HEADERS = {
  'User-Agent': 'GunplaManager/2.0 (Electron; wiki lookup; +https://github.com/)',
  Accept: 'application/json',
  Referer: 'https://gunpla.fandom.com/',
}

export function wikiPageUrl(title) {
  const enc = encodeURIComponent(title).replace(/%20/g, '_')
  return `https://gunpla.fandom.com/wiki/${enc}`
}

class ProviderHttpError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ProviderHttpError'
    this.status = details.status || 0
    this.url = details.url || ''
    this.cfRay = details.cfRay || ''
    this.requestId = details.requestId || ''
    this.server = details.server || ''
    this.contentType = details.contentType || ''
  }
}

export async function fetchJson(url, ms = 14000) {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(ms),
  })
  if (!res.ok) {
    throw new ProviderHttpError(`HTTP ${res.status}`, {
      status: res.status,
      url,
      cfRay: res.headers.get('cf-ray') || '',
      requestId: res.headers.get('x-request-id') || '',
      server: res.headers.get('server') || '',
      contentType: res.headers.get('content-type') || '',
    })
  }
  return res.json()
}

function buildDiagnostic(error) {
  if (!(error instanceof ProviderHttpError)) return null
  return {
    provider: SITE_LABEL,
    status: error.status || 0,
    url: error.url || '',
    cfRay: error.cfRay || '',
    requestId: error.requestId || '',
    server: error.server || '',
    contentType: error.contentType || '',
  }
}

function formatLookupError(error) {
  if (error?.name === 'TimeoutError') {
    return 'Gunpla Wiki 请求超时，请检查网络后重试。'
  }
  if (error instanceof ProviderHttpError && error.status === 403) {
    return 'Gunpla Wiki 在当前网络下返回 403，可能是该用户的出口 IP、代理、DNS 或安全软件被站点风控拦截。'
  }
  return error?.message || String(error)
}

function normalizeTokens(str) {
  if (!str || typeof str !== 'string') return []
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .split(/[^a-z0-9\u4e00-\u9fff]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 || /^[a-z]\d+$/i.test(t))
}

function titleScore(title, tokens) {
  const tl = title.toLowerCase()
  let s = 0
  for (const t of tokens) {
    if (tl.includes(t)) s += 2
  }
  return s
}

function uniqueTokensFromQueries(queries) {
  const seen = new Set()
  const output = []
  for (const query of queries || []) {
    for (const token of normalizeTokens(query)) {
      if (seen.has(token)) continue
      seen.add(token)
      output.push(token)
    }
  }
  return output
}

function preferBaseKit(title, queryLower) {
  let penalty = 0
  const variantHints = [
    'titanium',
    'clear',
    'limited',
    'exclusive',
    'p-bandai',
    'premium',
    '彩透',
    '镀',
    '台场',
    '基地',
  ]
  for (const h of variantHints) {
    if (title.toLowerCase().includes(h) && !queryLower.includes(h)) penalty += 5
  }
  return penalty
}

/**
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 * @returns {Promise<{ ok: true, title: string, wikitext: string, sourceUrl: string } | { ok: false, provider: string, message: string, sourceUrl?: string }>}
 */
export async function resolveGunplaWikiPage(payload) {
  const name = String(payload?.name || '').trim()
  const modelCode = String(payload?.modelCode || '').trim()
  const grade = String(payload?.grade || '').trim()

  if (!name && !modelCode) {
    return { ok: false, provider: SITE_LABEL, message: '请填写模型名称或货号后再查询' }
  }

  const queries = buildSearchQueries({ ...payload, grade, modelCode, name })
  const srsearch = queries[0] || [grade, modelCode, name].filter(Boolean).join(' ').trim()
  const queryLower = srsearch.toLowerCase()
  const tokens = uniqueTokensFromQueries(queries)

  /** @type {{ title: string }[]} */
  let hits = []
  const titleSeen = new Set()
  for (const query of queries) {
    const searchUrl = `${API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=15&format=json&formatversion=2`
    const searchData = await fetchJson(searchUrl)
    const currentHits = searchData?.query?.search || []
    for (const hit of currentHits) {
      const title = String(hit?.title || '').trim()
      if (!title || titleSeen.has(title)) continue
      titleSeen.add(title)
      hits.push({ title })
    }
  }

  if (!hits.length && name) {
    for (const query of queries) {
      const osUrl = `${API}?action=opensearch&search=${encodeURIComponent(query)}&limit=12&format=json`
      const os = await fetchJson(osUrl)
      const titles = os?.[1] || []
      for (const title of titles) {
        const nextTitle = String(title || '').trim()
        if (!nextTitle || titleSeen.has(nextTitle)) continue
        titleSeen.add(nextTitle)
        hits.push({ title: nextTitle })
      }
    }
  }

  if (!hits.length) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: '维基中未找到匹配条目，可尝试英文名或「系列+机体名」（如 RG Strike Freedom）',
    }
  }

  let best = hits[0].title
  let bestVal = -1
  for (const h of hits) {
    const t = h.title
    const sc = tokens.length ? titleScore(t, tokens) : 0
    const pen = preferBaseKit(t, queryLower)
    const val = sc - pen + (t.length < 80 ? 0 : -0.5)
    if (val > bestVal) {
      bestVal = val
      best = t
    }
  }

  if (bestVal < 1 && hits.length > 1) {
    best = hits[0].title
  }

  const parseUrl = `${API}?action=parse&page=${encodeURIComponent(best)}&prop=wikitext&format=json&formatversion=2`
  const parseData = await fetchJson(parseUrl)
  const wikitext = parseData?.parse?.wikitext || ''
  if (!wikitext) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: '无法读取条目正文',
      sourceUrl: wikiPageUrl(best),
    }
  }

  return {
    ok: true,
    title: best,
    wikitext,
    sourceUrl: wikiPageUrl(best),
  }
}

/**
 * 从 {{Plamo_Infobox|image = ...}} 取主图文件名；可含多图时用分号取第一张。
 * @param {string} wikitext
 * @returns {string|null} 不含 `File:` 前缀的文件名，或 null
 */
export function extractInfoboxImageFileName(wikitext) {
  const m = wikitext.match(/\|\s*image\s*=\s*([^|\n}]+)/i)
  if (!m) return null
  let raw = m[1].trim()
  raw = raw.split(';')[0].trim()
  const link = raw.match(/\[\[(?:File|Image):\s*([^|\]]+)/i)
  if (link) raw = link[1].trim()
  raw = raw.replace(/^File:/i, '').trim()
  return raw || null
}

/**
 * @param {string} pageTitle
 * @returns {Promise<string[]>} 条目引用的图片名（无 File: 前缀），顺序与页面一致
 */
export async function fetchParseImageFileNames(pageTitle) {
  const url = `${API}?action=parse&page=${encodeURIComponent(pageTitle)}&prop=images&format=json&formatversion=2`
  const data = await fetchJson(url)
  const list = data?.parse?.images
  return Array.isArray(list) ? list : []
}

/**
 * @param {string} fileBaseName 可有或可无 File: 前缀
 * @returns {Promise<string|null>} 原始 HTTP(S) 图片地址
 */
export async function fetchImageDownloadUrl(fileBaseName) {
  let name = String(fileBaseName || '').trim()
  if (!name) return null
  if (!/^file:/i.test(name)) name = `File:${name}`
  const q = `${API}?action=query&titles=${encodeURIComponent(name)}&prop=imageinfo&iiprop=url&format=json&formatversion=2`
  const data = await fetchJson(q)
  const pages = data?.query?.pages
  if (!pages) return null
  const page = pages[Object.keys(pages)[0]]
  const ii = page?.imageinfo?.[0]
  const u = ii?.url
  return typeof u === 'string' && u.startsWith('http') ? u : null
}

function pickFallbackImageName(names) {
  if (!names.length) return null
  const lower = (s) => s.toLowerCase()
  const scored = names.map((n) => {
    const l = lower(n)
    let s = 0
    if (l.includes('box')) s += 5
    if (l.includes('package') || l.includes('packaging')) s += 4
    if (l.includes('art')) s += 2
    if (/^rg_|^hg_|^mg_|^pg_/i.test(n)) s += 1
    if (l.includes('_01.') || l.endsWith('_01.jpg')) s -= 2
    return { n, s }
  })
  scored.sort((a, b) => b.s - a.s)
  return scored[0]?.n || names[0]
}

function scoreImageFileName(name) {
  const value = String(name || '').toLowerCase()
  let score = 0
  if (value.includes('box')) score += 10
  if (value.includes('package') || value.includes('packaging')) score += 8
  if (value.includes('art')) score += 4
  if (value.includes('front')) score += 2
  if (value.includes('_01') || value.endsWith('_01.jpg')) score -= 1
  return score
}

/**
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 */
export async function lookupGunplaReleasePrice(payload) {
  try {
    const entry = await resolveGunplaWikiPage(payload)
    if (!entry.ok) return entry

    const priceMatch = entry.wikitext.match(/\|\s*Price\s*=\s*¥?\s*([\d,]+)/i)
    if (!priceMatch) {
      return {
        ok: false,
        provider: SITE_LABEL,
        message: '该条目未标注 Price 字段，请手动填写发售价',
        sourceUrl: entry.sourceUrl,
      }
    }

    const jpy = parseInt(String(priceMatch[1]).replace(/,/g, ''), 10)
    if (!Number.isFinite(jpy) || jpy <= 0 || jpy > 1_000_000) {
      return {
        ok: false,
        provider: SITE_LABEL,
        message: '解析到的价格无效',
        sourceUrl: entry.sourceUrl,
      }
    }

    return {
      ok: true,
      releasePrice: jpy,
      sourceUrl: entry.sourceUrl,
      provider: SITE_LABEL,
    }
  } catch (e) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: formatLookupError(e),
      diagnostic: buildDiagnostic(e),
    }
  }
}

/**
 * 解析盒封示意图下载地址（不下载二进制）。
 * @param {{ name?: string, modelCode?: string, grade?: string }} payload
 */
export async function lookupGunplaCoverImageInfo(payload) {
  try {
    const entry = await resolveGunplaWikiPage(payload)
    if (!entry.ok) return entry

    let fileName = extractInfoboxImageFileName(entry.wikitext)
    if (!fileName) {
      const imgs = await fetchParseImageFileNames(entry.title)
      fileName = pickFallbackImageName(imgs)
    }

    if (!fileName) {
      return {
        ok: false,
        provider: SITE_LABEL,
        message: '该条目未找到可用的盒绘/图片引用',
        sourceUrl: entry.sourceUrl,
      }
    }

    const downloadUrl = await fetchImageDownloadUrl(fileName)
    if (!downloadUrl) {
      return {
        ok: false,
        provider: SITE_LABEL,
        message: '无法解析图片下载地址',
        sourceUrl: entry.sourceUrl,
      }
    }

    return {
      ok: true,
      downloadUrl,
      suggestedFileName: fileName.split('/').pop() || 'wiki-cover.jpg',
      sourceUrl: entry.sourceUrl,
      provider: SITE_LABEL,
    }
  } catch (e) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: formatLookupError(e),
      diagnostic: buildDiagnostic(e),
    }
  }
}

export async function lookupGunplaCoverImageCandidates(payload) {
  try {
    const entry = await resolveGunplaWikiPage(payload)
    if (!entry.ok) return entry

    const fileNames = []
    const primary = extractInfoboxImageFileName(entry.wikitext)
    if (primary) fileNames.push(primary)

    const parsedImages = await fetchParseImageFileNames(entry.title)
    for (const imageName of parsedImages) {
      if (!fileNames.includes(imageName)) fileNames.push(imageName)
    }

    const rankedNames = fileNames
      .map((name) => ({ name, score: scoreImageFileName(name) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)

    const candidates = []
    for (let index = 0; index < rankedNames.length; index += 1) {
      const { name } = rankedNames[index]
      try {
        const downloadUrl = await fetchImageDownloadUrl(name)
        if (!downloadUrl) continue
        candidates.push({
          provider: SITE_LABEL,
          sourceUrl: entry.sourceUrl,
          downloadUrl,
          previewUrl: downloadUrl,
          suggestedFileName: name.split('/').pop() || `wiki-cover-${index + 1}.jpg`,
          label: index === 0 ? '推荐封面' : `候选图片 ${index + 1}`,
        })
      } catch {
        // Skip individual image resolution failures and keep remaining candidates usable.
      }
    }

    if (candidates.length === 0) {
      const fallback = await lookupGunplaCoverImageInfo(payload)
      if (fallback?.ok && fallback.downloadUrl) {
        return {
          ok: true,
          provider: SITE_LABEL,
          sourceUrl: fallback.sourceUrl,
          candidates: [
            {
              provider: SITE_LABEL,
              sourceUrl: fallback.sourceUrl,
              downloadUrl: fallback.downloadUrl,
              previewUrl: fallback.downloadUrl,
              suggestedFileName: fallback.suggestedFileName,
              label: '推荐封面',
            },
          ],
        }
      }
      return {
        ok: false,
        provider: SITE_LABEL,
        sourceUrl: entry.sourceUrl,
        message: '该条目未找到可选图片',
      }
    }

    return { ok: true, provider: SITE_LABEL, sourceUrl: entry.sourceUrl, candidates }
  } catch (e) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: formatLookupError(e),
      diagnostic: buildDiagnostic(e),
    }
  }
}
