import { useEffect, useMemo, useState } from 'react'
import { useGunpla } from '../context/GunplaContext'
import { fetchPublicCovers, uploadLocalCoverToCommunity } from '../services/communityApi'
import { isSupabaseConfigured } from '../supabaseClient'

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
    addCoverFromShared,
    onPickCover,
  } = useGunpla()
  const [search, setSearch] = useState('')
  const [libraryTab, setLibraryTab] = useState('local')
  const [communityList, setCommunityList] = useState([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communityError, setCommunityError] = useState('')
  const [uploadingCoverId, setUploadingCoverId] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const derivedTree = useMemo(() => {
    const withFolder1 = coverLibrary
      .map((c) => {
        const folder1 =
          typeof c.folder1 === 'string'
            ? c.folder1
            : typeof c.name === 'string' && c.name.includes('/')
              ? c.name.split('/')[0]
              : ''
        return { ...c, __folder1: folder1 }
      })
      .filter((c) => c && typeof c === 'object')

    const rootLeaves = []
    const folderMap = new Map()

    for (const c of withFolder1) {
      if (!c.__folder1) {
        rootLeaves.push(c)
        continue
      }
      const list = folderMap.get(c.__folder1) || []
      list.push(c)
      folderMap.set(c.__folder1, list)
    }

    const allFolderKeys = Array.from(folderMap.keys()).sort()
    return { rootLeaves, folderMap, allFolderKeys }
  }, [coverLibrary])

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase()
    const leafMatches = (c) => {
      const name = (c.name || '').toLowerCase()
      const code = (c.imageCode || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    }
    if (!q) {
      return {
        rootLeaves: derivedTree.rootLeaves,
        folderMap: derivedTree.folderMap,
        folderKeys: derivedTree.allFolderKeys,
      }
    }

    const rootLeaves = derivedTree.rootLeaves.filter(leafMatches)
    const folderMap = new Map()
    for (const folderKey of derivedTree.allFolderKeys) {
      const leaves = derivedTree.folderMap.get(folderKey) || []
      const filtered = leaves.filter(leafMatches)
      if (filtered.length > 0) folderMap.set(folderKey, filtered)
    }
    return { rootLeaves, folderMap, folderKeys: Array.from(folderMap.keys()).sort() }
  }, [derivedTree, search])

  const [expandedFolders, setExpandedFolders] = useState(() => new Set())
  useEffect(() => {
    if (!isCoverLibraryOpen) return
    setExpandedFolders(new Set(filteredTree.folderKeys))
  }, [isCoverLibraryOpen, filteredTree.folderKeys])

  useEffect(() => {
    if (!isCoverLibraryOpen) setLibraryTab('local')
  }, [isCoverLibraryOpen])

  useEffect(() => {
    if (!isCoverLibraryOpen || libraryTab !== 'community' || !isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      setCommunityLoading(true)
      setCommunityError('')
      const res = await fetchPublicCovers()
      if (cancelled) return
      setCommunityLoading(false)
      if (!res.ok) {
        setCommunityError(res.error || '加载失败')
        setCommunityList([])
        return
      }
      setCommunityList(res.data || [])
    })()
    return () => {
      cancelled = true
    }
  }, [isCoverLibraryOpen, libraryTab])

  const filteredCommunity = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return communityList
    return communityList.filter((row) => {
      const name = (row.name || '').toLowerCase()
      const url = (row.image_url || '').toLowerCase()
      return name.includes(q) || url.includes(q)
    })
  }, [communityList, search])

  const isSelect = coverLibraryMode === 'select'

  const handleImport = async () => {
    const res = await importCoverFolder()
    window.alert(res.message)
  }

  const handlePick = (cover) => {
    if (typeof onPickCover === 'function') onPickCover(cover)
    closeCoverLibrary()
  }

  const handleRename = (cover) => {
    const nextName = window.prompt('请输入封面名称', cover.name || '') || ''
    if (!nextName.trim()) return
    const res = renameCover(cover.id, nextName)
    if (!res.ok) window.alert(res.message)
  }

  const handleEditImageCode = (cover) => {
    const next = window.prompt('图片编号（与 Excel 模型编号一致时可自动匹配封面）', cover.imageCode || '') || ''
    if (!next.trim()) return
    const res = setCoverImageCode(cover.id, next)
    if (!res.ok) window.alert(res.message)
  }

  const handleDelete = async (cover) => {
    const ok = window.confirm(`确认删除封面 "${cover.name || '未命名'}"？`)
    if (!ok) return
    const res = await deleteCover(cover.id)
    if (!res.ok) window.alert(res.message)
  }

  const handleShareToCommunity = async (cover) => {
    if (!isSupabaseConfigured) {
      window.alert('请先配置 .env 中的 Supabase 变量')
      return
    }
    const ok = window.confirm(`将「${leafLabel(cover)}」上传到共享封面库？`)
    if (!ok) return
    setUploadingCoverId(cover.id)
    const res = await uploadLocalCoverToCommunity(cover)
    setUploadingCoverId(null)
    if (!res.ok) window.alert(res.error)
    else window.alert('已上传，其他用户可在「共享封面库」中查看。')
  }

  const handleCommunityUse = (row) => {
    const url = row.image_url || ''
    const existing = coverLibrary.find((c) => c.imageUrl === url)
    if (existing) {
      if (isSelect) handlePick(existing)
      else window.alert('已在本地封面库中')
      return
    }
    const res = addCoverFromShared(row)
    if (!res.ok) {
      window.alert(res.message)
      return
    }
    if (isSelect && res.cover) handlePick(res.cover)
    else window.alert('已加入本地封面库')
  }

  const leafLabel = (cover) => cover?.name || '未命名'

  const isExpanded = (folderKey) => expandedFolders.has(folderKey)

  const renderLeafGrid = (leaves) => {
    if (!leaves || leaves.length === 0) return null
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {leaves.map((cover) => (
          <div
            key={cover.id}
            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/30"
          >
            {!isSelect ? (
              <div className="absolute left-2 top-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(cover.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleSelected(cover.id)
                  }}
                  className="h-4 w-4 cursor-pointer accent-blue-500"
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => (isSelect ? handlePick(cover) : handleRename(cover))}
              className="block w-full text-left"
              title={isSelect ? '选择此封面' : '点击重命名'}
            >
              <div className="aspect-square bg-zinc-900">
                {cover.imageUrl ? (
                  <img
                    src={cover.imageUrl}
                    alt={leafLabel(cover)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                    无图片
                  </div>
                )}
              </div>
              <div className="px-3 py-2">
                <div className="truncate text-sm text-zinc-200">{leafLabel(cover)}</div>
                {cover.imageCode ? (
                  <div className="truncate text-[11px] text-amber-200/80">编号：{cover.imageCode}</div>
                ) : null}
                {cover.originalPath ? (
                  <div className="truncate text-[11px] text-zinc-500">{cover.originalPath}</div>
                ) : null}
              </div>
            </button>

            {!isSelect ? (
              <div className="absolute right-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                {isSupabaseConfigured && typeof window !== 'undefined' && window.api?.readImageBuffer ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareToCommunity(cover)
                    }}
                    disabled={uploadingCoverId === cover.id}
                    className="rounded bg-emerald-700/90 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                    title="上传到共享封面库（需已在 Supabase 执行含 Storage 的 schema）"
                  >
                    {uploadingCoverId === cover.id ? '上传中…' : '分享'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRename(cover)}
                  className="rounded bg-black/60 px-2 py-1 text-[11px] text-white"
                >
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => handleEditImageCode(cover)}
                  className="rounded bg-black/60 px-2 py-1 text-[11px] text-white"
                >
                  编号
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cover)}
                  className="rounded bg-black/60 px-2 py-1 text-[11px] text-white hover:bg-red-600/70"
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

  const totalLeaves = useMemo(() => {
    const folderLeavesCount = filteredTree.folderKeys.reduce((sum, k) => {
      const leaves = filteredTree.folderMap.get(k) || []
      return sum + leaves.length
    }, 0)
    return filteredTree.rootLeaves.length + folderLeavesCount
  }, [filteredTree])

  const allLocalIds = useMemo(() => {
    const ids = []
    ids.push(...filteredTree.rootLeaves.map((c) => c.id))
    filteredTree.folderKeys.forEach((k) => {
      const leaves = filteredTree.folderMap.get(k) || []
      ids.push(...leaves.map((c) => c.id))
    })
    return ids
  }, [filteredTree])

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
    setSelectedIds(new Set(allLocalIds))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      window.alert('请先勾选要删除的封面')
      return
    }
    const ok = window.confirm('确认删除选中的封面？仍被模型引用的封面会自动跳过。')
    if (!ok) return
    const res = await deleteCoversBulk(Array.from(selectedIds))
    if (!res.ok) {
      window.alert(res.message)
    } else {
      window.alert(res.message)
    }
    clearSelection()
  }

  const handleClearUnused = async () => {
    const ok = window.confirm(
      '确认清理所有未被任何模型引用的封面？被模型引用的封面将自动保留。',
    )
    if (!ok) return
    const res = await clearUnusedCovers()
    window.alert(res.message)
    clearSelection()
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
        className={`flex w-full max-w-5xl max-h-[85vh] flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl transition duration-300 ${
          isCoverLibraryOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-zinc-100">
              {isSelect ? '选择封面' : '封面资料库'}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {isSelect ? '点击封面即可选中并应用到当前模型。' : '导入文件夹图片，命名后快速复用。'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleImport}
              disabled={libraryTab === 'community'}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              从文件夹导入
            </button>
            <button
              onClick={closeCoverLibrary}
              className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition hover:brightness-110"
            >
              关闭
            </button>
          </div>
        </div>

        {!isSelect && libraryTab === 'local' ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
            <span>
              已选 {selectedIds.size} 张 / 当前视图 {allLocalIds.length} 张 / 总数 {totalLeaves} 张
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
              >
                全选当前视图
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
              >
                清除选择
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded bg-red-600/90 px-2 py-1 text-[11px] text-white hover:bg-red-500"
              >
                批量删除
              </button>
              <button
                type="button"
                onClick={handleClearUnused}
                className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-amber-200 hover:bg-zinc-700"
              >
                清空未引用封面
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex gap-2 border-b border-zinc-800 pb-3">
          <button
            type="button"
            onClick={() => setLibraryTab('local')}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              libraryTab === 'local'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:brightness-110'
            }`}
          >
            本地封面
          </button>
          <button
            type="button"
            onClick={() => setLibraryTab('community')}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              libraryTab === 'community'
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:brightness-110'
            }`}
          >
            共享封面库
          </button>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              libraryTab === 'local' ? '搜索名称或图片编号...' : '搜索共享封面名称或链接...'
            }
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
          />
          <div className="text-xs text-zinc-400 whitespace-nowrap">
            {libraryTab === 'local' ? `共 ${totalLeaves} 张` : `共 ${filteredCommunity.length} 张`}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {libraryTab === 'community' ? (
            <div className="space-y-3">
              {!isSupabaseConfigured ? (
                <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
                  未配置 Supabase。请复制 <code className="text-zinc-300">.env.example</code> 为{' '}
                  <code className="text-zinc-300">.env</code> 并填写项目 URL 与 anon key，重启开发服务器。
                </div>
              ) : communityLoading ? (
                <div className="py-12 text-center text-sm text-zinc-500">加载共享封面中…</div>
              ) : communityError ? (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
                  {communityError}
                </div>
              ) : filteredCommunity.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-sm text-zinc-400">
                  暂无共享封面。可在 Supabase 表 <code className="text-zinc-300">covers</code>{' '}
                  中录入公开数据，或稍后由社区上传。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filteredCommunity.map((row) => (
                    <div
                      key={row.id}
                      className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/30"
                    >
                      <button
                        type="button"
                        onClick={() => handleCommunityUse(row)}
                        className="block w-full text-left"
                        title={isSelect ? '加入本地并选中' : '加入本地封面库'}
                      >
                        <div className="aspect-square bg-zinc-900">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt={row.name || ''}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                              无图片
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <div className="truncate text-sm text-zinc-200">
                            {row.name || '未命名'}
                          </div>
                          <div className="mt-1 text-[11px] text-blue-300/90">
                            {isSelect ? '点击加入并选中' : '点击加入本地库'}
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-zinc-500">
                共享数据来自 Supabase，仅用于浏览与复制到本地；不会修改你的云端表结构以外的本地 data.json。
              </p>
            </div>
          ) : totalLeaves === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-sm text-zinc-400">
              暂无封面。点击右上角“从文件夹导入”开始创建资料库。
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTree.rootLeaves.length > 0 ? (
                <section>
                  <div className="mb-2 text-xs font-semibold text-zinc-300">根目录</div>
                  {renderLeafGrid(filteredTree.rootLeaves)}
                </section>
              ) : null}

              <div className="space-y-3">
                {filteredTree.folderKeys.map((folderKey) => {
                  const leaves = filteredTree.folderMap.get(folderKey) || []
                  const expanded = isExpanded(folderKey)
                  return (
                    <section key={folderKey} className="rounded-xl border border-zinc-800 p-3">
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
                          <span className="text-sm font-semibold text-zinc-200">{folderKey}</span>
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                            {leaves.length} 张
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {expanded ? '收起' : '展开'}
                        </span>
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

