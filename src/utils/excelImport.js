import * as XLSX from 'xlsx'

function normalizeHeader(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

const HEADER_ALIASES = {
  name: ['名称', '模型名称', 'name'],
  modelCode: ['模型编号', '编号', '机体编号', 'modelcode', 'code'],
  grade: ['等级', 'grade', '系列等级'],
  scale: ['比例', 'scale'],
  releaseType: ['发售方式', '发售', 'release', 'releasetype'],
  series: ['系列', 'series'],
  type: ['收藏类型', '类型', 'type', '拥有类型'],
  buildStatus: ['拼装状态', '制作过程', 'buildstatus', '制作状态', '盒装状态'],
  releasePrice: ['发售价', '初版价', 'releaseprice', '定价'],
  reissuePrice: ['再版价', '再版价格', 'reissueprice'],
  purchasePlatform: ['购入平台', '购买平台', '平台', 'purchaseplatform'],
  purchaseDate: ['购买日期', '购入日期', 'purchasedate', '日期'],
  purchasePrice: ['购买价格', '购买价', '入手价', 'purchaseprice'],
  expectedPrice: ['期望价格', '期望价', 'expectedprice'],
  currentPrice: ['当前价格', '市价', 'currentprice'],
  status: ['卡片状态', '拼装情况', '拼装结果', '模型状态'],
  tags: ['标签', 'tags'],
  note: ['备注', '说明', 'note', 'memo'],
}

function buildHeaderMap(headers) {
  const normalized = headers.map((h) => normalizeHeader(h))
  const pickIndex = (aliases) => {
    for (const a of aliases) {
      const idx = normalized.indexOf(normalizeHeader(a))
      if (idx >= 0) return idx
    }
    return -1
  }
  const map = {}
  for (const key of Object.keys(HEADER_ALIASES)) {
    map[key] = pickIndex(HEADER_ALIASES[key])
  }
  return map
}

function normalizeGrade(value) {
  const v = String(value || '').trim().toUpperCase()
  if (!v) return ''
  return v
}

function normalizeScale(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  return v.replace(':', '/')
}

/** Excel 日期序列或普通数字/字符串 -> 展示字符串 */
function cellToPurchaseDate(cell) {
  if (cell === null || cell === undefined || cell === '') return ''
  if (typeof cell === 'number') {
    if (cell > 20000 && cell < 80000) {
      const utc = (cell - 25569) * 86400 * 1000
      const d = new Date(utc)
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
    return ''
  }
  const s = String(cell).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return s
}

function parseTypeCell(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (!s) return ''
  if (s.includes('愿望') || s === 'wishlist' || s === 'wish') return 'wishlist'
  if (s.includes('拥有') || s === 'owned' || s === 'collection') return 'owned'
  return ''
}

function parseStatusCell(raw) {
  const s = String(raw || '').trim()
  if (['未拼装', '已拼装', '已涂装'].includes(s)) return s
  return ''
}

function parseTagsCell(raw) {
  return String(raw || '')
    .split(/[,，;；]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function numCell(cell) {
  if (cell === null || cell === undefined || cell === '') return 0
  const n = Number(cell)
  return Number.isFinite(n) ? n : 0
}

export async function parseGunplaExcel(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames?.[0]
  if (!sheetName) return { ok: false, message: 'Excel 中没有可用的工作表', rows: [] }
  const ws = wb.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (!Array.isArray(aoa) || aoa.length < 2) {
    return { ok: false, message: 'Excel 内容为空或缺少表头', rows: [] }
  }
  const headers = aoa[0]
  const map = buildHeaderMap(headers)
  if (map.name < 0) {
    return { ok: false, message: '未找到“名称/name”列，请检查表头', rows: [] }
  }

  const rows = []
  let skipped = 0
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i]
    if (!Array.isArray(line)) continue
    const name = String(line[map.name] || '').trim()
    if (!name) {
      skipped++
      continue
    }

    const pick = (key) => (map[key] >= 0 ? line[map[key]] : '')

    const typeParsed = parseTypeCell(pick('type'))
    const tagsRaw = pick('tags')
    const tags = tagsRaw ? parseTagsCell(tagsRaw) : []

    rows.push({
      name,
      modelCode: map.modelCode >= 0 ? String(line[map.modelCode] || '').trim() : '',
      grade: map.grade >= 0 ? normalizeGrade(line[map.grade]) : '',
      scale: map.scale >= 0 ? normalizeScale(line[map.scale]) : '',
      releaseType: map.releaseType >= 0 ? String(line[map.releaseType] || '').trim() : '',
      series: map.series >= 0 ? String(line[map.series] || '').trim() : '',
      type: typeParsed,
      buildStatus: map.buildStatus >= 0 ? String(line[map.buildStatus] || '').trim() : '',
      releasePrice: map.releasePrice >= 0 ? numCell(line[map.releasePrice]) : 0,
      reissuePrice: map.reissuePrice >= 0 ? numCell(line[map.reissuePrice]) : 0,
      purchasePlatform: map.purchasePlatform >= 0 ? String(line[map.purchasePlatform] || '').trim() : '',
      purchaseDate: map.purchaseDate >= 0 ? cellToPurchaseDate(line[map.purchaseDate]) : '',
      purchasePrice: map.purchasePrice >= 0 ? numCell(line[map.purchasePrice]) : 0,
      expectedPrice: map.expectedPrice >= 0 ? numCell(line[map.expectedPrice]) : 0,
      currentPrice: map.currentPrice >= 0 ? numCell(line[map.currentPrice]) : 0,
      status: map.status >= 0 ? parseStatusCell(line[map.status]) : '',
      tags,
      note: map.note >= 0 ? String(line[map.note] || '').trim() : '',
      __rowNumber: i + 1,
    })
  }

  return {
    ok: true,
    message: `解析完成：有效 ${rows.length} 行，跳过 ${skipped} 行`,
    rows,
  }
}

export function normalizeMatchKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
}
