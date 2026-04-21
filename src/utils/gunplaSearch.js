export function filterGunplaList(gunplaList, filterState) {
  return gunplaList.filter((item) => {
    if (filterState.type !== 'all' && item.type !== filterState.type) return false

    const search = filterState.searchText.trim().toLowerCase()
    if (search) {
      const searchTargets = [
        item.name,
        item.modelCode,
        item.boxNumber,
        item.grade,
        item.series,
        item.scale,
        item.releaseType,
        item.purchasePlatform,
        item.status,
        item.buildStatus,
        ...(Array.isArray(item.tags) ? item.tags : []),
      ]
        .map((value) => String(value || '').toLowerCase())
        .filter(Boolean)

      const matched = searchTargets.some((value) => value.includes(search))
      if (!matched) return false
    }

    if (filterState.grades.length > 0 && !filterState.grades.includes(item.grade)) return false
    if (filterState.status.length > 0 && !filterState.status.includes(item.status)) return false
    if (
      filterState.buildStatuses.length > 0 &&
      !filterState.buildStatuses.includes(item.buildStatus)
    ) {
      return false
    }
    if (filterState.series.length > 0 && !filterState.series.includes(item.series)) return false
    if (
      filterState.tags.length > 0 &&
      !filterState.tags.every((tag) => Array.isArray(item.tags) && item.tags.includes(tag))
    ) {
      return false
    }

    return true
  })
}
