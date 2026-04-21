export const COVER_PROVIDER_OPTIONS = [
  { label: '自动选择', value: 'auto' },
  { label: 'Gunpla Wiki', value: 'gunpla-fandom' },
  { label: '1999 Hobby Search', value: '1999-hobby-search' },
  { label: '寿屋（Hpoi）', value: 'kotobukiya-hpoi' },
  { label: 'BLOKEES（Brick4）', value: 'blokees-brick4' },
]

export async function fetchGunplaReleasePriceFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaReleasePrice) {
    return {
      ok: false,
      message: '联网查询发售价仅在金屋藏胶 / Gunpla Manager 桌面版中可用。',
    }
  }

  return window.api.fetchGunplaReleasePrice(payload || {})
}

export async function fetchGunplaCoverImageFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaCoverImage) {
    return {
      ok: false,
      message: '联网获取封面图仅在金屋藏胶 / Gunpla Manager 桌面版中可用。',
    }
  }

  return window.api.fetchGunplaCoverImage(payload || {})
}

export async function searchGunplaCoverImagesFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.searchGunplaCoverImages) {
    return {
      ok: false,
      message: '联网获取封面图仅在金屋藏胶 / Gunpla Manager 桌面版中可用。',
    }
  }

  return window.api.searchGunplaCoverImages(payload || {})
}

export async function saveGunplaCoverCandidateFromMain(candidate) {
  if (typeof window === 'undefined' || !window.api?.saveGunplaCoverCandidate) {
    return {
      ok: false,
      message: '联网获取封面图仅在金屋藏胶 / Gunpla Manager 桌面版中可用。',
    }
  }

  return window.api.saveGunplaCoverCandidate(candidate || {})
}

export async function fetchGunplaPriceSnapshotFromMain(payload) {
  if (typeof window === 'undefined' || !window.api?.fetchGunplaPriceSnapshot) {
    return {
      ok: false,
      message: '联网查询价格趋势仅在金屋藏胶 / Gunpla Manager 桌面版中可用。',
    }
  }

  return window.api.fetchGunplaPriceSnapshot(payload || {})
}
