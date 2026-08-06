import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/card';
import { StatusBadge, ScoreBadge } from '@/components/ui/badge';
import { TrendChart } from '@/components/dealer/TrendChart';
import { getDealerDetail, getLatestMonth, getDealerHospitalMapping } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DealerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, mapping] = await Promise.all([
    getDealerDetail(params.id),
    getDealerHospitalMapping(params.id),
  ]);
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

      {/* 经销商-终端医院对应关系 */}
      {mapping.length > 0 && (
        <Card>
          <CardTitle>终端医院对应关系（{mapping.length} 家）</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">医院名称</th>
                  <th className="px-3 py-2 font-medium">省份</th>
                  <th className="px-3 py-2 font-medium">生效日期</th>
                  <th className="px-3 py-2 font-medium">失效日期</th>
                </tr>
              </thead>
              <tbody>
                {mapping.map((m, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">{m.hospital_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.province ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{m.effective_from}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {m.effective_to ?? '至今'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            带时间维度：医院的对应经销商可能更换（如集采切换）。可通过「数据导入 → 对应关系」维护。
          </p>
        </Card>
      )}
    </div>
  );
}
