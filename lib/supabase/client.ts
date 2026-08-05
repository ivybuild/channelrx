// 浏览器端 Supabase 客户端（使用 anon key）
// MVP 不做登录认证，auth 会话不持久化即可。
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 在构建期（如 next build 扫描页面）可能尚未注入环境变量，仅告警不抛错
  console.warn('[supabase] 缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabaseBrowser = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
