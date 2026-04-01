import { useEffect, useRef, useState } from 'react'
import ChangelogModal from './ChangelogModal'
import { useGunpla } from '../context/GunplaContext'
import { downloadGunplaImportTemplate } from '../utils/excelTemplate'
import { log } from '../utils/logger'

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
    importData,
    importExcel,
  } = useGunpla()
  const fileInputRef = useRef(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateReady, setUpdateReady] = useState(false)

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const result =
      ext === 'xlsx' || ext === 'xls' ? await importExcel(file) : await importData(file)
    window.alert(result.message)
  }

  const btnSecondary =
    'shrink-0 whitespace-nowrap rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-200 transition duration-200 hover:brightness-110 sm:px-4 sm:text-sm'

  const openLogs = async () => {
    try {
      if (window.api?.openLogsFolder) await window.api.openLogsFolder()
      else window.alert('当前环境不支持打开日志文件夹（请在桌面版使用）')
    } catch {
      window.alert('打开日志文件夹失败')
    }
  }

  const checkUpdates = async () => {
    try {
      setUpdateReady(false)
      setUpdateStatus('正在检查更新...')
      if (!window.api?.checkForUpdates) {
        setUpdateStatus('当前环境不支持检查更新（请在桌面版使用）')
        return
      }
      const res = await window.api.checkForUpdates()
      if (!res?.ok) {
        setUpdateStatus(res?.message || '检查更新失败')
        return
      }
      setUpdateStatus('已发起检查（若有更新会自动下载）')
    } catch (e) {
      setUpdateStatus('检查更新失败')
      log('error', 'checkUpdates failed', e?.message || String(e))
    }
  }

  const installUpdate = async () => {
    try {
      if (!window.api?.quitAndInstallUpdate) return
      await window.api.quitAndInstallUpdate()
    } catch (e) {
      window.alert('安装更新失败')
      log('error', 'installUpdate failed', e?.message || String(e))
    }
  }

  useEffect(() => {
    if (!window.api?.onUpdateEvent) return
    const unsubscribe = window.api.onUpdateEvent((payload) => {
      const type = payload?.type
      if (type === 'checking-for-update') setUpdateStatus('正在检查更新...')
      else if (type === 'update-not-available') setUpdateStatus('已是最新版本')
      else if (type === 'update-available')
        setUpdateStatus(`发现新版本 ${payload?.info?.version || ''}，正在下载...`)
      else if (type === 'download-progress') {
        const p = payload?.progress
        const percent = typeof p?.percent === 'number' ? p.percent.toFixed(1) : ''
        setUpdateStatus(percent ? `正在下载更新... ${percent}%` : '正在下载更新...')
      } else if (type === 'update-downloaded') {
        setUpdateReady(true)
        setUpdateStatus('更新已下载，点击“立即安装”后重启生效')
      } else if (type === 'error') {
        setUpdateStatus(payload?.message || '更新出错')
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

  return (
    <>
    <header className="border-b border-zinc-800 bg-zinc-900/95 px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
            GM
          </div>
          <h1 className="truncate text-base font-semibold tracking-wide text-zinc-100 sm:text-lg">
            Gunpla Manager
          </h1>
        </div>

        <div className="order-3 flex min-w-0 flex-1 basis-full sm:order-none sm:basis-[min(100%,22rem)] lg:max-w-md">
          <input
            type="text"
            placeholder="搜索名称、系列或标签..."
            value={filterState.searchText}
            onChange={(event) =>
              setFilterState((prev) => ({ ...prev, searchText: event.target.value }))
            }
            className="min-w-0 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
          />
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:ml-0 sm:flex-1 sm:justify-end lg:flex-none">
          <div className="relative flex shrink-0 rounded-xl bg-zinc-800 p-1">
            <div
              className={`absolute top-1 h-8 rounded-lg bg-blue-500 transition-all duration-300 ${
                filterState.type === 'all'
                  ? 'left-1 w-[52px]'
                  : filterState.type === 'owned'
                    ? 'left-[57px] w-[84px]'
                    : 'left-[143px] w-[84px]'
              }`}
            />
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, type: tab.value }))}
                className={`relative z-10 rounded-lg px-2.5 py-1.5 text-xs transition sm:px-3 ${
                  filterState.type === tab.value ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="shrink-0 whitespace-nowrap rounded-xl bg-blue-500 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:brightness-110 sm:px-4 sm:text-sm"
          >
            + 新增模型
          </button>

          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={btnSecondary}
              aria-expanded={moreOpen}
            >
              更多
            </button>
            {moreOpen ? (
              <div className="absolute right-0 z-50 mt-1 flex min-w-[10rem] flex-col rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                <button
                  type="button"
                  className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    exportData()
                    setMoreOpen(false)
                  }}
                >
                  导出数据
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    handleImportClick()
                    setMoreOpen(false)
                  }}
                >
                  导入数据
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    downloadGunplaImportTemplate()
                    setMoreOpen(false)
                  }}
                >
                  下载导入模板
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    setChangelogOpen(true)
                    setMoreOpen(false)
                  }}
                >
                  更新日志
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    openLogs()
                    setMoreOpen(false)
                  }}
                >
                  打开日志文件夹
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    checkUpdates()
                    setMoreOpen(false)
                  }}
                >
                  检查更新
                </button>
                {updateReady ? (
                  <button
                    type="button"
                    className="px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      installUpdate()
                      setMoreOpen(false)
                    }}
                  >
                    立即安装
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <button type="button" onClick={exportData} className={btnSecondary}>
              导出数据
            </button>
            <button type="button" onClick={handleImportClick} className={btnSecondary}>
              导入数据
            </button>
            <button type="button" onClick={downloadGunplaImportTemplate} className={btnSecondary}>
              下载导入模板
            </button>
            <button type="button" onClick={openLogs} className={btnSecondary}>
              日志
            </button>
            <button type="button" onClick={checkUpdates} className={btnSecondary} title="检查 GitHub Release 更新">
              检查更新
            </button>
            {updateReady ? (
              <button
                type="button"
                onClick={installUpdate}
                className="shrink-0 whitespace-nowrap rounded-xl bg-blue-500 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:brightness-110 sm:px-4 sm:text-sm"
                title="下载完成后安装并重启"
              >
                立即安装
              </button>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.xlsx,.xls"
            onChange={handleImportChange}
            className="hidden"
          />

          <button type="button" onClick={openStats} className={btnSecondary}>
            统计
          </button>
          <button
            type="button"
            onClick={() => openCoverLibrary('manage')}
            className={btnSecondary}
          >
            封面库
          </button>
          <button type="button" onClick={openTypeManagement} className={btnSecondary}>
            设置
          </button>
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-xs text-zinc-100 transition duration-200 hover:bg-zinc-700 sm:px-4 sm:text-sm"
            title="查看版本更新说明"
          >
            更新日志
          </button>
        </div>
      </div>
    </header>
    {updateStatus ? (
      <div className="border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300 sm:px-4">
        {updateStatus}
      </div>
    ) : null}
    <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </>
  )
}

export default Header
