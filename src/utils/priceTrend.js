import { DEFAULT_PRICE_TREND } from './gunplaAppData.js'

export const toPriceNumber = (value) => Number(value) || 0

export const toPriceCurrency = (value) =>
  `￥${toPriceNumber(value).toLocaleString('zh-CN')}`

export function normalizePriceTrendChannels(channels) {
  return DEFAULT_PRICE_TREND.channels.map((base, index) => ({
    id: channels?.[index]?.id || base.id,
    label: channels?.[index]?.label || base.label,
    price: toPriceNumber(channels?.[index]?.price),
  }))
}

export function averageTrendPrice(channels) {
  const prices = (channels || [])
    .map((item) => toPriceNumber(item.price))
    .filter((value) => value > 0)

  if (!prices.length) return 0

  return Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(1))
}

export function clonePriceTrend(trend) {
  return {
    enabled: true,
    benchmarkPrice: toPriceNumber(trend?.benchmarkPrice),
    taxIncludedPrice: toPriceNumber(trend?.taxIncludedPrice),
    releaseYear: trend?.releaseYear || '',
    reissueMonth: trend?.reissueMonth || '',
    targetPrice: toPriceNumber(trend?.targetPrice),
    channels: normalizePriceTrendChannels(trend?.channels),
    history: Array.isArray(trend?.history)
      ? trend.history.map((entry, index) => ({
          id: entry?.id || `history-${index + 1}`,
          label: entry?.label || `璁板綍 ${index + 1}`,
          averagePrice: toPriceNumber(entry?.averagePrice),
          recordedAt: entry?.recordedAt || '',
          channels: normalizePriceTrendChannels(entry?.channels),
        }))
      : [],
  }
}

export function buildPriceTrendChart(history, targetPrice) {
  const width = 620
  const left = 28
  const right = 592
  const top = 28
  const bottom = 196
  const values = history.map((entry) => toPriceNumber(entry.averagePrice)).filter((value) => value > 0)
  const lowest = values.length ? Math.min(...values) : 0
  const highest = values.length ? Math.max(...values) : 0
  const target = toPriceNumber(targetPrice)
  const min = Math.min(...[lowest || Infinity, target > 0 ? target : Infinity].filter(Number.isFinite))
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Math.max(safeMin + 1, highest, target)
  const range = Math.max(1, safeMax - safeMin)
  const toY = (value) => bottom - ((value - safeMin) / range) * (bottom - top)

  const dots = history.map((entry, index) => ({
    ...entry,
    x:
      history.length === 1
        ? (left + right) / 2
        : left + (index / (history.length - 1)) * (right - left),
    y: toY(toPriceNumber(entry.averagePrice)),
  }))

  return {
    width,
    left,
    right,
    bottom,
    polyline: dots.map((dot) => `${dot.x},${dot.y}`).join(' '),
    dots,
    lowest,
    lowestY: lowest > 0 ? toY(lowest) : null,
    target,
    targetY: target > 0 ? toY(target) : null,
  }
}

export function buildCompactTrendPolyline(history, width = 360, height = 150) {
  if (!Array.isArray(history) || history.length === 0) return { points: '', dots: [] }

  const max = Math.max(...history.map((item) => toPriceNumber(item.averagePrice)), 1)
  const min = Math.min(...history.map((item) => toPriceNumber(item.averagePrice)), max)
  const range = Math.max(1, max - min)

  const dots = history.map((item, index) => ({
    ...item,
    x: history.length === 1 ? width / 2 : (index / (history.length - 1)) * width,
    y: height - 10 - ((toPriceNumber(item.averagePrice) - min) / range) * (height - 40),
  }))

  return {
    points: dots.map((dot) => `${dot.x},${dot.y}`).join(' '),
    dots,
  }
}

