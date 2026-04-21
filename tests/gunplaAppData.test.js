import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStoredItem, parseTheme } from '../src/utils/gunplaAppData.js'

test('normalizeStoredItem migrates legacy price history into price trend history', () => {
  const item = normalizeStoredItem({
    id: 1,
    name: '沙扎比',
    priceHistory: [
      { date: '2026-03-01', price: 430, provider: '市场均价' },
      { date: '2026-03-08', price: 415, provider: '市场均价' },
    ],
    currentPrice: 410,
  })

  assert.equal(item.priceTrend.history.length, 2)
  assert.equal(item.priceTrend.channels[0].price, 410)
  assert.equal(item.priceTrend.history[0].averagePrice, 430)
})

test('parseTheme falls back to default preset when preset is invalid', () => {
  const theme = parseTheme({
    preset: 'unknown',
    backgroundOpacity: 9,
  })

  assert.equal(theme.preset, 'hangar')
  assert.equal(theme.desktopStyleId, 'legacy')
  assert.equal(theme.backgroundOpacity, 1)
})

test('parseTheme accepts desktop style id and falls back when invalid', () => {
  const showcase = parseTheme({
    preset: 'gallery',
    desktopStyleId: 'showcase',
  })

  const fallback = parseTheme({
    desktopStyleId: 'unknown-style',
  })

  assert.equal(showcase.desktopStyleId, 'showcase')
  assert.equal(fallback.desktopStyleId, 'legacy')
})
