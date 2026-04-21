import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// 设置 PDF.js worker（Vite 会把 worker 打包进构建产物）
const workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

function PdfPreview({ fileUrl }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [pdf, setPdf] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')
  const [scale, setScale] = useState(1.3)
  const [page, setPage] = useState(1)

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
  })

  useEffect(() => {
    let cancelled = false
    setPdf(null)
    setNumPages(0)
    setPage(1)
    setError('')

    if (!fileUrl) return

    ;(async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl)
        const doc = await loadingTask.promise
        if (cancelled) return
        setPdf(doc)
        setNumPages(doc.numPages || 0)
        setPage(1)
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'PDF 加载失败')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      if (!pdf || !canvasRef.current) return
      if (!numPages) return

      setRendering(true)
      setError('')

      try {
        const targetPage = Math.min(Math.max(1, page), numPages)
        const p = await pdf.getPage(targetPage)
        const viewport = p.getViewport({ scale })

        const canvas = canvasRef.current
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) throw new Error('Canvas 2D context 不可用')

        await p.render({ canvasContext: ctx, viewport }).promise
      } catch (e) {
        if (!cancelled) setError(e?.message || 'PDF 渲染失败')
      } finally {
        // 关键：即使被取消，也要恢复 rendering 状态，否则后续缩放/翻页会被阻止。
        setRendering(false)
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [pdf, scale, page, numPages])

  const clampedPage = useMemo(() => {
    if (!numPages) return 1
    return Math.min(Math.max(1, page), numPages)
  }, [page, numPages])

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b theme-border px-2 py-2">
        <span className="text-xs theme-text-secondary">缩放</span>
        <button
          type="button"
          className="app-btn-secondary !rounded !px-2 !py-1 !text-xs"
          onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))))}
        >
          -
        </button>
        <span className="text-xs tabular-nums theme-text-primary">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="app-btn-secondary !rounded !px-2 !py-1 !text-xs"
          onClick={() => setScale((s) => Math.min(3, Number((s + 0.1).toFixed(2))))}
        >
          +
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="app-btn-secondary !rounded !px-2 !py-1 !text-xs disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1 || !numPages}
          >
            上一页
          </button>
          <span className="text-xs tabular-nums theme-text-secondary">
            {clampedPage}/{numPages || 0}
          </span>
          <button
            type="button"
            className="app-btn-secondary !rounded !px-2 !py-1 !text-xs disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={clampedPage >= numPages || !numPages}
          >
            下一页
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex-1 overflow-auto p-4 text-sm text-[color:var(--danger)]">{error}</div>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-auto theme-surface-soft"
          ref={containerRef}
          style={{ cursor: dragRef.current.dragging ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => {
            const el = containerRef.current
            if (!el) return
            dragRef.current.dragging = true
            dragRef.current.startX = e.clientX
            dragRef.current.startScrollLeft = el.scrollLeft
          }}
          onMouseMove={(e) => {
            const el = containerRef.current
            if (!el) return
            if (!dragRef.current.dragging) return
            const dx = e.clientX - dragRef.current.startX
            el.scrollLeft = dragRef.current.startScrollLeft - dx
          }}
          onMouseUp={() => {
            dragRef.current.dragging = false
          }}
          onMouseLeave={() => {
            dragRef.current.dragging = false
          }}
        >
          {rendering ? (
            <div className="p-6 text-sm theme-text-secondary">{numPages ? '渲染中…' : '加载中…'}</div>
          ) : null}
          <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />
        </div>
      )}
    </div>
  )
}

export default PdfPreview

