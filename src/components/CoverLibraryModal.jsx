import { useEffect, useMemo, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'

function leafLabel(cover) {
  return cover?.name || '未命名封面'
}

function CoverLibraryModal() {
  const {
    isCoverLibraryOpen,
    coverLibraryMode,
    closeCoverLibrary,
    coverLibrary,
    deleteCoversBulk,
    clearUnusedCovers,
    importCoverFolder,
    renameCover,
    setCoverImageCode,
    deleteCover,
    onPickCover,
  } = useGunpla()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [expandedFolders, setExpandedFolders] = useState(() => new Set())

  const derivedTree = useMemo(() => {
    const withFolder = coverLibrary
      .map((cover) => {
        const folder1 =
          typeof cover.folder1 === 'string'
            ? cover.folder1
            : typeof cover.name === 'string' && cover.name.includes('/')
              ? cover.name.split('/')[0]
              : ''
        return { ...cover, __folder1: folder1 }
      })
      .filter(Boolean)

    const rootLeaves = []
    const folderMap = new Map()

    for (const cover of withFolder) {
      if (!cover.__folder1) {
        rootLeaves.push(cover)
        continue
      }
      const list = folderMap.get(cover.__folder1) || []
      list.push(cover)
      folderMap.set(cover.__folder1, list)
    }

    return {
      rootLeaves,
      folderMap,
      folderKeys: Array.from(folderMap.keys()).sort(),
    }
  }, [coverLibrary])

  const filteredTree = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = (cover) => {
      const name = (cover.name || '').toLowerCase()
      const code = (cover.imageCode || '').toLowerCase()
      return name.includes(query) || code.includes(query)
    }

    if (!query) return derivedTree

    const rootLeaves = derivedTree.rootLeaves.filter(matches)
    const folderMap = new Map()
    for (const folderKey of derivedTree.folderKeys) {
      const leaves = derivedTree.folderMap.get(folderKey) || []
      const nextLeaves = leaves.filter(matches)
      if (nextLeaves.length > 0) folderMap.set(folderKey, nextLeaves)
    }

    return {
      rootLeaves,
      folderMap,
      folderKeys: Array.from(folderMap.keys()).sort(),
    }
  }, [derivedTree, search])

  const totalLeaves = useMemo(() => {
    const folderLeavesCount = filteredTree.folderKeys.reduce((sum, key) => {
      const leaves = filteredTree.folderMap.get(key) || []
      return sum + leaves.length
    }, 0)
    return filteredTree.rootLeaves.length + folderLeavesCount
  }, [filteredTree])

  const allVisibleIds = useMemo(() => {
    const ids = [...filteredTree.rootLeaves.map((cover) => cover.id)]
    filteredTree.folderKeys.forEach((key) => {
      const leaves = filteredTree.folderMap.get(key) || []
      ids.push(...leaves.map((cover) => cover.id))
    })
    return ids
  }, [filteredTree])

  const isSelect = coverLibraryMode === 'select'

  useEffect(() => {
    if (!isCoverLibraryOpen) return
    setExpandedFolders(new Set(filteredTree.folderKeys))
  }, [isCoverLibraryOpen, filteredTree.folderKeys])

  useEffect(() => {
    if (!isCoverLibraryOpen) {
      setSearch('')
      setSelectedIds(new Set())
    }
  }, [isCoverLibraryOpen])

  const handleImport = async () => {
    const result = await importCoverFolder()
    window.alert(result.message)
  }

  const handlePick = (cover) => {
    if (typeof onPickCover === 'function') onPickCover(cover)
    closeCoverLibrary()
  }

  const handleRename = (cover) => {
    const nextName = window.prompt('请输入新的封面名称：', cover.name || '') || ''
    if (!nextName.trim()) return
    const result = renameCover(cover.id, nextName)
    if (!result.ok) window.alert(result.message)
  }

  const handleEditImageCode = (cover) => {
    const nextCode =
      window.prompt('请输入图片编号，用于 Excel 编号自动匹配封面：', cover.imageCode || '') || ''
    if (!nextCode.trim()) return
    const result = setCoverImageCode(cover.id, nextCode)
    if (!result.ok) window.alert(result.message)
  }

  const handleDelete = async (cover) => {
    const ok = window.confirm(`确认删除封面「${leafLabel(cover)}」吗？`)
    if (!ok) return
    const result = await deleteCover(cover.id)
    if (!result.ok) window.alert(result.message)
  }

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleSelectAllVisible = () => {
    setSelectedIds(new Set(allVisibleIds))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      window.alert('请先勾选要删除的封面。')
      return
    }
    const ok = window.confirm('确认删除选中的封面吗？仍被模型引用的封面会自动跳过。')
    if (!ok) return
    const result = await deleteCoversBulk(Array.from(selectedIds))
    window.alert(result.message)
    clearSelection()
  }

  const handleClearUnused = async () => {
    const ok = window.confirm('确认清理所有未被任何模型引用的封面吗？')
    if (!ok) return
    const result = await clearUnusedCovers()
    window.alert(result.message)
    clearSelection()
  }

  const renderLeafGrid = (leaves) => {
    if (!leaves?.length) return null
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {leaves.map((cover) => (
          <div
            key={cover.id}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            {!isSelect ? (
              <div className="absolute left-2 top-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(cover.id)}
                  onChange={(event) => {
                    event.stopPropagation()
                    toggleSelected(cover.id)
                  }}
                  className="h-4 w-4 cursor-pointer accent-cyan-400"
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => (isSelect ? handlePick(cover) : handleRename(cover))}
              className="block w-full text-left"
              title={isSelect ? '点击选择这张封面' : '点击重命名'}
            >
              <div className="aspect-square bg-slate-950/60">
                {cover.imageUrl ? (
                  <img
                    src={cover.imageUrl}
                    alt={leafLabel(cover)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    无图片
                  </div>
                )}
              </div>
              <div className="space-y-1 px-3 py-2">
                <div className="truncate text-sm text-slate-100">{leafLabel(cover)}</div>
                {cover.imageCode ? (
                  <div className="truncate text-[11px] text-amber-200/80">编号：{cover.imageCode}</div>
                ) : null}
                {cover.originalPath ? (
                  <div className="truncate text-[11px] text-slate-500">{cover.originalPath}</div>
                ) : null}
              </div>
            </button>

            {!isSelect ? (
              <div className="absolute right-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleRename(cover)}
                  className="rounded bg-black/65 px-2 py-1 text-[11px] text-white"
                >
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => handleEditImageCode(cover)}
                  className="rounded bg-black/65 px-2 py-1 text-[11px] text-white"
                >
                  编号
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cover)}
                  className="rounded bg-black/65 px-2 py-1 text-[11px] text-white hover:bg-red-600/70"
                >
                  删除
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 transition duration-300 ${
        isCoverLibraryOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeCoverLibrary}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`app-panel-strong flex max-h-[88vh] w-full max-w-6xl flex-col rounded-[32px] p-5 transition duration-300 ${
          isCoverLibraryOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-sky-200/70">Local Cover Library</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {isSelect ? '选择封面' : '本地封面库'}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {isSelect
                ? '点击封面即可应用到当前模型。'
                : '只保留本地封面管理，让收藏资料更稳定也更轻量。'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isSelect ? (
              <button onClick={handleImport} className="app-btn-primary !rounded-full !px-4 !py-2.5 !text-sm">
                从文件夹导入
              </button>
            ) : null}
            <button onClick={closeCoverLibrary} className="app-btn-secondary !rounded-full !px-4 !py-2.5 !text-sm">
              关闭
            </button>
          </div>
        </div>

        {!isSelect ? (
          <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
              <span>已选 {selectedIds.size} 张</span>
              <span>当前视图 {allVisibleIds.length} 张</span>
              <span>总计 {totalLeaves} 张</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleSelectAllVisible} className="app-btn-secondary !rounded-full !px-3.5 !py-2 !text-xs">
                全选当前视图
              </button>
              <button type="button" onClick={clearSelection} className="app-btn-secondary !rounded-full !px-3.5 !py-2 !text-xs">
                清空选择
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="app-btn-secondary !rounded-full !border-rose-400/20 !px-3.5 !py-2 !text-xs !text-rose-100 hover:!bg-rose-500/12"
              >
                批量删除
              </button>
              <button type="button" onClick={handleClearUnused} className="app-btn-secondary !rounded-full !px-3.5 !py-2 !text-xs">
                清理未引用封面
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-4 flex items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索封面名称或图片编号..."
            className="app-input"
          />
          <div className="whitespace-nowrap text-xs text-slate-400">共 {totalLeaves} 张</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {totalLeaves === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">
              暂无封面，点击右上角“从文件夹导入”开始建立本地封面库。
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTree.rootLeaves.length > 0 ? (
                <section>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">根目录</div>
                  {renderLeafGrid(filteredTree.rootLeaves)}
                </section>
              ) : null}

              <div className="space-y-3">
                {filteredTree.folderKeys.map((folderKey) => {
                  const leaves = filteredTree.folderMap.get(folderKey) || []
                  const expanded = expandedFolders.has(folderKey)
                  return (
                    <section key={folderKey} className="rounded-[24px] border border-white/10 bg-white/[0.02] p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedFolders((prev) => {
                            const next = new Set(prev)
                            if (next.has(folderKey)) next.delete(folderKey)
                            else next.add(folderKey)
                            return next
                          })
                        }}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{folderKey}</span>
                          <span className="rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-xs text-slate-400">
                            {leaves.length} 张
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{expanded ? '收起' : '展开'}</span>
                      </button>
                      {expanded ? <div className="mt-3">{renderLeafGrid(leaves)}</div> : null}
                    </section>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CoverLibraryModal
