import { useMemo, useRef, useState } from 'react'
import { AUTHOR_WECHAT, authorBlurb } from '../data/author'
import { useGunpla } from '../context/GunplaContext'

const groups = [
  { key: 'grade', label: '等级' },
  { key: 'series', label: '系列' },
  { key: 'customTags', label: '标签' },
  { key: 'buildStatusConfig', label: '拼装状态' },
  { key: 'releaseTypes', label: '发售形式' },
  { key: 'purchasePlatforms', label: '购入平台' },
]

function TypeManagementModal() {
  const {
    isTypeManagementOpen,
    closeTypeManagement,
    getConfigTree,
    addConfigNode,
    renameConfigNode,
    moveConfigNode,
    safeRemoveConfigNode,
    getConfigNodeUsageCount,
    getConfigSelectOptions,
    setConfigNodeLogoFromFile,
    uiState,
    setShowGradeLogo,
    setShowSeriesLogo,
    theme,
    setThemeOpacity,
    setThemeBackgroundFromFile,
    clearThemeBackground,
  } = useGunpla()
  const [inputMap, setInputMap] = useState({})
  const [renameMap, setRenameMap] = useState({})
  const [expandedMap, setExpandedMap] = useState({})
  const [wipeBusy, setWipeBusy] = useState(false)
  const themeFileRef = useRef(null)

  const optionsMap = useMemo(() => {
    const map = {}
    for (const group of groups) map[group.key] = getConfigSelectOptions(group.key)
    return map
  }, [getConfigSelectOptions])

  const handleAddRoot = (key) => {
    const value = (inputMap[`${key}__root`] || '').trim()
    if (!value) return
    const result = addConfigNode(key, null, value)
    if (!result?.ok) {
      window.alert(result?.message || '新增失败')
      return
    }
    setInputMap((prev) => ({ ...prev, [`${key}__root`]: '' }))
  }

  const handleAddChild = (key, nodeId) => {
    const stateKey = `${key}__${nodeId}__child`
    const value = (inputMap[stateKey] || '').trim()
    if (!value) return
    const result = addConfigNode(key, nodeId, value)
    if (!result?.ok) {
      window.alert(result?.message || '新增失败')
      return
    }
    setInputMap((prev) => ({ ...prev, [stateKey]: '' }))
    setExpandedMap((prev) => ({ ...prev, [`${key}__${nodeId}`]: true }))
  }

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(AUTHOR_WECHAT)
      window.alert('微信号已复制。')
    } catch {
      window.prompt('请手动复制微信号：', AUTHOR_WECHAT)
    }
  }

  const handleDelete = (key, nodeId, label) => {
    const usage = getConfigNodeUsageCount(key, nodeId)
    let replacement = ''
    if (usage > 0) {
      const candidateText = optionsMap[key]
        .map((item) => item.path)
        .slice(0, 8)
        .join('\n')
      replacement =
        window.prompt(
          `「${label}」及其子节点当前被 ${usage} 个模型使用。\n请输入替换值后再删除。\n可用值示例：\n${candidateText}`,
        ) || ''
      if (!replacement) return
    }
    const result = safeRemoveConfigNode(key, nodeId, replacement)
    if (!result.ok) window.alert(result.message)
  }

  const handleRename = (key, nodeId, currentLabel) => {
    const renameKey = `${key}__${nodeId}__rename`
    const nextLabel = (renameMap[renameKey] || '').trim()
    if (!nextLabel || nextLabel === currentLabel) return
    const result = renameConfigNode(key, nodeId, nextLabel)
    if (!result.ok) window.alert(result.message)
    else setRenameMap((prev) => ({ ...prev, [renameKey]: '' }))
  }

  const canUploadLogo = (key) => key === 'grade' || key === 'series'

  const handleLogoUpload = async (key, nodeId, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const result = await setConfigNodeLogoFromFile(key, nodeId, file)
    if (!result?.ok) window.alert(result?.message || '上传 Logo 失败。')
    event.target.value = ''
  }

  const renderTree = (key, nodes, depth = 0) =>
    (nodes || []).map((node) => {
      const usage = getConfigNodeUsageCount(key, node.id)
      const hasChildren = (node.children || []).length > 0
      const expandedKey = `${key}__${node.id}`
      const isExpanded = expandedMap[expandedKey] ?? true
      const childInputKey = `${key}__${node.id}__child`
      const renameKey = `${key}__${node.id}__rename`

      return (
        <div key={node.id} className="space-y-2">
          <div
            className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
            style={{ marginLeft: `${depth * 14}px` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xs text-slate-300"
                  onClick={() =>
                    setExpandedMap((prev) => ({ ...prev, [expandedKey]: !isExpanded }))
                  }
                >
                  {isExpanded ? '−' : '+'}
                </button>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center text-slate-500">•</span>
              )}

              {canUploadLogo(key) ? (
                <span className="inline-flex h-9 w-20 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-slate-950/70">
                  {node.logoUrl ? (
                    <img src={node.logoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {key === 'series' ? 'SERIES' : 'LOGO'}
                    </span>
                  )}
                </span>
              ) : null}

              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white">
                {node.label}
              </span>
              <span className="text-[11px] text-slate-500">引用 {usage}</span>
              <button
                type="button"
                onClick={() => moveConfigNode(key, node.id, 'up')}
                className="app-btn-secondary !rounded-full !px-3 !py-1 !text-xs"
              >
                上移
              </button>
              <button
                type="button"
                onClick={() => moveConfigNode(key, node.id, 'down')}
                className="app-btn-secondary !rounded-full !px-3 !py-1 !text-xs"
              >
                下移
              </button>
              <button
                type="button"
                onClick={() => handleDelete(key, node.id, node.label)}
                className="app-btn-secondary !rounded-full !px-3 !py-1 !text-xs"
              >
                删除
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="flex gap-2">
                <input
                  value={inputMap[childInputKey] || ''}
                  onChange={(event) =>
                    setInputMap((prev) => ({ ...prev, [childInputKey]: event.target.value }))
                  }
                  placeholder="新增子节点"
                  className="app-input !py-2.5"
                />
                <button
                  type="button"
                  onClick={() => handleAddChild(key, node.id)}
                  className="app-btn-primary !px-4 !py-2.5 !text-xs"
                >
                  添加
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={renameMap[renameKey] || ''}
                  onChange={(event) =>
                    setRenameMap((prev) => ({ ...prev, [renameKey]: event.target.value }))
                  }
                  placeholder="重命名当前节点"
                  className="app-input !py-2.5"
                />
                <button
                  type="button"
                  onClick={() => handleRename(key, node.id, node.label)}
                  className="app-btn-secondary !px-4 !py-2.5 !text-xs"
                >
                  保存
                </button>
              </div>

              {canUploadLogo(key) ? (
                <div className="lg:col-span-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-slate-100 hover:file:bg-white/[0.14]"
                    onChange={(event) => handleLogoUpload(key, node.id, event)}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {hasChildren && isExpanded ? renderTree(key, node.children, depth + 1) : null}
        </div>
      )
    })

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition duration-300 ${
        isTypeManagementOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={closeTypeManagement}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`app-panel-strong w-full max-w-5xl rounded-[32px] p-5 transition duration-300 ${
          isTypeManagementOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-sky-200/70">System Setup</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">类型与界面设置</h3>
          </div>
          <button onClick={closeTypeManagement} className="app-btn-secondary !rounded-2xl !px-4 !py-2">
            关闭
          </button>
        </div>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <h4 className="text-sm font-semibold text-white">界面背景</h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              这里可以设置全局背景图和透明度，清除后会恢复默认氛围背景。
            </p>

            <div className="relative mt-4 h-48 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70">
              {theme.backgroundImage ? (
                <img
                  src={theme.backgroundImage}
                  alt="背景预览"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity:
                      typeof theme.backgroundOpacity === 'number' &&
                      Number.isFinite(theme.backgroundOpacity)
                        ? Math.min(1, Math.max(0, theme.backgroundOpacity))
                        : 0.35,
                  }}
                  draggable={false}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                  当前尚未设置背景图
                </div>
              )}
              <div className="absolute inset-x-0 top-0 border-b border-white/10 bg-slate-950/55 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-400 backdrop-blur">
                Preview
              </div>
              <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-200">
                透明度 {Math.round((theme.backgroundOpacity ?? 0.35) * 100)}%
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={themeFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (file) await setThemeBackgroundFromFile(file)
                  event.target.value = ''
                }}
              />
              <button type="button" onClick={() => themeFileRef.current?.click()} className="app-btn-primary">
                选择背景图
              </button>
              <button type="button" onClick={() => clearThemeBackground()} className="app-btn-secondary">
                清除背景
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-300">背景透明度</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(theme.backgroundOpacity * 100)}
                onChange={(event) => setThemeOpacity(Number(event.target.value) / 100)}
                className="h-2 w-44 max-w-full accent-cyan-400"
              />
              <span className="text-sm tabular-nums text-slate-400">
                {Math.round(theme.backgroundOpacity * 100)}%
              </span>
            </div>
          </section>

          {groups.map((group) => (
            <section key={group.key} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-white">{group.label}</h4>
                {group.key === 'grade' ? (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-cyan-400"
                      checked={uiState.showGradeLogo !== false}
                      onChange={(event) => setShowGradeLogo(event.target.checked)}
                    />
                    显示 Grade Logo
                  </label>
                ) : null}
                {group.key === 'series' ? (
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-cyan-400"
                      checked={uiState.showSeriesLogo !== false}
                      onChange={(event) => setShowSeriesLogo(event.target.checked)}
                    />
                    显示 Series Logo
                  </label>
                ) : null}
              </div>

              <div className="mb-4 space-y-3">{renderTree(group.key, getConfigTree(group.key))}</div>

              <div className="flex gap-2">
                <input
                  value={inputMap[`${group.key}__root`] || ''}
                  onChange={(event) =>
                    setInputMap((prev) => ({ ...prev, [`${group.key}__root`]: event.target.value }))
                  }
                  placeholder={`新增${group.label}根节点`}
                  className="app-input"
                />
                <button onClick={() => handleAddRoot(group.key)} className="app-btn-primary">
                  新增
                </button>
              </div>
            </section>
          ))}

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <h4 className="text-sm font-semibold text-white">关于金屋藏胶</h4>
            <p className="mt-3 text-sm leading-6 text-slate-400">{authorBlurb}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-200">
              <span>微信号</span>
              <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 font-mono text-amber-100">
                {AUTHOR_WECHAT}
              </span>
              <button
                type="button"
                onClick={copyWechat}
                className="app-btn-secondary !rounded-full !px-3 !py-1.5 !text-xs"
              >
                复制
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-5">
            <h4 className="text-sm font-semibold text-rose-100">危险操作</h4>
            <p className="mt-2 text-sm leading-6 text-rose-100/75">
              清空所有数据会删除本机保存的模型数据、图片、设置和日志，而且无法恢复。
            </p>
            <button
              type="button"
              disabled={wipeBusy}
              onClick={async () => {
                if (wipeBusy) return
                const ok1 = window.confirm('确定要清空所有数据吗？此操作无法恢复。')
                if (!ok1) return
                const phrase = window.prompt('为防止误触，请输入“清空”后继续：', '')
                if (phrase !== '清空') return
                if (!window.api?.wipeAllData) {
                  window.alert('当前环境不支持清空数据，请在桌面版中使用。')
                  return
                }
                setWipeBusy(true)
                try {
                  const res = await window.api.wipeAllData()
                  if (!res?.ok) {
                    window.alert(res?.message || '清空失败，可能有文件仍在被占用。')
                  }
                } finally {
                  setWipeBusy(false)
                }
              }}
              className="mt-4 rounded-2xl bg-rose-500/85 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {wipeBusy ? '清空中...' : '清空所有数据'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TypeManagementModal
