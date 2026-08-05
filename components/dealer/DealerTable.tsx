import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { StatusBadge, ScoreBadge } from '@/components/ui/badge';
import type { ScoreRow } from '@/lib/queries';

export function DealerTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <CardTitle className="mb-0">经销商评分列表</CardTitle>
        <span className="text-xs text-muted-foreground">共 {rows.length} 条（最新月份）</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">经销商</th>
              <th className="px-4 py-3 font-medium">产品</th>
              <th className="px-4 py-3 font-medium">省份</th>
              <th className="px-4 py-3 font-medium">健康评分</th>
              <th className="px-4 py-3 font-medium">出库比例</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                  暂无数据，请先导入数据并触发评分计算
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={`${r.dealer_id}-${r.product_code}`}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50"
              >
                <td className="px-5 py-3 font-medium text-foreground">{r.dealer_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.product_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.province}</td>
                <td className="px-4 py-3">
                  <ScoreBadge total={r.total} />
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {(r.shipment_ratio * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/dealers/${r.dealer_id}`}
                    className="text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                  >
                    详情 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
