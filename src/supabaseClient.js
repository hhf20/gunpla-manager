import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  url && typeof url === 'string' && url.length > 0 && anonKey && typeof anonKey === 'string',
)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'gunpla-manager-supabase-auth',
      },
    })
  : null

export async function ensureSupabaseSession() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: '未配置 Supabase。', session: null }
  }

  const {
    data: { session: existing },
    error: readError,
  } = await supabase.auth.getSession()
  if (readError) return { ok: false, error: readError.message, session: null }
  if (existing?.user) return { ok: true, session: existing, error: null }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    return {
      ok: false,
      error: `${error.message}（请确认 Supabase 控制台已开启 Anonymous 登录）`,
      session: null,
    }
  }
  if (!data.session?.user) {
    return { ok: false, error: '匿名登录未返回有效会话。', session: null }
  }
  return { ok: true, session: data.session, error: null }
}
