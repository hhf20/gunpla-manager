import { AUTHOR_WECHAT, authorBlurb } from '../data/author'
import { changelog, latestVersionLabel } from '../data/changelog'

function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="changelog-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 id="changelog-title" className="text-lg font-semibold text-zinc-100">
              金屋藏胶更新日志
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              了解每次版本带来的变化。
              {latestVersionLabel ? (
                <span className="ml-2 text-zinc-600">· 最新 v{latestVersionLabel}</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:brightness-110"
          >
            关闭
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-6">
            {changelog.map((entry) => (
              <li key={entry.version}>
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-blue-400">v{entry.version}</span>
                  <span className="text-xs text-zinc-500">{entry.date}</span>
                  {entry.title ? <span className="text-sm text-zinc-300">{entry.title}</span> : null}
                </div>
                <ul className="list-inside list-disc space-y-1.5 text-sm leading-relaxed text-zinc-400">
                  {entry.items.map((line, index) => (
                    <li key={`${entry.version}-${index}`} className="marker:text-zinc-600">
                      {line}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-zinc-800 px-5 py-3">
          <p className="text-xs leading-relaxed text-zinc-500">{authorBlurb}</p>
          <p className="mt-1.5 text-xs text-zinc-400">
            微信：<span className="font-mono text-zinc-300">{AUTHOR_WECHAT}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChangelogModal
