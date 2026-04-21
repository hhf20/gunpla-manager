import {
  lookupGunplaCoverImageInfo,
  lookupGunplaCoverImageCandidates,
  lookupGunplaReleasePrice,
  SITE_LABEL as FANDOM_PROVIDER,
} from './gunplaFandom.js'
import {
  lookupHobbySearchCoverImageInfo,
  lookupHobbySearchCoverImageCandidates,
  SITE_LABEL as HOBBY_SEARCH_PROVIDER,
} from './hobbySearch.js'
import {
  lookupKotobukiyaCoverImageInfo,
  lookupKotobukiyaCoverImageCandidates,
  lookupKotobukiyaCurrentPrice,
  SITE_LABEL as KOTOBUKIYA_PROVIDER,
} from './kotobukiyaOfficial.js'
import {
  lookupBlokeesCoverImageInfo,
  lookupBlokeesCoverImageCandidates,
  SITE_LABEL as BLOKEES_PROVIDER,
} from './blokeesOfficial.js'

const BASE_COVER_PROVIDERS = {
  [FANDOM_PROVIDER]: {
    provider: FANDOM_PROVIDER,
    run: lookupGunplaCoverImageInfo,
    search: lookupGunplaCoverImageCandidates,
  },
  [HOBBY_SEARCH_PROVIDER]: {
    provider: HOBBY_SEARCH_PROVIDER,
    run: lookupHobbySearchCoverImageInfo,
    search: lookupHobbySearchCoverImageCandidates,
  },
  [KOTOBUKIYA_PROVIDER]: {
    provider: KOTOBUKIYA_PROVIDER,
    run: lookupKotobukiyaCoverImageInfo,
    search: lookupKotobukiyaCoverImageCandidates,
  },
  [BLOKEES_PROVIDER]: {
    provider: BLOKEES_PROVIDER,
    run: lookupBlokeesCoverImageInfo,
    search: lookupBlokeesCoverImageCandidates,
  },
  'hobby-search': {
    provider: HOBBY_SEARCH_PROVIDER,
    run: lookupHobbySearchCoverImageInfo,
    search: lookupHobbySearchCoverImageCandidates,
  },
  'kotobukiya-official': {
    provider: KOTOBUKIYA_PROVIDER,
    run: lookupKotobukiyaCoverImageInfo,
    search: lookupKotobukiyaCoverImageCandidates,
  },
  'blokees-official': {
    provider: BLOKEES_PROVIDER,
    run: lookupBlokeesCoverImageInfo,
    search: lookupBlokeesCoverImageCandidates,
  },
}

const PRICE_PROVIDERS = [
  { provider: KOTOBUKIYA_PROVIDER, run: lookupKotobukiyaCurrentPrice },
  { provider: FANDOM_PROVIDER, run: lookupGunplaReleasePrice },
]

function withProviderHint(payload, provider) {
  const hint = String(payload?.providerHint || '').trim()
  if (!hint) return provider
  const aliases = new Set([provider])
  if (provider === HOBBY_SEARCH_PROVIDER) aliases.add('hobby-search')
  if (provider === KOTOBUKIYA_PROVIDER) aliases.add('kotobukiya-official')
  if (provider === BLOKEES_PROVIDER) aliases.add('blokees-official')
  return aliases.has(hint) ? provider : null
}

