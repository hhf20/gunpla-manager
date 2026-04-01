import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && typeof url === 'string' && url.length > 0 && anonKey && typeof anonKey === 'string',
)

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Electron 使用 file:// 加载，勿从 URL hash 解析 session
        detectSessionInUrl: false,
        storageKey: 'gunpla-manager-supabase-auth',
      },
    })
  : null

/**
 * 确保存在可写库表用的会话：先读本地 session，没有则匿名登录。
 * 发布评论/上传等操作前应调用；避免仅用 getUser() 在无 JWT 时报 “Auth session missing!”。
 */
export async function ensureSupabaseSession() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: '未配置 Supabase', session: null }
  }

  const {
    data: { session: existing },
    error: readErr,
  } = await supabase.auth.getSession()
  if (readErr) return { ok: false, error: readErr.message, session: null }
  if (existing?.user) return { ok: true, session: existing, error: null }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    return {
      ok: false,
      error: `${error.message}（请确认控制台已开启 Anonymous 登录）`,
      session: null,
    }
  }
  if (!data.session?.user) {
    return { ok: false, error: '匿名登录未返回会话', session: null }
  }
  return { ok: true, session: data.session, error: null }
}
