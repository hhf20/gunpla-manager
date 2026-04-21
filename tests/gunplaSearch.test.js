import test from 'node:test'
import assert from 'node:assert/strict'
import { filterGunplaList } from '../src/utils/gunplaSearch.js'

const gunplaList = [
  {
    id: 1,
    type: 'owned',
    name: '高达 Ver.2.0',
    modelCode: 'RX-78-2',
    boxNumber: '40',
    grade: 'RG',
    series: 'UC',
    scale: '1/144',
    releaseType: '通贩',
    purchasePlatform: '淘宝',
    status: '未拼装',
    buildStatus: '未开盒',
    tags: ['经典', '主角机'],
  },
  {
    id: 2,
    type: 'wishlist',
    name: '自由高达',
    modelCode: 'ZGMF-X10A',
    boxNumber: '11',
    grade: 'MG',
    series: 'SEED',
    scale: '1/100',
    releaseType: 'PB限定',
    purchasePlatform: '拼多多',
    status: '',
    buildStatus: '',
    tags: ['PB限定'],
  },
]

test('search matches model code and box number', () => {
  assert.equal(filterGunplaList(gunplaList, { searchText: 'rx-78', type: 'all', grades: [], status: [], buildStatuses: [], series: [], tags: [] }).length, 1)
  assert.equal(filterGunplaList(gunplaList, { searchText: '40', type: 'all', grades: [], status: [], buildStatuses: [], series: [], tags: [] }).length, 1)
})

test('search matches tags and release type', () => {
  assert.equal(filterGunplaList(gunplaList, { searchText: 'pb', type: 'all', grades: [], status: [], buildStatuses: [], series: [], tags: [] }).length, 1)
  assert.equal(filterGunplaList(gunplaList, { searchText: '主角机', type: 'all', grades: [], status: [], buildStatuses: [], series: [], tags: [] }).length, 1)
})
