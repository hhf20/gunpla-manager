function CoverCandidatePicker({ open, candidates, loading, onClose, onConfirm }) {
  if (!open) return null

  return (
    <div
      className="dex-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="dex-modal-panel flex max-h-[86vh] w-full max-w-5xl flex-col rounded-[8px] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] theme-text-muted">
              Cover Candidates
            </div>
            <h3 className="mt-2 text-xl font-semibold theme-text-primary">选择候选封面</h3>
            <p className="mt-1 text-sm theme-text-secondary">
              先预览候选图，确认后才会保存到本地封面库。
            </p>
          </div>
          <button type="button" onClick={onClose} className="app-btn-secondary !px-4 !py-2">
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {candidates?.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {candidates.map((candidate, index) => (
                <article
                  key={`${candidate.provider}-${candidate.downloadUrl}-${index}`}
                  className="theme-surface overflow-hidden rounded-[22px] border"
                >
                  <div className="aspect-[4/3] theme-surface-elevated">
                    <img
                      src={candidate.previewUrl || candidate.downloadUrl}
                      alt={candidate.label || `候选图片 ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    <div className="text-sm font-medium theme-text-primary">
                      {candidate.label || `候选图片 ${index + 1}`}
                    </div>
                    <div className="text-xs theme-text-secondary">{candidate.provider || 'unknown'}</div>
                    {candidate.sourceUrl ? (
                      <div className="truncate text-[11px] theme-text-muted">{candidate.sourceUrl}</div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onConfirm(candidate)}
                      disabled={loading}
                      className="app-btn-primary !w-full !px-4 !py-2.5 !text-sm"
                    >
                      {loading ? '保存中...' : '使用这张图'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="theme-surface-soft rounded-[22px] border border-dashed px-6 py-12 text-center text-sm theme-text-secondary">
              当前没有可用候选图。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CoverCandidatePicker
