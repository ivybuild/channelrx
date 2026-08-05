import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { RiskTypeBadge, SeverityBadge } from '@/components/ui/badge';
import type { RiskRow } from '@/lib/queries';

/** 根据风险类型展示 context 中的关键数据快照 */
function contextSummary(r: RiskRow) {
  const c = r.context;
  if (!c) return '—';
  switch (r.risk_type) {
    case 'inventory':
      return `连续 ${c.consecutive_months} 个月 <70%，最新出库比例 ${(
        Number(c.latest_ratio) * 100
      ).toFixed(0)}%（${c.latest_month}）`;
    case 'abnormal':
      return `出库比例 ${(Number(c.worst_ratio) * 100).toFixed(0)}%（${c.worst_month}），异常月份：${
        Array.isArray(c.abnormal_months) ? c.abnormal_months.join('、') : c.worst_month
      }`;
    case 'decline':
      return `采购与出库连续 ${c.months} 个月下降，采购累计降幅 ${(
        Number(c.purchase_drop_pct) * 100
      ).toFixed(0)}%`;
    default:
      return JSON.stringify(c);
  }
}

export function RiskTable({ rows }: { rows: RiskRow[] }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-muted-foreground">风险明细</h3>
        <span className="text-xs text-muted-foreground">
          共 {rows.length} 条 · 按严重程度排序
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">经销商</th>
              <th className="px-4 py-3 font-medium">产品</th>
              <th className="px-4 py-3 font-medium">风险类型</th>
              <th className="px-4 py-3 font-medium">级别</th>
              <th className="px-4 py-3 font-medium">触发摘要</th>
              <th className="px-4 py-3 font-medium">触发时间</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                  暂无风险记录
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50"
              >
                <td className="px-5 py-3 font-medium text-foreground">{r.dealer_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.product_name}</td>
                <td className="px-4 py-3">
                  <RiskTypeBadge type={r.risk_type} />
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={r.severity} />
                </td>
                <td className="max-w-[260px] px-4 py-3 text-xs text-muted-foreground">
                  {contextSummary(r)}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                  {new Date(r.triggered_at).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  {r.resolved_at ? (
                    <span className="text-xs text-muted-foreground">已处置</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--risk))]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--risk))]" />
                      待处置
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/dealers/${r.dealer_id}`}
                    className="text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                  >
                    查看经销商 →
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
