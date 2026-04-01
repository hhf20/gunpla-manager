import { useCallback, useEffect, useState } from 'react'
import { fetchCommentsByModel, postComment } from '../services/communityApi'
import { isSupabaseConfigured } from '../supabaseClient'

function formatTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function shortUser(id) {
  if (!id || typeof id !== 'string') return '用户'
  return `用户 ${id.slice(0, 8)}…`
}

/**
 * 云端评论区（model_id 对应本地模型 id 的字符串形式，不写入本地 data.json）
 */
function ModelCommentsSection({ modelId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !modelId) {
      setItems([])
      return
    }
    setLoading(true)
    setError('')
    const res = await fetchCommentsByModel(modelId)
    setLoading(false)
    if (!res.ok) {
      setError(res.error || '加载失败')
      setItems([])
      return
    }
    setItems(res.data || [])
  }, [modelId])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      window.alert('未配置 Supabase，无法发布评论')
      return
    }
    setPosting(true)
    setError('')
    const res = await postComment(modelId, draft)
    setPosting(false)
    if (!res.ok) {
      setError(res.error || '发布失败')
      return
    }
    setDraft('')
    await load()
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 p-3">
        <p className="text-xs font-medium text-zinc-300">云端评论</p>
        <p className="mt-1 text-xs text-zinc-500">
          未配置 Supabase。设置环境变量后可在此与同好交流（不影响本地数据）。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/35 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-200">云端评论</p>
        <button
          type="button"
          onClick={() => load()}
          className="text-xs text-blue-400 hover:underline"
          disabled={loading}
        >
          {loading ? '刷新中…' : '刷新'}
        </button>
      </div>

      {error ? <p className="mb-2 text-xs text-red-400">{error}</p> : null}

      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {loading && items.length === 0 ? (
          <p className="text-xs text-zinc-500">加载中…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-zinc-500">暂无评论，来抢沙发吧。</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className="rounded-lg bg-zinc-900/80 px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                <span>{shortUser(c.user_id)}</span>
                <span>{formatTime(c.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-zinc-200">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="写下你的想法…（仅保存在云端）"
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={posting || !draft.trim()}
          className="w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {posting ? '发布中…' : '发布评论'}
        </button>
      </form>
    </div>
  )
}

export default ModelCommentsSection