function buildCoverProviderOrder(payload) {
  const hint = String(payload?.providerHint || '').trim()
  if (hint && BASE_COVER_PROVIDERS[hint]) {
    return [BASE_COVER_PROVIDERS[hint]]
  }

  const brandText = `${payload?.brand || ''} ${payload?.series || ''} ${payload?.name || ''}`.toLowerCase()
  if (brandText.includes('kotobukiya') || brandText.includes('寿屋')) {
    return [
      BASE_COVER_PROVIDERS[KOTOBUKIYA_PROVIDER],
      BASE_COVER_PROVIDERS[HOBBY_SEARCH_PROVIDER],
      BASE_COVER_PROVIDERS[BLOKEES_PROVIDER],
      BASE_COVER_PROVIDERS[FANDOM_PROVIDER],
    ]
  }
  if (brandText.includes('blokees') || brandText.includes('布鲁可')) {
    return [
      BASE_COVER_PROVIDERS[BLOKEES_PROVIDER],
      BASE_COVER_PROVIDERS[HOBBY_SEARCH_PROVIDER],
      BASE_COVER_PROVIDERS[KOTOBUKIYA_PROVIDER],
      BASE_COVER_PROVIDERS[FANDOM_PROVIDER],
    ]
  }

  return [
    BASE_COVER_PROVIDERS[FANDOM_PROVIDER],
    BASE_COVER_PROVIDERS[HOBBY_SEARCH_PROVIDER],
    BASE_COVER_PROVIDERS[KOTOBUKIYA_PROVIDER],
    BASE_COVER_PROVIDERS[BLOKEES_PROVIDER],
  ]
}

function isFandom403(result, provider) {
  return provider === FANDOM_PROVIDER && /HTTP 403/i.test(String(result?.message || ''))
}

function normalizeCoverLookupMessage(result, provider, isForcedProvider) {
  if (isFandom403(result, provider)) {
    return isForcedProvider
      ? 'Gunpla Wiki 当前访问受限，请改用“自动选择”或“1999 Hobby Search”。'
      : ''
  }
  return String(result?.message || '').trim()
}

export async function lookupModelCoverImageInfo(payload) {
  const errors = []
  const forcedProvider = String(payload?.providerHint || '').trim()
  const isForcedProvider = Boolean(forcedProvider)
  for (const entry of buildCoverProviderOrder(payload)) {
    if (forcedProvider && !withProviderHint(payload, entry.provider)) continue
    const result = await entry.run(payload)
    if (result?.ok) return result
    const message = normalizeCoverLookupMessage(result, entry.provider, isForcedProvider)
    if (message) {
      if (isForcedProvider) errors.push(message)
      else errors.push(`${entry.provider}: ${message}`)
    }
  }

  return {
    ok: false,
    message:
      errors.length > 0
        ? errors.join(' | ')
        : '未找到可用的封面图来源，请优先尝试“自动选择”或“1999 Hobby Search”。',
  }
}

export async function lookupModelCoverImageCandidates(payload) {
  const errors = []
  const forcedProvider = String(payload?.providerHint || '').trim()
  const isForcedProvider = Boolean(forcedProvider)
  for (const entry of buildCoverProviderOrder(payload)) {
    if (forcedProvider && !withProviderHint(payload, entry.provider)) continue
    const result = await entry.search(payload)
    if (result?.ok && Array.isArray(result.candidates) && result.candidates.length > 0) return result
    const message = normalizeCoverLookupMessage(result, entry.provider, isForcedProvider)
    if (message) {
      if (isForcedProvider) errors.push(message)
      else errors.push(`${entry.provider}: ${message}`)
    }
  }

  return {
    ok: false,
    message:
      errors.length > 0
        ? errors.join(' | ')
        : '未找到可用的封面图来源，请优先尝试“自动选择”或“1999 Hobby Search”。',
  }
}

export async function lookupModelReleasePrice(payload) {
  return lookupGunplaReleasePrice(payload)
}

export async function lookupModelCurrentPriceSnapshot(payload) {
  const errors = []
  for (const entry of PRICE_PROVIDERS) {
    if (payload?.providerHint && !withProviderHint(payload, entry.provider)) continue
    const result = await entry.run(payload)
    if (result?.ok && Number(result.currentPrice || result.releasePrice) > 0) {
      const currentPrice = Number(result.currentPrice || result.releasePrice)
      return {
        ok: true,
        provider: result.provider || entry.provider,
        sourceUrl: result.sourceUrl || '',
        currentPrice,
        sampledAt: new Date().toISOString(),
      }
    }
    if (result?.message) errors.push(`${entry.provider}: ${result.message}`)
  }

  return {
    ok: false,
    message: errors.length > 0 ? errors.join(' | ') : '未找到可用的价格来源',
  }
}
