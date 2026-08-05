import { ProductTabs } from '@/components/dashboard/ProductTabs';
import { TimeSelect } from '@/components/dashboard/TimeSelect';
import { FilterSelect } from '@/components/dealer/FilterSelect';
import { RiskTable } from '@/components/risk/RiskTable';
import { Card } from '@/components/ui/card';
import {
  getRiskRows,
  getRiskSummary,
  getYears,
  getMonthsOfYear,
  type ProductFilter,
  type RiskLevelFilter,
  type RiskTypeFilter,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function RisksPage({
  searchParams,
}: {
  searchParams: { product?: string; type?: string; level?: string; year?: string; month?: string };
}) {
  const product: ProductFilter =
    searchParams.product === 'ultrasound' || searchParams.product === 'stapler'
      ? searchParams.product
      : 'all';
  const riskType: RiskTypeFilter =
    searchParams.type === 'inventory' || searchParams.type === 'abnormal' || searchParams.type === 'decline'
      ? searchParams.type
      : 'all';
  const level: RiskLevelFilter =
    searchParams.level === 'low' || searchParams.level === 'medium' || searchParams.level === 'high'
      ? searchParams.level
      : 'all';

  const years = await getYears();
  const year = searchParams.year && years.includes(searchParams.year) ? searchParams.year : (years[0] ?? '');
  const monthsOfYear = await getMonthsOfYear(year);
  const month =
    searchParams.month && monthsOfYear.includes(searchParams.month)
      ? searchParams.month
      : (monthsOfYear.at(-1) ?? '');

  const [rows, summary] = await Promise.all([
    getRiskRows({ product, riskType, level, year }),
    getRiskSummary(),
  ]);

  const extra = [
    riskType !== 'all' ? `type=${riskType}` : '',
    level !== 'all' ? `level=${level}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const typeLabel: Record<string, string> = {
    inventory: '库存积压',
    abnormal: '异常流向',
    decline: '销售下降',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">风险预警中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            自动识别库存积压 / 异常流向 / 销售下降风险 · 数据月份 {month || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeSelect
            basePath="/risks"
            year={year}
            month={month}
            years={years}
            months={monthsOfYear}
            extraQuery={extra}
          />
          <ProductTabs current={product} basePath="/risks" extraQuery={`year=${year}&month=${month}&${extra}`} />
        </div>
      </div>

      {/* 汇总卡 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">风险总数</span>
          <span className="text-3xl font-bold tabular-nums">{summary.total}</span>
          <span className="text-xs text-muted-foreground/80">待处置 {summary.open}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">库存积压</span>
          <span className="text-3xl font-bold tabular-nums text-[hsl(var(--healthy))]">
            {summary.byType.inventory}
          </span>
          <span className="text-xs text-muted-foreground/80">出库比例连续 &lt;70%</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">异常流向</span>
          <span className="text-3xl font-bold tabular-nums text-[#B06A3A]">
            {summary.byType.abnormal}
          </span>
          <span className="text-xs text-muted-foreground/80">出库比例 &gt;130%</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">销售下降</span>
          <span className="text-3xl font-bold tabular-nums text-[#4A5C9E]">
            {summary.byType.decline}
          </span>
          <span className="text-xs text-muted-foreground/80">采购出库连续下降</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">高风险</span>
          <span className="text-3xl font-bold tabular-nums text-[hsl(var(--risk))]">
            {summary.bySeverity.high}
          </span>
          <span className="text-xs text-muted-foreground/80">中 {summary.bySeverity.medium} · 低 {summary.bySeverity.low}</span>
        </Card>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <input type="hidden" name="product" value={product} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <FilterSelect
            name="type"
            defaultValue={riskType}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'inventory', label: '库存积压' },
              { value: 'abnormal', label: '异常流向' },
              { value: 'decline', label: '销售下降' },
            ]}
          />
          <FilterSelect
            name="level"
            defaultValue={level}
            options={[
              { value: 'all', label: '全部级别' },
              { value: 'high', label: '高' },
              { value: 'medium', label: '中' },
              { value: 'low', label: '低' },
            ]}
          />
        </form>
        {(riskType !== 'all' || level !== 'all') && (
          <a
            href="/risks"
            className="text-xs text-muted-foreground hover:underline"
          >
            清除筛选
          </a>
        )}
        <span className="text-xs text-muted-foreground">
          {riskType !== 'all' ? `类型：${typeLabel[riskType]} · ` : ''}
          {level !== 'all' ? `级别：${level} · ` : ''}
          当前展示 {rows.length} 条
        </span>
      </div>

      <RiskTable rows={rows} />
    </div>
  );
}
