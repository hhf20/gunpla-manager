import { useEffect, useMemo, useRef, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import {
  fetchGunplaCoverImageFromMain,
  fetchGunplaReleasePriceFromMain,
} from '../services/releasePriceLookup'

const initialForm = {
  name: '',
  type: 'owned',
  modelCode: '',
  releasePrice: '',
  reissuePrice: '',
  releaseType: '通贩',
  purchasePlatform: '',
  buildStatus: '未开盒',
  series: 'SEED',
  grade: 'HG',
  scale: '1/144',
  purchaseDate: '',
  purchasePrice: '',
  purchaseCount: 1,
  expectedPrice: '',
  currentPrice: '',
  status: '未拼装',
  tags: '',
  note: '',
  coverImage: '',
  buildImages: [],
  boxImages: [],
}

function AddGunplaModal() {
  const {
    isModalOpen,
    editingGunpla,
    addGunpla,
    updateGunpla,
    closeModal,
    categoryConfig,
    buildStatusConfig,
    openCoverLibrary,
  } = useGunpla()
  const [form, setForm] = useState(initialForm)
  const [releasePriceLookupBusy, setReleasePriceLookupBusy] = useState(false)
  const [coverImageLookupBusy, setCoverImageLookupBusy] = useState(false)
  const coverInputRef = useRef(null)
  const buildInputRef = useRef(null)
  const boxInputRef = useRef(null)

  const isEditing = useMemo(() => Boolean(editingGunpla), [editingGunpla])

  useEffect(() => {
    if (!isModalOpen) return
    if (!editingGunpla) {
      setForm(initialForm)
      return
    }

    setForm({
      name: editingGunpla.name || '',
      type: editingGunpla.type || 'owned',
      modelCode: editingGunpla.modelCode || '',
      releasePrice: editingGunpla.releasePrice ?? '',
      reissuePrice: editingGunpla.reissuePrice ?? '',
      releaseType:
        editingGunpla.releaseType || categoryConfig.releaseTypes?.[0] || '通贩',
      purchasePlatform:
        editingGunpla.purchasePlatform || categoryConfig.purchasePlatforms?.[0] || '',
      buildStatus: editingGunpla.buildStatus || '未开盒',
      series: editingGunpla.series || 'SEED',
      grade: editingGunpla.grade || 'HG',
      scale: editingGunpla.scale || '1/144',
      purchaseDate: editingGunpla.purchaseDate || '',
      purchasePrice: editingGunpla.purchasePrice ?? '',
      purchaseCount: editingGunpla.purchaseCount ?? 1,
      expectedPrice: editingGunpla.expectedPrice ?? '',
      currentPrice: editingGunpla.currentPrice ?? '',
      status: editingGunpla.status || '未拼装',
      tags: Array.isArray(editingGunpla.tags) ? editingGunpla.tags.join(', ') : '',
      note: editingGunpla.note || '',
      coverImage: editingGunpla.coverImage || '',
      buildImages: Array.isArray(editingGunpla.buildImages) ? editingGunpla.buildImages : [],
      boxImages: Array.isArray(editingGunpla.boxImages) ? editingGunpla.boxImages : [],
    })
  }, [
    isModalOpen,
    editingGunpla,
    categoryConfig.releaseTypes,
    categoryConfig.purchasePlatforms,
  ])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleLookupReleasePrice = async () => {
    if (releasePriceLookupBusy) return
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
    if (coverImageLookupBusy) return
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
      list.map(
        async (file) => {
          if (!window.api?.saveImage) return ''
          const buffer = await file.arrayBuffer()
          const savedPath = await window.api.saveImage(buffer, file.name)
          return savedPath || ''
        },
      ),
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
    if (!form.name.trim()) return

    const payload = {
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
      purchaseCount:
        form.type === 'owned'
          ? Math.max(1, Number(form.purchaseCount) || 1)
          : Math.max(1, Number(form.purchaseCount) || 1),
      expectedPrice: form.type === 'wishlist' ? Number(form.expectedPrice) || 0 : 0,
      currentPrice: Number(form.currentPrice) || 0,
      status: form.type === 'owned' ? form.status : '',
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      note: form.note.trim(),
      coverImage: form.coverImage || '',
      buildImages: form.buildImages,
      boxImages: form.boxImages,
    }

    if (isEditing) {
      updateGunpla(editingGunpla.id, payload)
    } else {
      addGunpla(payload)
    }
    closeModal()
  }

  const handleClear = () => {
    setForm(initialForm)
    if (coverInputRef.current) coverInputRef.current.value = ''
    if (buildInputRef.current) buildInputRef.current.value = ''
    if (boxInputRef.current) boxInputRef.current.value = ''
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 transition duration-300 ${
        isModalOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
      onClick={closeModal}
    >
      <div
        className={`flex w-full max-w-[760px] max-h-[90vh] flex-col rounded-2xl bg-zinc-900 p-6 shadow-2xl transition duration-300 ${
          isModalOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-zinc-100">
          {isEditing ? '编辑模型' : '新增模型'}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">完善信息，打造你的专属机体档案。</p>

        <form className="mt-5 flex min-h-0 flex-1 flex-col" onSubmit={handleSave}>
          <div className="space-y-4 overflow-y-auto pr-1">
            <section>
              <h4 className="mb-2 text-sm font-semibold text-zinc-200">基础信息</h4>
          <div>
            <p className="mb-2 text-sm text-zinc-300">收藏类型</p>
            <div className="flex gap-4 text-sm text-zinc-300">
              {[
                { label: '已拥有', value: 'owned' },
                { label: '想购买（愿望清单）', value: 'wishlist' },
              ].map((typeOption) => (
                <label key={typeOption.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    checked={form.type === typeOption.value}
                    onChange={() => setField('type', typeOption.value)}
                    className="accent-blue-500"
                  />
                  {typeOption.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="名称"
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
            <input
              value={form.modelCode}
              onChange={(e) => setField('modelCode', e.target.value)}
              placeholder="模型编号（如 ZGMF-X10A）"
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
            <select
              value={form.series}
              onChange={(e) => setField('series', e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            >
              {categoryConfig.series.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={form.grade}
              onChange={(e) => setField('grade', e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            >
              {categoryConfig.grade.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="col-span-2 flex min-w-0 flex-wrap items-stretch gap-2">
              <input
                type="number"
                min="0"
                value={form.releasePrice}
                onChange={(e) => setField('releasePrice', e.target.value)}
                placeholder="发售价（初版，日元）"
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
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
            <input
              type="number"
              min="0"
              value={form.reissuePrice}
              onChange={(e) => setField('reissuePrice', e.target.value)}
              placeholder="再版价格（可选，日元）"
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
            <select
              value={form.releaseType}
              onChange={(e) => setField('releaseType', e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            >
              {categoryConfig.releaseTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            {categoryConfig.purchasePlatforms?.length > 0 ? (
              <select
                value={form.purchasePlatform}
                onChange={(e) => setField('purchasePlatform', e.target.value)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 col-span-2"
              >
                {categoryConfig.purchasePlatforms.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            ) : null}
            <select
              value={form.buildStatus}
              onChange={(e) => setField('buildStatus', e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 col-span-2"
            >
              {buildStatusConfig.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input
              value={form.scale}
              onChange={(e) => setField('scale', e.target.value)}
              placeholder="比例，例如 1/100"
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
            />
            {form.type === 'owned' ? (
              <>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setField('purchaseDate', e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  value={form.purchasePrice}
                  onChange={(e) => setField('purchasePrice', e.target.value)}
                  placeholder="购买价格"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.purchaseCount}
                  onChange={(e) => setField('purchaseCount', e.target.value)}
                  placeholder="购买次数"
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                />
              </>
            ) : (
              <input
                type="number"
                min="0"
                value={form.expectedPrice}
                onChange={(e) => setField('expectedPrice', e.target.value)}
                placeholder="期望价格"
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 col-span-2"
              />
            )}
            <input
              type="number"
              min="0"
              value={form.currentPrice}
              onChange={(e) => setField('currentPrice', e.target.value)}
              placeholder="当前价格"
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 col-span-2"
            />
          </div>
            </section>

          {form.type === 'owned' ? (
            <div>
              <p className="mb-2 text-sm text-zinc-300">状态</p>
              <div className="flex gap-4 text-sm text-zinc-300">
                {['未拼装', '已拼装', '已涂装'].map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      checked={form.status === status}
                      onChange={() => setField('status', status)}
                      className="accent-blue-500"
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <input
            value={form.tags}
            onChange={(e) => setField('tags', e.target.value)}
            placeholder="标签（逗号分隔）"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
          />

          <textarea
            value={form.note}
            onChange={(e) => setField('note', e.target.value)}
            rows={3}
            placeholder="备注"
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
          />

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
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="mt-2 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-100 hover:file:bg-zinc-600"
            />
            {form.coverImage ? (
              <img
                src={form.coverImage}
                alt="preview"
                className="mt-3 w-24 max-h-24 h-auto rounded-lg object-contain bg-zinc-800"
              />
            ) : null}

            <label className="block text-sm text-zinc-300">成品图（可多选）</label>
            <input
              ref={buildInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => handleMultiUpload('buildImages', event.target.files)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-100 hover:file:bg-zinc-600"
            />
            <div className="grid grid-cols-4 gap-2">
              {form.buildImages.map((img, idx) => (
                <div key={`${img}-${idx}`} className="relative group overflow-hidden">
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
              ref={boxInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => handleMultiUpload('boxImages', event.target.files)}
              className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-zinc-100 hover:file:bg-zinc-600"
            />
            <div className="grid grid-cols-4 gap-2">
              {form.boxImages.map((img, idx) => (
                <div key={`${img}-${idx}`} className="relative group overflow-hidden">
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
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-zinc-800 pt-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
              >
                清空
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddGunplaModal
