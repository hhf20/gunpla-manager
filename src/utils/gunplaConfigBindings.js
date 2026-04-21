export function getFieldNameByConfigKey(key) {
  if (key === 'grade') return 'grade'
  if (key === 'series') return 'series'
  if (key === 'customTags') return 'tags'
  if (key === 'buildStatusConfig') return 'buildStatus'
  if (key === 'releaseTypes') return 'releaseType'
  if (key === 'purchasePlatforms') return 'purchasePlatform'
  return ''
}

export function getConfigUsageCount(gunplaList, key, value) {
  const field = getFieldNameByConfigKey(key)
  if (!field || !value) return 0

  if (field === 'tags') {
    return gunplaList.filter((item) => Array.isArray(item.tags) && item.tags.includes(value)).length
  }

  return gunplaList.filter((item) => item[field] === value).length
}

export function renameConfigValueInItem(item, key, oldLabel, nextLabel) {
  if (key === 'grade' && item.grade === oldLabel) return { ...item, grade: nextLabel }
  if (key === 'series' && item.series === oldLabel) return { ...item, series: nextLabel }
  if (key === 'customTags' && Array.isArray(item.tags) && item.tags.includes(oldLabel)) {
    return {
      ...item,
      tags: item.tags.map((tag) => (tag === oldLabel ? nextLabel : tag)),
    }
  }
  if (key === 'buildStatusConfig' && item.buildStatus === oldLabel) {
    return { ...item, buildStatus: nextLabel }
  }
  if (key === 'releaseTypes' && item.releaseType === oldLabel) {
    return { ...item, releaseType: nextLabel }
  }
  if (key === 'purchasePlatforms' && item.purchasePlatform === oldLabel) {
    return { ...item, purchasePlatform: nextLabel }
  }

  return item
}

export function replaceConfigSubtreeValuesInItem(item, key, labelSet, nextReplacement) {
  if (key === 'grade' && labelSet.has(item.grade)) return { ...item, grade: nextReplacement }
  if (key === 'series' && labelSet.has(item.series)) return { ...item, series: nextReplacement }
  if (key === 'customTags' && Array.isArray(item.tags)) {
    return {
      ...item,
      tags: item.tags.map((tag) => (labelSet.has(tag) ? nextReplacement : tag)),
    }
  }
  if (key === 'buildStatusConfig' && labelSet.has(item.buildStatus)) {
    return { ...item, buildStatus: nextReplacement }
  }
  if (key === 'releaseTypes' && labelSet.has(item.releaseType)) {
    return { ...item, releaseType: nextReplacement }
  }
  if (key === 'purchasePlatforms' && labelSet.has(item.purchasePlatform)) {
    return { ...item, purchasePlatform: nextReplacement }
  }

  return item
}
