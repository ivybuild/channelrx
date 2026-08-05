'use client';

import { useRouter } from 'next/navigation';

/** 年度 / 月份选择器：URL 驱动（?year=2026&month=2026-06），默认当年最新月份 */
export function TimeSelect({
  basePath,
  year,
  month,
  years,
  months,
  extraQuery = '',
}: {
  basePath: string;
  year: string;
  month: string;
  years: string[];
  months: string[];
  extraQuery?: string;
}) {
  const router = useRouter();

  function rebuild(nextYear: string, nextMonth: string) {
    const parts: string[] = [`year=${nextYear}`];
    if (nextMonth) parts.push(`month=${nextMonth}`);
    if (extraQuery) parts.push(extraQuery);
    router.replace(`${basePath}?${parts.join('&')}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={(e) => rebuild(e.target.value, '')}
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
        aria-label="选择年度"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y} 年
          </option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => rebuild(year, e.target.value)}
        className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
        aria-label="选择月份"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {m.replace(`${year}-`, '')} 月
          </option>
        ))}
      </select>
    </div>
  );
}
