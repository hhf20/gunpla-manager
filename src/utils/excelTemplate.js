import * as XLSX from 'xlsx'

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadGunplaImportTemplate() {
  const headers = [
    '名称',
    '模型编号',
    '等级',
    '比例',
    '发售方式',
    '系列',
    '收藏类型',
    '拼装状态',
    '发售价',
    '再版价',
    '购入平台',
    '购买日期',
    '购买价格',
    '期望价格',
    '当前价格',
    '卡片状态',
    '标签',
    '备注',
  ]
  const example = [
    '强袭高达',
    'GAT-X105',
    'HG',
    '1/144',
    '通贩',
    'SEED',
    '已拥有',
    '未开盒',
    2990,
    '',
    '淘宝',
    '2024-01-15',
    268,
    '',
    320,
    '未拼装',
    '主角机, 通贩',
    '封面库图片编号与模型编号一致时可自动匹配封面',
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map(() => ({ wch: 14 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '导入模板')

  const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([array], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob('Gunpla_导入模板.xlsx', blob)
}
