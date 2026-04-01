import { useEffect } from 'react'
import { ensureSupabaseSession, isSupabaseConfigured } from '../supabaseClient'

/**
 * 在应用启动时预热 Supabase 匿名会话，减少首次发评论时的等待。
 */
export function useSupabaseSession() {
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let cancelled = false
    ;(async () => {
      const res = await ensureSupabaseSession()
      if (!cancelled && !res.ok && res.error) {
        console.warn('[Gunpla Manager] Supabase 会话:', res.error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
