import test from 'node:test'
import assert from 'node:assert/strict'
import {
  averageTrendPrice,
  buildCompactTrendPolyline,
  buildPriceTrendChart,
  clonePriceTrend,
} from '../src/utils/priceTrend.js'

test('average trend price ignores empty channels', () => {
  const average = averageTrendPrice([
    { price: 300 },
    { price: 0 },
    { price: 450 },
  ])

  assert.equal(average, 375)
})

test('clone price trend normalizes missing fields', () => {
  const trend = clonePriceTrend({
    targetPrice: '388',
    channels: [{ label: 'PDD', price: '420' }],
  })

  assert.equal(trend.targetPrice, 388)
  assert.equal(trend.channels.length, 3)
  assert.equal(trend.channels[0].label, 'PDD')
})

test('chart builders expose reference line positions', () => {
  const history = [
    { id: 'a', averagePrice: 460 },
    { id: 'b', averagePrice: 420 },
    { id: 'c', averagePrice: 390 },
  ]

  const chart = buildPriceTrendChart(history, 400)
  const compact = buildCompactTrendPolyline(history)

  assert.equal(chart.lowest, 390)
  assert.ok(chart.lowestY !== null)
  assert.ok(chart.targetY !== null)
  assert.ok(compact.points.length > 0)
})
