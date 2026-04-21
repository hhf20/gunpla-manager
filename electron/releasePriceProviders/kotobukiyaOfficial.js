import {
  dedupeBy,
  fetchText,
  parsePriceNumber,
  scoreMatch,
} from './shared.js'

export const SITE_LABEL = 'kotobukiya-hpoi'
const COMPANY_URL = 'https://www.hpoi.net/company/28'
const DETAIL_URL = 'https://www.hpoi.net/'

function toAbsoluteUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${DETAIL_URL}${String(path).replace(/^\/+/, '')}`
}

function extractHobbyLinks(html) {
  const matches = [...html.matchAll(/hobby\/\d+/gi)].map((match) => toAbsoluteUrl(match[0]))
  return dedupeBy(matches, (url) => url).slice(0, 24)
}

function parseTitle(html) {
  return (
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ||
    html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ||
    ''
  )
}

function parseCoverImage(html) {
  return (
    html.match(/class=["']hpoi-bg-img["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
    html.match(/<img[^>]+alt=["'][^"']+Hpoi[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
    html.match(/<a[^>]+class=["'][^"']*boutique[^"']*["'][^>]+href=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)?.[1] ||
    html.match(/<img[^>]+src=["'](https:\/\/rfx\.hpoi\.net\/gk\/cover\/[^"']+)["']/i)?.[1] ||
    ''
  )
}

function extractCurrentPrice(html) {
  const matches = [
    ...html.matchAll(/(?:售价|价格|税前|税后)[^0-9]{0,12}([\d,]{3,})/gi),
    ...html.matchAll(/(?:JPY|円|日元)[^0-9]{0,12}([\d,]{3,})/gi),
    ...html.matchAll(/([\d,]{3,})[^<]{0,10}(?:JPY|円|日元)/gi),
  ]

  for (const match of matches) {
    const price = parsePriceNumber(match[1])
    if (price) return price
  }

  return null
}

async function resolveBestProductPage(payload) {
  const companyHtml = await fetchText(COMPANY_URL)
  const links = extractHobbyLinks(companyHtml)
  if (links.length === 0) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: '未在 Hpoi 寿屋品牌页中找到可用条目',
    }
  }

  const pages = await Promise.all(
    links.map(async (url) => {
      try {
        const html = await fetchText(url)
        const title = parseTitle(html)
        return { url, html, title, score: scoreMatch(title || url, payload) }
      } catch {
        return null
      }
    }),
  )

  const best = pages
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)[0]

  if (!best || best.score <= 0) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: 'Hpoi 寿屋品牌页里没有匹配到合适条目',
    }
  }

  return {
    ok: true,
    provider: SITE_LABEL,
    sourceUrl: best.url,
    html: best.html,
  }
}

export async function lookupKotobukiyaCoverImageInfo(payload) {
  try {
    const page = await resolveBestProductPage(payload)
    if (!page.ok) return page

    const imageUrl = parseCoverImage(page.html)
    if (!imageUrl) {
      return {
        ok: false,
        provider: SITE_LABEL,
        sourceUrl: page.sourceUrl,
        message: 'Hpoi 条目中没有解析到可用封面图',
      }
    }

    return {
      ok: true,
      provider: SITE_LABEL,
      sourceUrl: page.sourceUrl,
      downloadUrl: imageUrl,
      suggestedFileName: `kotobukiya_${Date.now()}.jpg`,
    }
  } catch (error) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: error?.message || String(error),
    }
  }
}

export async function lookupKotobukiyaCoverImageCandidates(payload) {
  const result = await lookupKotobukiyaCoverImageInfo(payload)
  if (!result?.ok) return result
  return {
    ok: true,
    provider: SITE_LABEL,
    sourceUrl: result.sourceUrl,
    candidates: [
      {
        provider: SITE_LABEL,
        sourceUrl: result.sourceUrl,
        downloadUrl: result.downloadUrl,
        previewUrl: result.downloadUrl,
        suggestedFileName: result.suggestedFileName,
        label: '候选封面 1',
      },
    ],
  }
}

export async function lookupKotobukiyaCurrentPrice(payload) {
  try {
    const page = await resolveBestProductPage(payload)
    if (!page.ok) return page

    const currentPrice = extractCurrentPrice(page.html)
    if (!currentPrice) {
      return {
        ok: false,
        provider: SITE_LABEL,
        sourceUrl: page.sourceUrl,
        message: 'Hpoi 条目中没有解析到价格',
      }
    }

    return {
      ok: true,
      provider: SITE_LABEL,
      sourceUrl: page.sourceUrl,
      currentPrice,
    }
  } catch (error) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: error?.message || String(error),
    }
  }
}
