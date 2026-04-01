import { useRef, useState } from 'react'
import { AUTHOR_WECHAT, authorBlurb } from '../data/author'
import { useGunpla } from '../context/GunplaContext'

const groups = [
  { key: 'grade', label: '等级' },
  { key: 'series', label: '系列' },
  { key: 'customTags', label: '标签' },
  { key: 'buildStatusConfig', label: '拼装状态' },
  { key: 'releaseTypes', label: '发售方式' },
  { key: 'purchasePlatforms', label: '购入平台' },
]

function TypeManagementModal() {
  const {
    isTypeManagementOpen,
    closeTypeManagement,
    categoryConfig,
    buildStatusConfig,
    addCategoryItem,
    addBuildStatus,
    safeRemoveConfigItem,
    getConfigUsageCount,
    theme,
    setThemeOpacity,
    setThemeBackgroundFromFile,
    clearThemeBackground,
  } = useGunpla()
  const [inputMap, setInputMap] = useState({})
  const themeFileRef = useRef(null)

  const getValues = (key) =>
    key === 'buildStatusConfig' ? buildStatusConfig : categoryConfig[key] || []

  const handleAdd = (key) => {
    const value = (inputMap[key] || '').trim()
    if (!value) return
    if (key === 'buildStatusConfig') addBuildStatus(value)
    else addCategoryItem(key, value)
    setInputMap((prev) => ({ ...prev, [key]: '' }))
  }

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(AUTHOR_WECHAT)
      window.alert('已复制微信号')
    } catch {
      window.prompt('请手动复制微信号：', AUTHOR_WECHAT)
    }
  }

  const handleDelete = (key, value) => {
    const usage = getConfigUsageCount(key, value)
    let replacement = ''
    if (usage > 0) {
      replacement = window.prompt(`"${value}" 正在被 ${usage} 个模型使用，请输入替换值后删除`) || ''
      if (!replacement) return
    }
    const result = safeRemoveConfigItem(key, value, replacement)
    if (!result.ok) window.alert(result.message)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 transition duration-300 ${
        isTypeManagementOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
      onClick={closeTypeManagement}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl transition duration-300 ${
          isTypeManagementOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-zinc-100">统一类型管理</h3>
          <button
            onClick={closeTypeManagement}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:brightness-110"
          >
            关闭
          </button>
        </div>
        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <section className="rounded-xl border border-zinc-800 p-3">
            <h4 className="mb-2 text-sm font-semibold text-zinc-200">界面主题</h4>
            <p className="mb-3 text-xs text-zinc-500">
              设置全屏背景贴图与透明度；清除后恢复默认深色界面。下方预览与主界面一致；若背景偏淡，请调高透明度。
            </p>
            <div className="relative mb-4 h-44 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-inner">
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
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-zinc-500">
                  尚未选择背景图，请点击「选择背景图」
                </div>
              )}
              <div className="absolute inset-x-0 top-0 flex h-9 items-center border-b border-zinc-800/80 bg-zinc-900/75 px-3 text-[11px] text-zinc-400 backdrop-blur-sm">
                顶栏示意（实际界面会铺满全屏）
              </div>
              <div className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[10px] text-zinc-300">
                预览 · 透明度 {Math.round((theme.backgroundOpacity ?? 0.35) * 100)}%
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                onClick={() => themeFileRef.current?.click()}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition hover:brightness-110"
              >
                选择背景图
              </button>
              <button
                type="button"
                onClick={() => clearThemeBackground()}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition hover:brightness-110"
              >
                清除背景
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-400">背景透明度</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(theme.backgroundOpacity * 100)}
                onChange={(e) => setThemeOpacity(Number(e.target.value) / 100)}
                className="h-2 w-40 max-w-full accent-blue-500"
              />
              <span className="text-xs tabular-nums text-zinc-400">
                {Math.round(theme.backgroundOpacity * 100)}%
              </span>
            </div>
          </section>
          {groups.map((group) => (
            <section key={group.key} className="rounded-xl border border-zinc-800 p-3">
              <h4 className="mb-2 text-sm font-semibold text-zinc-200">{group.label}</h4>
              <div className="mb-2 flex flex-wrap gap-2">
                {getValues(group.key).map((item) => {
                  const usage = getConfigUsageCount(group.key, item)
                  return (
                    <button
                      key={item}
                      onClick={() => handleDelete(group.key, item)}
                      className="group rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700"
                      title={usage > 0 ? `被 ${usage} 个模型引用` : '删除'}
                    >
                      {item}
                      <span className="ml-1 text-zinc-500 group-hover:text-red-400">x</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={inputMap[group.key] || ''}
                  onChange={(event) =>
                    setInputMap((prev) => ({ ...prev, [group.key]: event.target.value }))
                  }
                  placeholder={`新增${group.label}`}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleAdd(group.key)}
                  className="rounded-lg bg-blue-500 px-3 py-2 text-sm text-white transition hover:brightness-110"
                >
                  新增
                </button>
              </div>
            </section>
          ))}
          <section className="rounded-xl border border-zinc-800 bg-zinc-950/35 p-3">
            <h4 className="mb-2 text-sm font-semibold text-zinc-200">关于作者</h4>
            <p className="text-xs leading-relaxed text-zinc-400">{authorBlurb}</p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              <span>微信号</span>
              <span className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-amber-200/90">
                {AUTHOR_WECHAT}
              </span>
              <button
                type="button"
                onClick={copyWechat}
                className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-blue-400 transition hover:bg-zinc-700"
              >
                复制
              </button>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TypeManagementModal
