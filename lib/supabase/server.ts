// 服务端 Supabase 客户端（懒加载单例）
// 优先使用 service_role key（绕过 RLS，适合服务端查询/写入）；
// 未配置时回退到 anon key。
// 懒加载：运行时才读环境变量，兼容 tsx 直跑脚本（env 加载晚于 import）。
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('缺少 Supabase 环境变量（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）');
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
