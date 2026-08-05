import { Card, CardTitle } from '@/components/ui/card';
import type { ProvinceStat } from '@/lib/queries';

/** 省份健康分布（堆叠条，服务端渲染） */
export function ProvinceHealth({ data }: { data: ProvinceStat[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <Card>
      <CardTitle>区域分析 · 省份健康状态</CardTitle>
      <div className="space-y-4">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">暂无数据</p>
        )}
        {data.map((d) => (
          <div key={d.province} className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-sm font-medium">{d.province}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 bg-[hsl(var(--primary))]"
                style={{ width: `${(d.total / max) * 100}%` }}
              />
            </div>
            <div className="flex w-44 shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-[hsl(var(--healthy))]" />
                {d.healthy}
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-[hsl(var(--warn))]" />
                {d.warn}
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-[hsl(var(--risk))]" />
                {d.risk}
              </span>
              <span className="ml-auto font-medium text-foreground">{d.total} 条</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        横向条 = 各省评分记录数（相对最大值）；右侧圆点计数 = 该省健康 / 预警 / 异常记录数。
      </div>
    </Card>
  );
}
