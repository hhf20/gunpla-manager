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
        : `已导出移动端数据包。正式上线前，请把 VITE_MOBILE_WEB_URL 配置为可访问地址，例如 ${mobileWebUrl}。`,
    )
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

  const compactSecondaryButton = 'app-btn-secondary shrink-0 whitespace-nowrap !px-3 !py-1.5 !text-xs'
  const menuItemClass = 'dex-menu-item'

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
      <header className="dex-topbar-wrap">
        <div className="dex-topbar">
          <div className="dex-topbar-main">
            <div className="dex-brand">
              <img src={brandMark} alt="金屋藏胶 Logo" className="h-8 w-8 rounded" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.28em] text-gray-400">{APP_ENGLISH_NAME}</div>
                <div className="truncate text-base font-semibold text-gray-100">{APP_CHINESE_NAME}</div>
              </div>
            </div>

            <div className="dex-search">
              <input
                type="text"
                placeholder="搜索模型、编号、系列、标签"
                value={filterState.searchText}
                onChange={(event) => setFilterState((prev) => ({ ...prev, searchText: event.target.value }))}
                className="app-input !h-9 !rounded-md !py-1.5"
              />
            </div>

            <div className="dex-actions">
              <div className="dex-segmented">
                {typeTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterState((prev) => ({ ...prev, type: tab.value }))}
                    className={filterState.type === tab.value ? 'dex-segmented-item active' : 'dex-segmented-item'}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button type="button" onClick={openAddModal} className="app-btn-primary !h-9 !rounded-md !px-3 !py-1.5 !text-xs">
                新增模型
              </button>

              <div className="relative min-[1760px]:hidden">
                <button type="button" onClick={() => setMoreOpen((open) => !open)} className={compactSecondaryButton} aria-expanded={moreOpen}>
                  更多
                </button>
                {moreOpen ? (
                  <div className="dex-modal-panel absolute right-0 z-50 mt-2 flex min-w-[12rem] flex-col overflow-hidden rounded-md p-1">
                    <button
                      type="button"
                      className={menuItemClass}
                      onClick={() => {
                        exportData()
                        setMoreOpen(false)
                      }}
                    >
                      导出完整数据
                    </button>
                    <button
                      type="button"
                      className={menuItemClass}
                      onClick={() => {
                        showPortableExportMessage()
                        setMoreOpen(false)
                      }}
                    >
                      导出到移动端
                    </button>
                    <button
                      type="button"
                      className={menuItemClass}
                      onClick={() => {
                        handleImportClick()
                        setMoreOpen(false)
                      }}
                    >
                      导入数据
                    </button>
                    <button
                      type="button"
                      className={menuItemClass}
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
                        className={menuItemClass}
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
                        className={menuItemClass}
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

              <div className="hidden flex-wrap items-center gap-2 min-[1760px]:flex">
                <button type="button" onClick={exportData} className={compactSecondaryButton}>
                  导出完整数据
                </button>
                <button type="button" onClick={showPortableExportMessage} className={compactSecondaryButton}>
                  导出到移动端
                </button>
                <button type="button" onClick={handleImportClick} className={compactSecondaryButton}>
                  导入数据
                </button>
                <button type="button" onClick={downloadGunplaImportTemplate} className={compactSecondaryButton}>
                  下载模板
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
                  <button type="button" onClick={installUpdate} className="app-btn-primary !h-9 !rounded-md !px-3 !py-1.5 !text-xs">
                    立即安装
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="dex-toolbar">
            <div className="flex flex-wrap items-center gap-2">
              {utilityActions.map((action) => (
                <button key={action.key} type="button" onClick={action.onClick} className="theme-utility-chip rounded-md px-3 py-1.5 text-xs">
                  {action.label}
                </button>
              ))}
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
      </header>

      {updateStatus ? (
        <div className="px-4 pb-2">
          <div className="theme-surface flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm theme-text-secondary">
            <span>{updateStatus}</span>
            {updateReady ? (
              <button
                type="button"
                onClick={installUpdate}
                className="app-btn-primary !rounded-[14px] !px-4 !py-2 !text-xs"
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
