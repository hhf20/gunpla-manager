/**
 * 本机连通性检测：读取项目根目录 .env 中的 VITE_* 变量，请求 REST API。
 * 运行：npm run test:supabase
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return false
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
  return true
}

if (!process.env.VITE_SUPABASE_URL) loadEnvFile()

const urlRaw = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!urlRaw || !key) {
  console.error('未读取到 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY。')
  console.error('请在项目根目录创建 .env（可参考 .env.example），再执行 npm run test:supabase')
  process.exit(1)
}

const base = urlRaw.replace(/\/$/, '')

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { res, body }
}

console.log('正在检测 Supabase REST …')

const covers = await get('/rest/v1/covers?select=id,name,image_url&limit=3')
console.log(`[covers] HTTP ${covers.res.status}`)
if (!covers.res.ok) {
  console.error(typeof covers.body === 'string' ? covers.body : JSON.stringify(covers.body, null, 2))
  process.exit(1)
}
console.log('covers 样例:', JSON.stringify(covers.body, null, 2))

const comments = await get('/rest/v1/comments?select=id&limit=1')
console.log(`[comments] HTTP ${comments.res.status}`)
if (!comments.res.ok) {
  console.error(typeof comments.body === 'string' ? comments.body : JSON.stringify(comments.body, null, 2))
  process.exit(1)
}

console.log('检测通过：表可访问、密钥有效。')
