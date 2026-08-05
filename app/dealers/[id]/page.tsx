import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { StatusBadge, ScoreBadge } from '@/components/ui/badge';
import { TrendChart } from '@/components/dealer/TrendChart';
import { getDealerDetail, getLatestMonth } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DealerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await getDealerDetail(params.id);
  if (!detail) notFound();

  const latestMonth = await getLatestMonth();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dealers" className="text-sm text-muted-foreground hover:underline">
          ← 经销商列表
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{detail.dealer_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.province ?? '—'}
          {detail.city ? ` · ${detail.city}` : ''} · 数据月份 {latestMonth ?? '—'}
        </p>
      </div>

      {detail.products.map((p) => (
        <Card key={p.product_code}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="mb-0 text-base font-semibold text-foreground">
              {p.product_name}
            </CardTitle>
            <div className="flex items-center gap-4">
              <ScoreBadge total={p.total} />
              <StatusBadge status={p.status} />
            </div>
          </div>

          {/* 展示指标（不参与评分） */}
          <div className="mb-5 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">出库比例</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {(p.shipment_ratio * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">采购稳定性（展示）</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{p.stability}</div>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <div className="text-xs text-muted-foreground">终端覆盖度（展示）</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{p.coverage}%</div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              月度趋势 · 采购 / 出库 / 医院流向
            </div>
            <TrendChart
              months={p.trend.months}
              purchase={p.trend.purchase}
              shipment={p.trend.shipment}
              intake={p.trend.intake}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
