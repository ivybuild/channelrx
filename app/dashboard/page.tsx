import { ProductTabs } from '@/components/dashboard/ProductTabs';
import { OverviewCards, type OverviewStat } from '@/components/dashboard/OverviewCards';
import { ProvinceHealth } from '@/components/dashboard/ProvinceHealth';
import { TimeSelect } from '@/components/dashboard/TimeSelect';
import {
  getDashboardData,
  getYears,
  getMonthsOfYear,
  type ProductFilter,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { product?: string; year?: string; month?: string };
}) {
  const product: ProductFilter =
    searchParams.product === 'ultrasound' || searchParams.product === 'stapler'
      ? searchParams.product
      : 'all';

  const years = await getYears();
  const year = searchParams.year && years.includes(searchParams.year) ? searchParams.year : (years[0] ?? '');
  const monthsOfYear = await getMonthsOfYear(year);
  const month =
    searchParams.month && monthsOfYear.includes(searchParams.month)
      ? searchParams.month
      : (monthsOfYear.at(-1) ?? '');

  const data = await getDashboardData(product, year, month);
  const { overview, byProvince } = data;

  const stats: OverviewStat[] = [
    {
      label: '经销商评分记录',
      value: overview.total,
      color: 'text-foreground',
      hint: `经销商 × 产品维度 · ${data.month ?? '-'}`,
    },
    {
      label: '健康',
      value: overview.healthy,
      color: 'text-[hsl(var(--healthy))]',
      hint: '评分 ≥ 90',
    },
    {
      label: '预警',
      value: overview.warn,
      color: 'text-[hsl(var(--warn))]',
      hint: '60-89 分',
    },
    {
      label: '异常',
      value: overview.risk,
      color: 'text-[hsl(var(--risk))]',
      hint: '< 60 分',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">渠道健康总览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全国经销商渠道健康状态 · 数据月份 {data.month ?? '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeSelect
            basePath="/dashboard"
            year={year}
            month={month}
            years={years}
            months={monthsOfYear}
            extraQuery={product !== 'all' ? `product=${product}` : ''}
          />
          <ProductTabs current={product} basePath="/dashboard" extraQuery={`year=${year}&month=${month}`} />
        </div>
      </div>

      <OverviewCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ProvinceHealth data={byProvince} />
        </div>
        <div className="lg:col-span-2">
          <div className="card-surface p-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">风险速览</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              当前 {overview.risk} 条异常记录分布在{' '}
              {byProvince.filter((p) => p.risk > 0).length} 个省份。
              <span className="mt-2 block text-xs">
                建议优先核查异常经销商：库存积压（出库比例 &lt;70%）、异常流向（&gt;130%）。
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
