import { useEffect, useMemo, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import PdfPreview from './PdfPreview'

function ManualLibraryModal() {
  const { isManualOpen, closeManual, manualRootPath, setManualRootPath } = useGunpla()

  const [pdfItems, setPdfItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedManualIds, setSelectedManualIds] = useState(() => new Set())

  const selectedPdf = useMemo(
    () => pdfItems.find((p) => p.id === selectedId) || null,
    [pdfItems, selectedId],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pdfItems
    return pdfItems.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const rel = (p.relativePath || '').toLowerCase()
      return name.includes(q) || rel.includes(q)
    })
  }, [pdfItems, search])

  const load = async (root) => {
    if (!root) {
      setPdfItems([])
      setSelectedManualIds(new Set())
      setSelectedId(null)
      return
    }

    if (!window.api?.listPdfFiles) {
      setError('当前环境不支持 PDF 扫描（请使用桌面版 Electron）。')
      setPdfItems([])
      setSelectedManualIds(new Set())
      setSelectedId(null)
      return
    }

    setLoading(true)
    setError('')
    setPdfItems([])
    setSelectedId(null)
    setSelectedManualIds(new Set())

    try {
      const res = await window.api.listPdfFiles(root, true)
      if (!res?.ok) {
        setError(res?.message || '加载失败')
        setPdfItems([])
        setSelectedManualIds(new Set())
        return
      }
      const list = Array.isArray(res.data) ? res.data : []
      setPdfItems(list)
      if (list.length > 0) setSelectedId(list[0].id)
    } catch (e) {
      setError(e?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isManualOpen) return
    load(manualRootPath)
  }, [isManualOpen, manualRootPath])

  const handlePickDir = async () => {
    try {
      if (!window.api?.selectFolder) {
        window.alert('当前环境不支持目录选择（请使用桌面版 Electron）。')
        return
      }
      const folderPath = await window.api.selectFolder()
      if (!folderPath) return
      setManualRootPath(folderPath)
      setSearch('')
      setSelectedId(null)
      setSelectedManualIds(new Set())
      await load(folderPath)
    } catch (e) {
      setError(e?.message || '选择目录失败')
    }
  }

  const toggleManualSelected = (id) => {
    setSelectedManualIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearManualSelection = () => setSelectedManualIds(new Set())

  const selectAllManuals = () => {
    setSelectedManualIds(new Set(filtered.map((p) => p.id)))
  }

  const handleBulkRemoveManuals = () => {
    if (selectedManualIds.size === 0) {
      window.alert('请先勾选要移除的说明书')
      return
    }
    const ok = window.confirm('仅从当前列表中移除选中的 PDF，不会删除磁盘上的文件。是否继续？')
    if (!ok) return
    const ids = new Set(selectedManualIds)
    setPdfItems((prev) => prev.filter((p) => !ids.has(p.id)))
    setSelectedManualIds(new Set())
    if (selectedId && ids.has(selectedId)) {
      const remaining = filtered.filter((p) => !ids.has(p.id))
      setSelectedId(remaining[0]?.id ?? null)
    }
  }

  const handleClearManualList = () => {
    if (pdfItems.length === 0) {
      window.alert('当前列表为空，无需清空')
      return
    }
    const ok = window.confirm(
      '这只会清空当前扫描结果，不会删除磁盘上的任何 PDF 文件。确定要清空列表吗？',
    )
    if (!ok) return
    setPdfItems([])
    setSelectedId(null)
    setSelectedManualIds(new Set())
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 transition duration-300 ${
        isManualOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeManual}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full max-w-[96vw] max-h-[96vh] flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl transition duration-300 ${
          isManualOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-zinc-100">说明书查看目录</h3>
            <p className="mt-1 text-sm text-zinc-400">
              选择一个目录后，应用将递归扫描 PDF，并在本窗口内预览。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePickDir}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              选择目录
            </button>
            <button
              type="button"
              onClick={closeManual}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:brightness-110"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 PDF 文件名或路径..."
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
          />
          <div className="flex flex-col items-start gap-1 text-xs text-zinc-400 sm:items-end">
            <span>{loading ? '加载中…' : `当前列表：${filtered.length} 个 PDF`}</span>
            <span>已选：{selectedManualIds.size} 个（仅从列表移除，不会删除磁盘文件）</span>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={selectAllManuals}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
              >
                全选
              </button>
              <button
                type="button"
                onClick={clearManualSelection}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
              >
                清除选择
              </button>
              <button
                type="button"
                onClick={handleBulkRemoveManuals}
                className="rounded bg-red-600/90 px-2 py-1 text-[11px] text-white hover:bg-red-500"
              >
                批量移除
              </button>
              <button
                type="button"
                onClick={handleClearManualList}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-amber-200 hover:bg-zinc-700"
              >
                清空列表
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full gap-3">
            <div className="w-full sm:w-80 min-w-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/30">
              <div className="p-3 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-300">
                  {manualRootPath ? manualRootPath : '未选择目录'}
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                {loading ? (
                  <p className="text-xs text-zinc-500 p-2">扫描中…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-2">暂无 PDF，请先选择目录。</p>
                ) : (
                  filtered.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-start gap-2 rounded-lg border px-2 py-2 text-xs transition ${
                        p.id === selectedId
                          ? 'border-blue-500 bg-blue-500/15 text-blue-200'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:brightness-110'
                      }`}
                      title={p.relativePath}
                    >
                      <input
                        type="checkbox"
                        checked={selectedManualIds.has(p.id)}
                        onChange={() => toggleManualSelected(p.id)}
                        className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className="flex-1 text-left"
                      >
                        <div className="truncate font-medium">{p.name}</div>
                        {p.folder1 ? (
                          <div className="mt-1 truncate text-[11px] text-zinc-500">
                            {p.folder1}
                          </div>
                        ) : null}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/30 overflow-auto">
              {selectedPdf?.fileUrl ? (
                <div className="h-full w-full min-h-0">
                  <PdfPreview fileUrl={selectedPdf.fileUrl} />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-6 text-center text-xs text-zinc-500">
                  请选择左侧的 PDF 开始预览。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManualLibraryModal

