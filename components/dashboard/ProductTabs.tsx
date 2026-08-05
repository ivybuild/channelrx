import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ProductFilter } from '@/lib/queries';

const TABS: { value: ProductFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'ultrasound', label: '超声刀' },
  { value: 'stapler', label: '吻合器' },
];

/** 产品筛选 Tab（服务端渲染，URL 驱动：?product=xxx） */
export function ProductTabs({
  current,
  basePath,
  extraQuery = '',
}: {
  current: ProductFilter;
  basePath: string;
  extraQuery?: string;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1">
      {TABS.map((t) => {
        const active = current === t.value;
        const query = t.value === 'all' ? '' : `product=${t.value}`;
        const sep = query && extraQuery ? '&' : '';
        const href = `${basePath}${query || extraQuery ? '?' : ''}${query}${sep}${extraQuery}`;
        return (
          <Link
            key={t.value}
            href={href}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm transition-colors',
              active
                ? 'bg-[hsl(var(--primary))] font-medium text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
