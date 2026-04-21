import { AUTHOR_WECHAT, authorBlurb } from '../data/author'
import { changelog, changelogGuide, latestVersionLabel } from '../data/changelog'

function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      className="dex-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
      onClick={onClose}
    >
      <div
        className="dex-modal-panel flex max-h-[85vh] w-full max-w-3xl flex-col rounded-[8px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b theme-border px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] theme-text-muted">
                Release Notes
              </div>
              <h2 id="changelog-title" className="mt-2 text-xl font-semibold theme-text-primary">
                金屋藏胶更新日志
              </h2>
              <p className="mt-1 text-sm theme-text-secondary">
                {changelogGuide}
                {latestVersionLabel ? (
                  <span className="ml-2 theme-text-muted">当前正式版本 v{latestVersionLabel}</span>
                ) : null}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="app-btn-secondary !rounded-[14px] !px-4 !py-2 !text-xs"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="app-scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="theme-surface-soft mb-5 rounded-[18px] px-4 py-3 text-sm theme-text-secondary">
            {changelogGuide}
          </div>

          <div className="space-y-4">
            {changelog.map((entry) => (
              <section key={entry.version} className="theme-surface rounded-[20px] px-4 py-4">
                <div className="mb-3 flex flex-wrap items-baseline gap-2">
                  <span className="theme-accent-badge">v{entry.version}</span>
                  <span className="text-xs theme-text-muted">{entry.date}</span>
                  <span className="text-sm font-medium theme-text-primary">{entry.title}</span>
                </div>

                <ul className="space-y-2 text-sm leading-relaxed theme-text-secondary">
                  {entry.items.map((line, index) => (
                    <li key={`${entry.version}-${index}`} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-strong)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t theme-border px-5 py-4">
          <p className="text-sm leading-6 theme-text-secondary">{authorBlurb}</p>
          <p className="mt-2 text-sm theme-text-secondary">
            微信：
            <span className="ml-1 font-mono theme-text-primary">{AUTHOR_WECHAT}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChangelogModal
