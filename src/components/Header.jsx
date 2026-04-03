import { useEffect, useRef, useState } from 'react'
import ChangelogModal from './ChangelogModal'
import { useGunpla } from '../context/GunplaContext'
import brandMark from '../assets/jinwucangjiao-mark.svg'
import {
  getMobileWebUrlOrPlaceholder,
  hasConfiguredMobileWebUrl,
} from '../config/mobileWeb'
import { downloadGunplaImportTemplate } from '../utils/excelTemplate'
import { log } from '../utils/logger'

const APP_CHINESE_NAME = '金屋藏胶'
const APP_ENGLISH_NAME = 'Gunpla Manager'

const typeTabs = [
  { label: '全部', value: 'all' },
  { label: '我的收藏', value: 'owned' },
  { label: '愿望清单', value: 'wishlist' },
]

function Header() {
  const {
    openAddModal,
    openStats,
    openTypeManagement,
    openCoverLibrary,
    filterState,
    setFilterState,
    exportData,
    exportPortableData,
    importData,
    importExcel,
    platformCapabilities,
  } = useGunpla()

  const fileInputRef = useRef(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateReady, setUpdateReady] = useState(false)
  const mobileWebUrl = getMobileWebUrlOrPlaceholder()

  const showPortableExportMessage = async () => {
    await exportPortableData()
    window.alert(
      hasConfiguredMobileWebUrl()
        ? `已导出移动端数据包。请让用户在手机浏览器打开 ${mobileWebUrl} 后导入 JSON 文件。`
        : `已导出移动端数据包。部署 GitHub Pages 或本地构建前，请把 VITE_MOBILE_WEB_URL 配置为正式地址，例如 ${mobileWebUrl}。`,
    )
  }

  const openMobileWeb = async () => {
    if (!hasConfiguredMobileWebUrl()) {
      window.alert(
        `移动端网址尚未配置。请先在 .env 或 CI 环境变量中填写 VITE_MOBILE_WEB_URL，例如：${mobileWebUrl}`,
      )
      return
    }

    try {
      if (window.api?.openExternal) {
        const result = await window.api.openExternal(mobileWebUrl)
        if (!result?.ok) throw new Error(result?.message || '打开移动端失败')
        return
      }
      window.open(mobileWebUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      window.alert(error?.message || '打开移动端失败')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const result =
      ext === 'xlsx' || ext === 'xls' ? await importExcel(file) : await importData(file)
    window.alert(result.message)
    event.target.value = ''
  }

  const openLogs = async () => {
    try {
      if (window.api?.openLogsFolder) await window.api.openLogsFolder()
      else window.alert('当前环境不支持打开日志目录，请在桌面版中使用。')
    } catch {
      window.alert('打开日志目录失败。')
    }
  }

  const checkUpdates = async () => {
    try {
      setUpdateReady(false)
      setUpdateStatus('正在检查更新...')
      if (!window.api?.checkForUpdates) {
        setUpdateStatus('当前环境不支持检查更新，请在桌面版中使用。')
        return
      }
      const res = await window.api.checkForUpdates()
      if (!res?.ok) {
        setUpdateStatus(res?.message || '检查更新失败。')
        return
      }
      setUpdateStatus('已发起检查，如有新版本会自动开始下载。')
    } catch (error) {
      setUpdateStatus('检查更新失败。')
      log('error', 'checkUpdates failed', error?.message || String(error))
    }
  }

  const installUpdate = async () => {
    try {
      if (!window.api?.quitAndInstallUpdate) return
      await window.api.quitAndInstallUpdate()
    } catch (error) {
      window.alert('安装更新失败。')
      log('error', 'installUpdate failed', error?.message || String(error))
    }
  }

  useEffect(() => {
    if (!window.api?.onUpdateEvent) return

    const unsubscribe = window.api.onUpdateEvent((payload) => {
      const type = payload?.type
      if (type === 'checking-for-update') setUpdateStatus('正在检查更新...')
      else if (type === 'update-not-available') setUpdateStatus('当前已经是最新版本。')
      else if (type === 'update-available') {
        setUpdateStatus(`发现新版本 ${payload?.info?.version || ''}，正在下载...`)
      } else if (type === 'download-progress') {
        const percent =
          typeof payload?.progress?.percent === 'number'
            ? payload.progress.percent.toFixed(1)
            : ''
        setUpdateStatus(percent ? `正在下载更新... ${percent}%` : '正在下载更新...')
      } else if (type === 'update-downloaded') {
        setUpdateReady(true)
        setUpdateStatus('更新已下载完成，点击“立即安装”后重启生效。')
      } else if (type === 'error') {
        setUpdateStatus(payload?.message || '更新过程中出现错误。')
      }
    })

    return () => {
      try {
        unsubscribe?.()
      } catch {
        // ignore
      }
    }
  }, [])

  const compactSecondaryButton =
    'app-btn-secondary shrink-0 whitespace-nowrap !rounded-full !px-3.5 !py-2 !text-xs'

  const utilityActions = [
    { key: 'stats', label: '统计面板', onClick: openStats },
    ...(platformCapabilities.supportsLocalImageLibrary
      ? [{ key: 'cover', label: '本地封面', onClick: () => openCoverLibrary('manage') }]
      : []),
    { key: 'type', label: '类型设置', onClick: openTypeManagement },
    { key: 'changelog', label: '更新日志', onClick: () => setChangelogOpen(true) },
  ]

  return (
    <>
      <header className="px-4 pt-4 md:px-6 md:pt-5">
        <div className="app-panel-strong relative overflow-hidden rounded-[28px] px-4 py-4 md:px-5 md:py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,212,255,0.16),transparent_28%),linear-gradient(125deg,rgba(255,255,255,0.03),transparent_50%)]" />

          <div className="relative flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-sky-200/20 bg-slate-950/60 shadow-[0_14px_34px_rgba(43,177,230,0.22)]">
                  <img src={brandMark} alt="金屋藏胶 Logo" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.36em] text-sky-100/55">
                    {APP_ENGLISH_NAME}
                  </p>
                  <h1 className="truncate text-[1.75rem] font-semibold tracking-tight text-white">
                    {APP_CHINESE_NAME}
                  </h1>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 xl:max-w-5xl xl:flex-row xl:items-center xl:justify-end">
                <div className="min-w-0 flex-1 xl:max-w-sm">
                  <input
                    type="text"
                    placeholder="搜索名称、型号、系列或标签..."
                    value={filterState.searchText}
                    onChange={(event) =>
                      setFilterState((prev) => ({ ...prev, searchText: event.target.value }))
                    }
                    className="app-input !rounded-full !py-2.5"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full border border-white/10 bg-black/15 p-1">
                    {typeTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setFilterState((prev) => ({ ...prev, type: tab.value }))}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          filterState.type === tab.value
                            ? 'bg-cyan-400/18 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,212,255,0.25)]'
                            : 'text-slate-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={openAddModal}
                    className="app-btn-primary !rounded-full !px-5 !py-2.5"
                  >
                    新增模型
                  </button>

                  <div className="relative xl:hidden">
                    <button
                      type="button"
                      onClick={() => setMoreOpen((open) => !open)}
                      className={compactSecondaryButton}
                      aria-expanded={moreOpen}
                    >
                      更多
                    </button>
                    {moreOpen ? (
                      <div className="app-panel-strong absolute right-0 z-50 mt-2 flex min-w-[12rem] flex-col overflow-hidden rounded-2xl p-1">
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          onClick={() => {
                            exportData()
                            setMoreOpen(false)
                          }}
                        >
                          导出完整数据
                        </button>
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          onClick={() => {
                            openMobileWeb()
                            setMoreOpen(false)
                          }}
                        >
                          打开移动端
                        </button>
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          onClick={() => {
                            showPortableExportMessage()
                            setMoreOpen(false)
                          }}
                        >
                          导出到移动端
                        </button>
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          onClick={() => {
                            handleImportClick()
                            setMoreOpen(false)
                          }}
                        >
                          导入数据
                        </button>
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                          onClick={() => {
                            downloadGunplaImportTemplate()
                            setMoreOpen(false)
                          }}
                        >
                          下载导入模板
                        </button>
                        {platformCapabilities.supportsLogs ? (
                          <button
                            type="button"
                            className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                            onClick={() => {
                              openLogs()
                              setMoreOpen(false)
                            }}
                          >
                            日志
                          </button>
                        ) : null}
                        {platformCapabilities.supportsAutoUpdate ? (
                          <button
                            type="button"
                            className="rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                            onClick={() => {
                              checkUpdates()
                              setMoreOpen(false)
                            }}
                          >
                            检查更新
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden flex-wrap items-center gap-2 xl:flex">
                    <button type="button" onClick={exportData} className={compactSecondaryButton}>
                      导出完整数据
                    </button>
                    <button type="button" onClick={showPortableExportMessage} className={compactSecondaryButton}>
                      导出到移动端
                    </button>
                    <button type="button" onClick={openMobileWeb} className={compactSecondaryButton}>
                      打开移动端
                    </button>
                    <button type="button" onClick={handleImportClick} className={compactSecondaryButton}>
                      导入数据
                    </button>
                    <button
                      type="button"
                      onClick={downloadGunplaImportTemplate}
                      className={compactSecondaryButton}
                    >
                      下载导入模板
                    </button>
                    {platformCapabilities.supportsLogs ? (
                      <button type="button" onClick={openLogs} className={compactSecondaryButton}>
                        日志
                      </button>
                    ) : null}
                    {platformCapabilities.supportsAutoUpdate ? (
                      <button type="button" onClick={checkUpdates} className={compactSecondaryButton}>
                        检查更新
                      </button>
                    ) : null}
                    {updateReady ? (
                      <button
                        type="button"
                        onClick={installUpdate}
                        className="app-btn-primary !rounded-full !px-4 !py-2"
                      >
                        立即安装
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {utilityActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openMobileWeb}
                  className="rounded-full border border-cyan-300/18 bg-cyan-400/10 px-3.5 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  移动端入口
                </button>
              </div>

              <div className="rounded-full border border-white/10 bg-black/10 px-3.5 py-2 text-xs text-slate-300">
                桌面端继续负责维护数据，移动端优先做轻量浏览与导入。
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.xlsx,.xls"
              onChange={handleImportChange}
              className="hidden"
            />
          </div>
        </div>
      </header>

      {updateStatus ? (
        <div className="px-4 pb-2 pt-2 md:px-6">
          <div className="app-panel flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-slate-200">
            <span>{updateStatus}</span>
            {updateReady ? (
              <button
                type="button"
                onClick={installUpdate}
                className="app-btn-primary !rounded-full !px-4 !py-2 !text-xs"
              >
                立即安装
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  )
}

export default Header
