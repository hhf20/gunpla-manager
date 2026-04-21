import {
  fetchText,
  scoreMatch,
} from './shared.js'

export const SITE_LABEL = 'blokees-brick4'
const BRAND_URL = 'https://brick4.com/brand/65'
const SITE_ORIGIN = 'https://brick4.com'
const CDN_ORIGIN = 'https://cdn.brick4.com'

function toAbsoluteUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_ORIGIN}${String(path).startsWith('/') ? '' : '/'}${path}`
}

function extractBrandEntries(html) {
  return html
    .split('<div class="item_set card">')
    .slice(1)
    .map((block) => {
      const href = block.match(/href="([^"]+)"/i)?.[1] || ''
      const title =
        block.match(/<div class="title"[^>]+title="([^"]+)"/i)?.[1] ||
        block.match(/<div class="title">([^<]+)<\/div>/i)?.[1] ||
        ''
      const setNumber = block.match(/<div class="number">([^<]+)<\/div>/i)?.[1] || ''
      const imagePath = block.match(/data-imgurl="([^"]+)"/i)?.[1] || ''
      if (!href || !title || !imagePath) return null
      return {
        url: toAbsoluteUrl(href),
        title: String(title).trim(),
        setNumber: String(setNumber).trim(),
        imageUrl: imagePath.startsWith('upload/')
          ? `${CDN_ORIGIN}/${imagePath}`
          : imagePath.startsWith('/upload/')
            ? `${CDN_ORIGIN}${imagePath}`
            : toAbsoluteUrl(imagePath),
      }
    })
    .filter(Boolean)
}

async function resolveBestSet(payload) {
  const brandHtml = await fetchText(BRAND_URL)
  const entries = extractBrandEntries(brandHtml)
  if (entries.length === 0) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: '未在 Brick4 布鲁可品牌页中找到可用条目',
    }
  }

  const best = entries
    .map((entry) => ({
      ...entry,
      score: Math.max(
        scoreMatch(entry.title, payload),
        scoreMatch(`${entry.setNumber} ${entry.title}`, payload),
      ),
    }))
    .sort((left, right) => right.score - left.score)[0]

  if (!best || best.score <= 0) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: 'Brick4 布鲁可品牌页里没有匹配到合适条目',
    }
  }

  return {
    ok: true,
    provider: SITE_LABEL,
    sourceUrl: best.url,
    downloadUrl: best.imageUrl,
  }
}

export async function lookupBlokeesCoverImageInfo(payload) {
  try {
    const page = await resolveBestSet(payload)
    if (!page.ok) return page

    if (!page.downloadUrl) {
      return {
        ok: false,
        provider: SITE_LABEL,
        sourceUrl: page.sourceUrl,
        message: 'Brick4 条目中没有解析到可用封面图',
      }
    }

    return {
      ok: true,
      provider: SITE_LABEL,
      sourceUrl: page.sourceUrl,
      downloadUrl: page.downloadUrl,
      suggestedFileName: `blokees_${Date.now()}.jpg`,
    }
  } catch (error) {
    return {
      ok: false,
      provider: SITE_LABEL,
      message: error?.message || String(error),
    }
  }
}

export async function lookupBlokeesCoverImageCandidates(payload) {
  const result = await lookupBlokeesCoverImageInfo(payload)
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
