import { NextResponse } from 'next/server';
import { runCompute } from '@/lib/compute';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby 默认 10s 超时，导入+重算需要更长

// POST /api/compute — 手动触发评分计算（MVP：数据导入后调用）
export async function POST() {
  try {
    const summary = await runCompute();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
