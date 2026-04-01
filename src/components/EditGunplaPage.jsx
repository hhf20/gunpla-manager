import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGunpla } from '../context/GunplaContext'
import {
  fetchGunplaCoverImageFromMain,
  fetchGunplaReleasePriceFromMain,
} from '../services/releasePriceLookup'

function EditGunplaPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const {
    gunplaList,
    updateGunpla,
    categoryConfig,
    buildStatusConfig,
    openCoverLibrary,
  } = useGunpla()
  const target = useMemo(
    () => gunplaList.find((item) => String(item.id) === String(id)),
    [gunplaList, id],
  )
  const [form, setForm] = useState(null)
  const [releasePriceLookupBusy, setReleasePriceLookupBusy] = useState(false)
  const [coverImageLookupBusy, setCoverImageLookupBusy] = useState(false)

  useEffect(() => {
    if (!target) return
    setForm({
      name: target.name || '',
      type: target.type || 'owned',
      modelCode: target.modelCode || '',
      releasePrice: target.releasePrice ?? '',
      reissuePrice: target.reissuePrice ?? '',
      releaseType: target.releaseType || '通贩',
      purchasePlatform: target.purchasePlatform || categoryConfig.purchasePlatforms?.[0] || '',
      buildStatus: target.buildStatus || '未开盒',
      series: target.series || 'SEED',
      grade: target.grade || 'HG',
      scale: target.scale || '1/144',
      purchaseDate: target.purchaseDate || '',
      purchasePrice: target.purchasePrice ?? '',
      purchaseCount: target.purchaseCount ?? 1,
      expectedPrice: target.expectedPrice ?? '',
      currentPrice: target.currentPrice ?? '',
      status: target.status || '未拼装',
      tags: Array.isArray(target.tags) ? target.tags.join(', ') : '',
      note: target.note || '',
      coverImage: target.coverImage || '',
      buildImages: Array.isArray(target.buildImages) ? target.buildImages : [],
      boxImages: Array.isArray(target.boxImages) ? target.boxImages : [],
    })
  }, [target, categoryConfig.purchasePlatforms])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleLookupReleasePrice = async () => {
    if (!form || releasePriceLookupBusy) return
    const name = form.name.trim()
    const modelCode = form.modelCode.trim()
    if (!name && !modelCode) {
      window.alert('请先填写名称或模型编号')
      return
    }
    setReleasePriceLookupBusy(true)
    try {
      const res = await fetchGunplaReleasePriceFromMain({
        name,
        modelCode,
        grade: form.grade,
      })
      if (res.ok && res.releasePrice != null) {
        setField('releasePrice', String(res.releasePrice))
        const src = res.sourceUrl ? `\n来源：${res.sourceUrl}` : ''
        window.alert(`已填入发售价：${res.releasePrice} 日元（Gunpla Wiki 参考）${src}`)
      } else {
        window.alert(res.message || '查询失败')
      }
    } finally {
      setReleasePriceLookupBusy(false)
    }
  }

  const handleLookupCoverImage = async () => {
    if (!form || coverImageLookupBusy) return
    const name = form.name.trim()
    const modelCode = form.modelCode.trim()
    if (!name && !modelCode) {
      window.alert('请先填写名称或模型编号')
      return
    }
    setCoverImageLookupBusy(true)
    try {
      const res = await fetchGunplaCoverImageFromMain({
        name,
        modelCode,
        grade: form.grade,
      })
      if (res.ok && res.imageUrl) {
        setField('coverImage', res.imageUrl)
        const src = res.sourceUrl ? `\n条目：${res.sourceUrl}` : ''
        window.alert(`已从 Gunpla Wiki 下载盒绘并设为封面（已保存到本地资料库目录）。${src}`)
      } else {
        window.alert(res.message || '获取失败')
      }
    } finally {
      setCoverImageLookupBusy(false)
    }
  }

  const saveFiles = async (files) => {
    const list = Array.from(files || [])
    const results = await Promise.all(
      list.map(async (file) => {
        if (!window.api?.saveImage) return ''
        const buffer = await file.arrayBuffer()
        const savedPath = await window.api.saveImage(buffer, file.name)
        return savedPath || ''
      }),
    )
    return results.filter(Boolean)
  }

  const handleCoverUpload = async (event) => {
    const [first] = await saveFiles(event.target.files)
    if (first) setField('coverImage', first)
  }

  const handleMultiUpload = async (key, files) => {
    const next = await saveFiles(files)
    if (next.length === 0) return
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ...next] }))
  }

  const removeMultiImage = (key, index) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, idx) => idx !== index),
    }))
  }

  const handleSave = (event) => {
    event.preventDefault()
    if (!target || !form?.name.trim()) return
    updateGunpla(target.id, {
      name: form.name.trim(),
      type: form.type,
      modelCode: form.modelCode.trim(),
      releasePrice: Number(form.releasePrice) || 0,
      reissuePrice: Number(form.reissuePrice) || 0,
      releaseType: form.releaseType,
      purchasePlatform: form.purchasePlatform.trim(),
      buildStatus: form.buildStatus,
      series: form.series,
      grade: form.grade,
      scale: form.scale.trim() || '1/144',
      purchaseDate: form.type === 'owned' ? form.purchaseDate : '',
      purchasePrice: form.type === 'owned' ? Number(form.purchasePrice) || 0 : 0,
      purchaseCount: form.type === 'owned' ? Math.max(1, Number(form.purchaseCount) || 1) : 1,
      expectedPrice: form.type === 'wishlist' ? Number(form.expectedPrice) || 0 : 0,
      currentPrice: Number(form.currentPrice) || 0,
      status: form.type === 'owned' ? form.status : '',
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      note: form.note.trim(),
      coverImage: form.coverImage || '',
      buildImages: form.buildImages || [],
      boxImages: form.boxImages || [],
    })
    navigate('/')
  }

  if (!target || !form) {
    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-zinc-300">
        未找到模型数据
      </main>
    )
  }

  return (
    <main className="relative z-10 min-h-screen bg-zinc-950/65 p-6 text-zinc-100 backdrop-blur-[2px]">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">编辑模型</h2>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-zinc-800 px-3 py-2 text-sm transition hover:brightness-110"
          >
            返回
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="名称" className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input value={form.modelCode} onChange={(e) => setField('modelCode', e.target.value)} placeholder="模型编号（如 ZGMF-X10A）" className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <select value={form.type} onChange={(e) => setField('type', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="owned">已拥有</option><option value="wishlist">愿望清单</option></select>
            <select value={form.buildStatus} onChange={(e) => setField('buildStatus', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500">{buildStatusConfig.map((i) => <option key={i}>{i}</option>)}</select>
            <select value={form.series} onChange={(e) => setField('series', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500">{categoryConfig.series.map((i) => <option key={i}>{i}</option>)}</select>
            <select value={form.grade} onChange={(e) => setField('grade', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500">{categoryConfig.grade.map((i) => <option key={i}>{i}</option>)}</select>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">发售价（初版，日元）</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={form.releasePrice}
                  onChange={(e) => setField('releasePrice', e.target.value)}
                  placeholder="例如 299"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleLookupReleasePrice}
                  disabled={releasePriceLookupBusy}
                  title="数据来自 Gunpla Wiki，建议用英文品名或「RG + 机体名」以提高命中率"
                  className="shrink-0 rounded-xl border border-blue-600/60 bg-blue-900/40 px-3 py-2 text-sm text-blue-100 transition hover:bg-blue-900/55 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {releasePriceLookupBusy ? '查询中…' : '联网查询'}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">再版价格（可选，日元）</label>
              <input type="number" min="0" value={form.reissuePrice} onChange={(e) => setField('reissuePrice', e.target.value)} placeholder="例如 329" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <select value={form.releaseType} onChange={(e) => setField('releaseType', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500">{categoryConfig.releaseTypes.map((i) => <option key={i}>{i}</option>)}</select>
            <select value={form.purchasePlatform} onChange={(e) => setField('purchasePlatform', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500">{categoryConfig.purchasePlatforms.map((i) => <option key={i}>{i}</option>)}</select>
            <input value={form.scale} onChange={(e) => setField('scale', e.target.value)} placeholder="比例" className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <div>
              <label className="mb-1 block text-xs text-zinc-400">当前价格（市场）</label>
              <input type="number" min="0" value={form.currentPrice} onChange={(e) => setField('currentPrice', e.target.value)} placeholder="例如 399" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            {form.type === 'owned' ? (
              <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500 col-span-2"><option>未拼装</option><option>已拼装</option><option>已涂装</option></select>
            ) : null}
            {form.type === 'owned' ? (
              <>
                <input type="date" value={form.purchaseDate} onChange={(e) => setField('purchaseDate', e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">购买价格（实际付款）</label>
                  <input type="number" min="0" value={form.purchasePrice} onChange={(e) => setField('purchasePrice', e.target.value)} placeholder="例如 268" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">购买次数</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.purchaseCount}
                    onChange={(e) => setField('purchaseCount', e.target.value)}
                    placeholder="例如 1"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">期望价格（希望入手价）</label>
                <input type="number" min="0" value={form.expectedPrice} onChange={(e) => setField('expectedPrice', e.target.value)} placeholder="例如 300" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            )}
          </div>
          <input value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="标签（逗号分隔）" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <textarea value={form.note} onChange={(e) => setField('note', e.target.value)} rows={4} placeholder="备注" className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <div className="rounded-xl border border-dashed border-zinc-700 p-3 space-y-3">
            <label className="block text-sm text-zinc-300">封面图</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openCoverLibrary('select', (cover) => {
                    if (cover?.imageUrl) setField('coverImage', cover.imageUrl)
                  })
                }
                className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
              >
                从资料库选择
              </button>
              <button
                type="button"
                onClick={handleLookupCoverImage}
                disabled={coverImageLookupBusy}
                title="从 Gunpla Wiki 下载盒绘到本地（建议用「等级 + 英文机体名」）"
                className="rounded-xl border border-emerald-700/60 bg-emerald-950/50 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {coverImageLookupBusy ? '下载中…' : '联网获取封面'}
              </button>
              <span className="text-xs text-zinc-500">或上传本地图片</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-100 hover:file:bg-zinc-600"
            />
            {form.coverImage ? (
              <img
                src={form.coverImage}
                alt="cover"
                className="h-auto w-24 max-h-24 rounded-lg object-contain bg-zinc-800"
              />
            ) : null}

            <label className="block text-sm text-zinc-300">成品图（可多选）</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => handleMultiUpload('buildImages', event.target.files)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-100 hover:file:bg-zinc-600"
            />
            <div className="grid grid-cols-4 gap-2">
              {form.buildImages.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  className="relative group overflow-hidden"
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-auto max-h-16 rounded-md object-contain bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeMultiImage('buildImages', idx)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <label className="block text-sm text-zinc-300">盒照（可多选）</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => handleMultiUpload('boxImages', event.target.files)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-100 hover:file:bg-zinc-600"
            />
            <div className="grid grid-cols-4 gap-2">
              {form.boxImages.map((img, idx) => (
                <div
                  key={`${img}-${idx}`}
                  className="relative group overflow-hidden"
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-auto max-h-16 rounded-md object-contain bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeMultiImage('boxImages', idx)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate('/')} className="rounded-xl bg-zinc-800 px-4 py-2 text-sm transition hover:brightness-110">取消</button>
            <button type="submit" className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">保存修改</button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default EditGunplaPage
