import { ProductTabs } from '@/components/dashboard/ProductTabs';
import { TimeSelect } from '@/components/dashboard/TimeSelect';
import { DealerTable } from '@/components/dealer/DealerTable';
import { FilterSelect } from '@/components/dealer/FilterSelect';
import { FilterSearch } from '@/components/dealer/FilterSearch';
import {
  getDealersList,
  getProvinces,
  getYears,
  getMonthsOfYear,
  type ProductFilter,
  type RiskFilter,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DealersPage({
  searchParams,
}: {
  searchParams: { product?: string; province?: string; risk?: string; year?: string; month?: string; q?: string };
}) {
  const product: ProductFilter =
    searchParams.product === 'ultrasound' || searchParams.product === 'stapler'
      ? searchParams.product
      : 'all';
  const q = searchParams.q ?? '';
  const province = searchParams.province ?? 'all';
  const risk: RiskFilter =
    searchParams.risk === 'healthy' || searchParams.risk === 'warn' || searchParams.risk === 'risk'
      ? searchParams.risk
      : 'all';

  const years = await getYears();
  const year = searchParams.year && years.includes(searchParams.year) ? searchParams.year : (years[0] ?? '');
  const monthsOfYear = await getMonthsOfYear(year);
  const month =
    searchParams.month && monthsOfYear.includes(searchParams.month)
      ? searchParams.month
      : (monthsOfYear.at(-1) ?? '');

  const [rows, provinces] = await Promise.all([
    getDealersList({ product, province, risk, q }, year, month),
    getProvinces(),
  ]);

  const searchQuery = [
    q ? `q=${encodeURIComponent(q)}` : '',
    province !== 'all' ? `province=${province}` : '',
    risk !== 'all' ? `risk=${risk}` : '',
  ].filter(Boolean).join('&');

  const extra = [
    province !== 'all' ? `province=${province}` : '',
    risk !== 'all' ? `risk=${risk}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const preserve = (query: string) => {
    const parts = [`year=${year}`, `month=${month}`];
    if (product !== 'all') parts.push(`product=${product}`);
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    if (query) parts.push(query);
    return `?${parts.join('&')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">经销商列表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            按产品 / 省份 / 风险等级筛选经销商渠道健康状态 · 数据月份 {month || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeSelect
            basePath="/dealers"
            year={year}
            month={month}
            years={years}
            months={monthsOfYear}
            extraQuery={searchQuery}
          />
          <ProductTabs current={product} basePath="/dealers" extraQuery={`year=${year}&month=${month}&${searchQuery}`} />
        </div>
      </div>

      {/* 搜索 + 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSearch defaultValue={q} existingKeys={`year=${year}&month=${month}&${product !== 'all' ? 'product=' + product + '&' : ''}`} />
        <form className="flex flex-wrap items-center gap-3" method="get">
          <input type="hidden" name="product" value={product} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="q" value={q} />
          <FilterSelect
            name="province"
            defaultValue={province}
            options={[
              { value: 'all', label: '全部省份' },
              ...provinces.map((p) => ({ value: p, label: p })),
            ]}
          />
          <FilterSelect
            name="risk"
            defaultValue={risk}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'healthy', label: '健康' },
              { value: 'warn', label: '预警' },
              { value: 'risk', label: '异常' },
            ]}
          />
          <noscript>
            <button type="submit" className="h-9 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm text-[hsl(var(--primary-foreground))]">
              筛选
            </button>
          </noscript>
        </form>
        <span className="text-xs text-muted-foreground">
          {risk !== 'all' || province !== 'all' ? (
            <a href={preserve('')} className="hover:underline">
              清除筛选
            </a>
          ) : null}
        </span>
      </div>

      <DealerTable rows={rows} />
    </div>
  );
}
