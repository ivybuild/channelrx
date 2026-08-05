import { NextResponse } from 'next/server';
import { generateReport, type ReportScope } from '@/lib/reports';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby 默认 10s 超时，导入+重算需要更长

// POST /api/ai-report — 生成渠道分析报告（区域 / 经销商 / 产品）
// body: { scope, scopeValue, period?, year? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope: ReportScope | undefined = body?.scope;
    const scopeValue: string | undefined = body?.scopeValue;
    const year: string | undefined = body?.year;

    if (!scope || !['region', 'dealer', 'product'].includes(scope) || !scopeValue) {
      return NextResponse.json(
        { ok: false, error: '参数缺失：需要 scope(region|dealer|product) 和 scopeValue' },
        { status: 400 }
      );
    }

    const result = await generateReport({
      scope,
      scopeValue,
      period: body?.period ?? 'month',
      year,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
