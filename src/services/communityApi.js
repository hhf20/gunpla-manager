import { ensureSupabaseSession, isSupabaseConfigured, supabase } from '../supabaseClient'

/** 与 supabase/schema.sql 中 Storage 桶名一致 */
export const COMMUNITY_COVERS_BUCKET = 'gunpla-covers'

function notConfigured() {
  return { ok: false, error: '未配置 Supabase：请在 .env 中设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY' }
}

function formatStorageUploadError(message) {
  const m = message || ''
  if (/bucket not found/i.test(m)) {
    return `${m}。请在 Supabase 创建公开存储桶「${COMMUNITY_COVERS_BUCKET}」：打开 SQL Editor，执行项目里 supabase/schema.sql 从「Storage」那一段起的全部语句；或在 Storage 里新建同名桶后再执行该段里的 policy SQL。`
  }
  return m
}

function mimeFromExt(ext) {
  const e = (ext || '').toLowerCase()
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'
  if (e === '.webp') return 'image/webp'
  if (e === '.gif') return 'image/gif'
  return 'image/png'
}

function base64ToBlob(base64, ext) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeFromExt(ext) })
}

/**
 * 将本地资料库封面（file://）上传到 Storage 并写入 covers 表。需在 Electron 中且已配置匿名登录。
 * @param {{ name?: string, imageUrl?: string }} cover
 */
export async function uploadLocalCoverToCommunity(cover) {
  if (!isSupabaseConfigured || !supabase) return notConfigured()
  if (typeof window === 'undefined' || !window.api?.readImageBuffer) {
    return { ok: false, error: '上传功能需在 Gunpla Manager 桌面版中使用' }
  }

  const imageUrl = cover?.imageUrl || ''
  if (!imageUrl.startsWith('file:')) {
    return {
      ok: false,
      error: '仅支持本机资料库图片。请使用「从文件夹导入」加入封面后再分享；已加入的社区链接图无需再传。',
    }
  }

  const readRes = await window.api.readImageBuffer(imageUrl)
  if (!readRes?.ok) return { ok: false, error: readRes?.message || '读取图片失败' }

  const auth = await ensureSupabaseSession()
  if (!auth.ok || !auth.session?.user) {
    return { ok: false, error: auth.error || '无法建立登录会话' }
  }
  const user = auth.session.user

  const ext = readRes.ext || '.png'
  const safeExt = ext.startsWith('.') ? ext.slice(1) : ext
  const objectPath = `${user.id}/${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`
  const blob = base64ToBlob(readRes.base64, ext)

  const { error: upErr } = await supabase.storage
    .from(COMMUNITY_COVERS_BUCKET)
    .upload(objectPath, blob, {
      contentType: mimeFromExt(ext),
      upsert: false,
    })
  if (upErr) return { ok: false, error: formatStorageUploadError(upErr.message) }

  const { data: pub } = supabase.storage.from(COMMUNITY_COVERS_BUCKET).getPublicUrl(objectPath)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) return { ok: false, error: '无法生成公开访问链接' }

  const displayName = String(cover?.name || '共享封面').trim().slice(0, 200) || '共享封面'
  const { error: insErr } = await supabase.from('covers').insert({
    name: displayName,
    image_url: publicUrl,
    user_id: user.id,
  })
  if (insErr) return { ok: false, error: insErr.message }
  return { ok: true }
}

/**
 * 获取公共共享封面列表（云端，不影响本地）
 * @returns {Promise<{ ok: boolean, data?: Array, error?: string }>}
 */
export async function fetchPublicCovers() {
  if (!isSupabaseConfigured || !supabase) return { ...notConfigured(), data: [] }
  const { data, error } = await supabase
    .from('covers')
    .select('id, name, image_url, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) return { ok: false, data: [], error: error.message }
  return { ok: true, data: data ?? [] }
}

/**
 * 按模型 ID 拉取评论（model_id 与本地 gunpla.id 对应，存为字符串）
 */
export async function fetchCommentsByModel(modelId) {
  if (!isSupabaseConfigured || !supabase) return { ...notConfigured(), data: [] }
  const mid = String(modelId ?? '')
  if (!mid) return { ok: false, data: [], error: '缺少 model_id' }

  const { data, error } = await supabase
    .from('comments')
    .select('id, model_id, user_id, content, created_at')
    .eq('model_id', mid)
    .order('created_at', { ascending: true })

  if (error) return { ok: false, data: [], error: error.message }
  return { ok: true, data: data ?? [] }
}

/**
 * 发布一条评论（需已通过匿名/登录获得 session）
 */
export async function postComment(modelId, content) {
  if (!isSupabaseConfigured || !supabase) return notConfigured()
  const mid = String(modelId ?? '')
  const text = (content ?? '').trim()
  if (!mid) return { ok: false, error: '缺少 model_id' }
  if (!text) return { ok: false, error: '评论内容不能为空' }

  const auth = await ensureSupabaseSession()
  if (!auth.ok || !auth.session?.user) {
    return { ok: false, error: auth.error || '无法建立登录会话' }
  }
  const user = auth.session.user

  const { data, error } = await supabase
    .from('comments')
    .insert({
      model_id: mid,
      user_id: user.id,
      content: text,
    })
    .select('id, model_id, user_id, content, created_at')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}
