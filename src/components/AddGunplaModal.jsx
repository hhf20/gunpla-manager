import { useEffect, useMemo, useRef, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import {
  fetchGunplaCoverImageFromMain,
  fetchGunplaReleasePriceFromMain,
} from '../services/releasePriceLookup'
import {
  createEmptyGunplaForm,
  createGunplaFormFromItem,
  gunplaFormToPayload,
  ITEM_TYPE_OPTIONS,
  OWNED_STATUS_OPTIONS,
  saveImageFilesToLibrary,
} from '../utils/gunplaForm'

const inputClass = 'app-input !rounded-2xl !py-2.5'
const sectionClass = 'rounded-[26px] border border-white/10 bg-black/10 p-4 md:p-5'

function ImageGrid({ images, onRemove }) {
  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
        暂无图片
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((img, index) => (
        <div key={`${img}-${index}`} className="group relative overflow-hidden rounded-2xl bg-slate-950/70">
          <img src={img} alt="" className="h-24 w-full object-contain" />
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute right-2 top-2 rounded-lg bg-black/65 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
          >
            删除
          </button>
        </div>
      ))}
    </div>
  )
}

function AddGunplaModal() {
  const {
    isModalOpen,
    editingGunpla,
    addGunpla,
    updateGunpla,
    closeModal,
    categoryConfig,
    getConfigSelectOptions,
    openCoverLibrary,
  } = useGunpla()
  const [form, setForm] = useState(() =>
    createEmptyGunplaForm({
      defaultReleaseType: categoryConfig.releaseTypes?.[0] || '通贩',
      defaultPlatform: categoryConfig.purchasePlatforms?.[0] || '',
    }),
  )
  const [releasePriceLookupBusy, setReleasePriceLookupBusy] = useState(false)
  const [coverImageLookupBusy, setCoverImageLookupBusy] = useState(false)
  const coverInputRef = useRef(null)
  const buildInputRef = useRef(null)
  const boxInputRef = useRef(null)

  const isEditing = useMemo(() => Boolean(editingGunpla), [editingGunpla])
  const seriesOptions = useMemo(() => getConfigSelectOptions('series'), [getConfigSelectOptions])
  const gradeOptions = useMemo(() => getConfigSelectOptions('grade'), [getConfigSelectOptions])
  const releaseTypeOptions = useMemo(
    () => getConfigSelectOptions('releaseTypes'),
    [getConfigSelectOptions],
  )
  const platformOptions = useMemo(
    () => getConfigSelectOptions('purchasePlatforms'),
    [getConfigSelectOptions],
  )
  const buildStatusOptions = useMemo(
    () => getConfigSelectOptions('buildStatusConfig'),
    [getConfigSelectOptions],
  )

  useEffect(() => {
    if (!isModalOpen) return
    const defaults = {
      defaultReleaseType: releaseTypeOptions[0]?.value || categoryConfig.releaseTypes?.[0] || '通贩',
      defaultPlatform: platformOptions[0]?.value || categoryConfig.purchasePlatforms?.[0] || '',
    }
    const next = editingGunpla
      ? createGunplaFormFromItem(editingGunpla, defaults)
      : createEmptyGunplaForm(defaults)

    if (!next.buildStatus) next.buildStatus = buildStatusOptions[0]?.value || ''
    if (!next.series) next.series = seriesOptions[0]?.value || ''
    if (!next.grade) next.grade = gradeOptions[0]?.value || ''
    setForm(next)
  }, [
    isModalOpen,
    editingGunpla,
    categoryConfig.purchasePlatforms,
    categoryConfig.releaseTypes,
    buildStatusOptions,
    gradeOptions,
    platformOptions,
    releaseTypeOptions,
    seriesOptions,
  ])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleLookupReleasePrice = async () => {
    if (releasePriceLookupBusy) return
    const name = form.name.trim()
    const modelCode = form.modelCode.trim()
    if (!name && !modelCode) {
      window.alert('请先填写名称或模型编号。')
      return
    }

    setReleasePriceLookupBusy(true)
    try {
      const result = await fetchGunplaReleasePriceFromMain({
        name,
        modelCode,
        grade: form.grade,
      })
      if (result.ok && result.releasePrice != null) {
        setField('releasePrice', String(result.releasePrice))
        const sourceLine = result.sourceUrl ? `\n来源：${result.sourceUrl}` : ''
        window.alert(`已填入发售价：${result.releasePrice} 日元。${sourceLine}`)
      } else {
        window.alert(result.message || '查询失败。')
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
      window.alert('请先填写名称或模型编号。')
      return
    }

    setCoverImageLookupBusy(true)
    try {
      const result = await fetchGunplaCoverImageFromMain({
        name,
        modelCode,
        grade: form.grade,
      })
      if (result.ok && result.imageUrl) {
        setField('coverImage', result.imageUrl)
        const sourceLine = result.sourceUrl ? `\n来源：${result.sourceUrl}` : ''
        window.alert(`已从 Gunpla Wiki 获取盒绘并保存到本地封面库。${sourceLine}`)
      } else {
        window.alert(result.message || '获取封面失败。')
      }
    } finally {
      setCoverImageLookupBusy(false)
    }
  }

  const handleCoverUpload = async (event) => {
    const [first] = await saveImageFilesToLibrary(event.target.files)
    if (first) setField('coverImage', first)
  }

  const handleMultiUpload = async (key, files) => {
    const next = await saveImageFilesToLibrary(files)
    if (!next.length) return
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ...next] }))
  }

  const removeMultiImage = (key, index) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  const handleSave = (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      window.alert('模型名称不能为空。')
      return
    }

    const payload = gunplaFormToPayload(form)
    if (isEditing) updateGunpla(editingGunpla.id, payload)
    else addGunpla(payload)
    closeModal()
  }

  const handleClear = () => {
    const cleared = createEmptyGunplaForm({
      defaultReleaseType: releaseTypeOptions[0]?.value || categoryConfig.releaseTypes?.[0] || '通贩',
      defaultPlatform: platformOptions[0]?.value || categoryConfig.purchasePlatforms?.[0] || '',
    })
    cleared.buildStatus = buildStatusOptions[0]?.value || ''
    cleared.series = seriesOptions[0]?.value || ''
    cleared.grade = gradeOptions[0]?.value || ''
    setForm(cleared)
    if (coverInputRef.current) coverInputRef.current.value = ''
    if (buildInputRef.current) buildInputRef.current.value = ''
    if (boxInputRef.current) boxInputRef.current.value = ''
  }

  const desktopOnlyHint = !window.api?.saveImage

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 transition duration-300 ${
        isModalOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeModal}
    >
      <div
        className={`app-panel-strong relative flex h-[min(92vh,940px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[32px] transition duration-300 ${
          isModalOpen ? 'scale-100' : 'scale-95'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,212,255,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_46%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="border-b border-white/10 px-5 pb-4 pt-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-sky-200/70">Collection Entry</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{isEditing ? '编辑模型' : '新增模型'}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  把每台模型整理成一张更清晰的资料卡，录入时也尽量保持轻量和顺手。
                </p>
              </div>
              {desktopOnlyHint ? (
                <div className="rounded-2xl border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                  当前是网页环境，图片保存和联网盒绘功能不可用。
                </div>
              ) : null}
            </div>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSave}>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <section className={sectionClass}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Profile</div>
                      <h4 className="mt-1 text-base font-semibold text-white">基础信息</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ITEM_TYPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
                            form.type === option.value
                              ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-100'
                              : 'border-white/10 bg-white/[0.03] text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="type"
                            checked={form.type === option.value}
                            onChange={() => setField('type', option.value)}
                            className="h-4 w-4 accent-cyan-400"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <select
                      value={form.grade}
                      onChange={(event) => setField('grade', event.target.value)}
                      className={inputClass}
                    >
                      {gradeOptions.map((item) => (
                        <option key={item.id} value={item.value}>
                          {item.path}
                        </option>
                      ))}
                    </select>
                    <select
                      value={form.series}
                      onChange={(event) => setField('series', event.target.value)}
                      className={inputClass}
                    >
                      {seriesOptions.map((item) => (
                        <option key={item.id} value={item.value}>
                          {item.path}
                        </option>
                      ))}
                    </select>
                    <input
                      value={form.scale}
                      onChange={(event) => setField('scale', event.target.value)}
                      placeholder="比例，例如 1/144"
                      className={inputClass}
                    />
                    <input
                      value={form.boxNumber}
                      onChange={(event) => setField('boxNumber', event.target.value)}
                      placeholder="盒子编号，例如 40"
                      className={inputClass}
                    />
                    <input
                      value={form.modelCode}
                      onChange={(event) => setField('modelCode', event.target.value)}
                      placeholder="机体编号，例如 RX-78-2"
                      className={inputClass}
                    />
                    <input
                      required
                      value={form.name}
                      onChange={(event) => setField('name', event.target.value)}
                      placeholder="机体名称"
                      className={inputClass}
                    />
                    <select
                      value={form.buildStatus}
                      onChange={(event) => setField('buildStatus', event.target.value)}
                      className={inputClass}
                    >
                      {buildStatusOptions.map((item) => (
                        <option key={item.id} value={item.value}>
                          {item.path}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Market</div>
                      <h4 className="mt-1 text-base font-semibold text-white">价格与渠道</h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleLookupReleasePrice}
                      disabled={releasePriceLookupBusy}
                      className="app-btn-secondary !rounded-full !px-4 !py-2 !text-xs"
                    >
                      {releasePriceLookupBusy ? '查询中...' : '联网查询发售价'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <input
                      type="number"
                      min="0"
                      value={form.releasePrice}
                      onChange={(event) => setField('releasePrice', event.target.value)}
                      placeholder="发售价（日元）"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="0"
                      value={form.reissuePrice}
                      onChange={(event) => setField('reissuePrice', event.target.value)}
                      placeholder="再版价格（可选）"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      min="0"
                      value={form.currentPrice}
                      onChange={(event) => setField('currentPrice', event.target.value)}
                      placeholder="当前价（次要信息）"
                      className={inputClass}
                    />

                    <select
                      value={form.releaseType}
                      onChange={(event) => setField('releaseType', event.target.value)}
                      className={inputClass}
                    >
                      {releaseTypeOptions.map((item) => (
                        <option key={item.id} value={item.value}>
                          {item.path}
                        </option>
                      ))}
                    </select>
                    <select
                      value={form.purchasePlatform}
                      onChange={(event) => setField('purchasePlatform', event.target.value)}
                      className={inputClass}
                    >
                      {platformOptions.map((item) => (
                        <option key={item.id} value={item.value}>
                          {item.path}
                        </option>
                      ))}
                    </select>

                    {form.type === 'owned' ? (
                      <>
                        <input
                          type="date"
                          value={form.purchaseDate}
                          onChange={(event) => setField('purchaseDate', event.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="number"
                          min="0"
                          value={form.purchasePrice}
                          onChange={(event) => setField('purchasePrice', event.target.value)}
                          placeholder="实际入手价"
                          className={inputClass}
                        />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={form.purchaseCount}
                          onChange={(event) => setField('purchaseCount', event.target.value)}
                          placeholder="购入数量"
                          className={inputClass}
                        />
                        <select
                          value={form.status}
                          onChange={(event) => setField('status', event.target.value)}
                          className={`${inputClass} md:col-span-2 xl:col-span-1`}
                        >
                          {OWNED_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={form.expectedPrice}
                        onChange={(event) => setField('expectedPrice', event.target.value)}
                        placeholder="目标入手价"
                        className={`${inputClass} md:col-span-2 xl:col-span-2`}
                      />
                    )}
                  </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className={sectionClass}>
                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Notes</div>
                      <h4 className="mt-1 text-base font-semibold text-white">标签与备注</h4>
                    </div>
                    <div className="space-y-4">
                      <input
                        value={form.tags}
                        onChange={(event) => setField('tags', event.target.value)}
                        placeholder="标签，多个用逗号分隔"
                        className={inputClass}
                      />
                      <textarea
                        value={form.note}
                        onChange={(event) => setField('note', event.target.value)}
                        rows={6}
                        placeholder="记录版本差异、购入缘由、改造计划等备注"
                        className={`${inputClass} min-h-[144px] resize-none`}
                      />
                    </div>
                  </div>

                  <div className={sectionClass}>
                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Cover</div>
                      <h4 className="mt-1 text-base font-semibold text-white">封面主图</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openCoverLibrary('select', (cover) => {
                              if (cover?.imageUrl) setField('coverImage', cover.imageUrl)
                            })
                          }
                          className="app-btn-secondary !rounded-full !px-4 !py-2 !text-xs"
                        >
                          从封面库选择
                        </button>
                        <button
                          type="button"
                          onClick={handleLookupCoverImage}
                          disabled={coverImageLookupBusy || !window.api?.fetchGunplaCoverImage}
                          className="app-btn-secondary !rounded-full !px-4 !py-2 !text-xs"
                        >
                          {coverImageLookupBusy ? '获取中...' : '联网获取盒绘'}
                        </button>
                      </div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={!window.api?.saveImage}
                        className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100 hover:file:bg-slate-600 disabled:opacity-50"
                      />
                      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/60">
                        {form.coverImage ? (
                          <img
                            src={form.coverImage}
                            alt="封面预览"
                            className="h-56 w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-56 items-center justify-center text-sm text-slate-500">
                            暂无封面
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className={sectionClass}>
                  <div className="mb-4">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Gallery</div>
                    <h4 className="mt-1 text-base font-semibold text-white">附加图片</h4>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">成品图</div>
                        <div className="text-xs text-slate-500">可以上传多张，用来展示完成状态。</div>
                      </div>
                      <input
                        ref={buildInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(event) => handleMultiUpload('buildImages', event.target.files)}
                        disabled={!window.api?.saveImage}
                        className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100 hover:file:bg-slate-600 disabled:opacity-50"
                      />
                      <ImageGrid
                        images={form.buildImages}
                        onRemove={(index) => removeMultiImage('buildImages', index)}
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">盒照</div>
                        <div className="text-xs text-slate-500">保留包装图，方便版本核对和收纳管理。</div>
                      </div>
                      <input
                        ref={boxInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(event) => handleMultiUpload('boxImages', event.target.files)}
                        disabled={!window.api?.saveImage}
                        className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100 hover:file:bg-slate-600 disabled:opacity-50"
                      />
                      <ImageGrid
                        images={form.boxImages}
                        onRemove={(index) => removeMultiImage('boxImages', index)}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <div className="flex flex-wrap justify-end gap-2">
                {!isEditing ? (
                  <button type="button" onClick={handleClear} className="app-btn-secondary">
                    清空
                  </button>
                ) : null}
                <button type="button" onClick={closeModal} className="app-btn-secondary">
                  取消
                </button>
                <button type="submit" className="app-btn-primary">
                  {isEditing ? '保存修改' : '保存模型'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddGunplaModal
