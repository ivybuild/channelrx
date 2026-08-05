'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface ReportFormOptions {
  provinces: string[];
  dealers: { id: string; dealer_name: string; province: string | null }[];
  products: { code: string; name: string }[];
  years: string[];
}

export function ReportForm({ provinces, dealers, products, years }: ReportFormOptions) {
  const [scope, setScope] = useState<'region' | 'dealer' | 'product'>('region');
  const [scopeValue, setScopeValue] = useState(provinces[0] ?? '');
  const [year, setYear] = useState(years[0] ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const options =
    scope === 'region'
      ? provinces.map((v) => ({ value: v, label: v }))
      : scope === 'dealer'
        ? dealers.map((d) => ({ value: d.id, label: `${d.dealer_name}（${d.province ?? '—'}）` }))
        : products.map((p) => ({ value: p.code, label: p.name }));

  function switchScope(next: 'region' | 'dealer' | 'product') {
    setScope(next);
    setScopeValue(
      next === 'region' ? (provinces[0] ?? '') : next === 'dealer' ? (dealers[0]?.id ?? '') : (products[0]?.code ?? '')
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scopeValue || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, scopeValue, period: 'month', year }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '生成失败');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">报告范围</label>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(
              [
                { v: 'region', label: '区域' },
                { v: 'dealer', label: '经销商' },
                { v: 'product', label: '产品' },
              ] as const
            ).map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => switchScope(t.v)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm transition-colors',
                  scope === t.v
                    ? 'bg-[hsl(var(--primary))] font-medium text-[hsl(var(--primary-foreground))]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">数据年度</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">选择范围值</label>
          <select
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
            className="h-9 min-w-[180px] rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
          >
            {options.length === 0 && <option value="">暂无数据</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || options.length === 0}
          className="h-9 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '生成中...' : '生成分析报告'}
        </button>
      </div>
      {error && <p className="text-xs text-[hsl(var(--risk))]">{error}</p>}
      {loading && (
        <p className="text-xs text-muted-foreground">
          正在汇总渠道数据并生成报告（模板模式，无需调用外部模型）...
        </p>
      )}
    </form>
  );
}
