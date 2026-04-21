import {
  buildSearchQueries,
  dedupeBy,
  fetchText,
  parseMetaImage,
  scoreMatch,
} from './shared.js'

export const SITE_LABEL = '1999-hobby-search'
const SITE_ORIGIN = 'https://www.1999.co.jp'

function searchUrl(query) {
  return `${SITE_ORIGIN}/eng/search?searchkey=${encodeURIComponent(query)}`
}

function toAbsoluteUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

function extractProductLinks(html) {
  const matches = [...html.matchAll(/href=["'](\/eng\/\d{7,9})["']/gi)].map((match) => match[1])
  return dedupeBy(matches.map(toAbsoluteUrl), (url) => url)
}

function parseTitle(html) {
  return (
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i)?.[1] ||
    ''
  )
}

function scoreImageUrl(url) {
  const value = String(url || '').toLowerCase()
  let score = 0
  if (value.includes('box')) score += 10
  if (value.includes('package')) score += 8
  if (value.includes('cover')) score += 7
  if (value.includes('main')) score += 4
  if (value.includes('detail')) score += 1
  if (value.includes('_01') || value.includes('-01')) score -= 1
  return score
}

function extractImageCandidates(html) {
  const rawUrls = [
    parseMetaImage(html),
    ...[...html.matchAll(/https?:\/\/[^"' )]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"' )]*)?/gi)].map(
      (match) => match[0],
    ),
    ...[...html.matchAll(/["'](\/[^"' )]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"' )]*)?)["']/gi)].map(
      (match) => match[1],
    ),
  ]

  return dedupeBy(rawUrls.map(toAbsoluteUrl).filter(Boolean), (url) => url)
    .map((url) => ({ url, score: scoreImageUrl(url) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((item, index) => ({
      downloadUrl: item.url,
      previewUrl: item.url,
      suggestedFileName: `hobbysearch_${Date.now()}_${index + 1}.jpg`,
      label: item.score >= 8 ? `候选封面 ${index + 1}` : `候选图片 ${index + 1}`,
    }))
}

async function resolveProductPage(payload) {
  let links = []
  for (const query of buildSearchQueries(payload)) {
    const html = await fetchText(searchUrl(query))
    links = extractProductLinks(html).slice(0, 8)
    if (links.length > 0) break
  }
  if (links.length === 0) {
    return { ok: false, provider: SITE_LABEL, message: '未在 Hobby Search 中搜索到匹配商品' }
  }

  const details = await Promise.all(
    links.map(async (url) => {
      try {
        const detailHtml = await fetchText(url)
        const title = parseTitle(detailHtml)
        return { url, detailHtml, title, score: scoreMatch(title || url, payload) }
      } catch {
        return null
      }
    }),
  )

  const best = details
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)[0]

  if (!best?.detailHtml) {
    return { ok: false, provider: SITE_LABEL, message: '未找到可用的 Hobby Search 商品页' }
  }

  return { ok: true, provider: SITE_LABEL, sourceUrl: best.url, html: best.detailHtml }
}

export async function lookupHobbySearchCoverImageInfo(payload) {
  try {
    const page = await resolveProductPage(payload)
    if (!page.ok) return page

    const imageUrl = toAbsoluteUrl(parseMetaImage(page.html))
    if (!imageUrl) {
      return {
        ok: false,
        provider: SITE_LABEL,
        sourceUrl: page.sourceUrl,
        message: 'Hobby Search 商品页中未解析到封面图',
      }
    }

    return {
      ok: true,
      provider: SITE_LABEL,
      sourceUrl: page.sourceUrl,
      downloadUrl: imageUrl,
      suggestedFileName: `hobbysearch_${Date.now()}.jpg`,
    }
  } catch (error) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: error?.message || String(error),
    }
  }
}

export async function lookupHobbySearchCoverImageCandidates(payload) {
  try {
    const page = await resolveProductPage(payload)
    if (!page.ok) return page

    const candidates = extractImageCandidates(page.html).map((candidate) => ({
      ...candidate,
      provider: SITE_LABEL,
      sourceUrl: page.sourceUrl,
    }))

    if (candidates.length === 0) {
      return {
        ok: false,
        provider: SITE_LABEL,
        sourceUrl: page.sourceUrl,
        message: 'Hobby Search 商品页中未解析到可选图片',
      }
    }

    return { ok: true, provider: SITE_LABEL, sourceUrl: page.sourceUrl, candidates }
  } catch (error) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: error?.message || String(error),
    }
  }
}
