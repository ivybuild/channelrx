import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  healthy: 'bg-[hsl(var(--healthy)/0.12)] text-[hsl(var(--healthy))] border-[hsl(var(--healthy)/0.3)]',
  warn: 'bg-[hsl(var(--warn)/0.12)] text-[hsl(var(--warn))] border-[hsl(var(--warn)/0.3)]',
  risk: 'bg-[hsl(var(--risk)/0.12)] text-[hsl(var(--risk))] border-[hsl(var(--risk)/0.3)]',
};

const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-[hsl(var(--healthy))]',
  warn: 'bg-[hsl(var(--warn))]',
  risk: 'bg-[hsl(var(--risk))]',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLE[status] ?? 'border-border text-muted-foreground'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-muted-foreground')} />
      {status === 'healthy' ? '健康' : status === 'warn' ? '预警' : status === 'risk' ? '异常' : status}
    </span>
  );
}

export function ScoreBadge({ total }: { total: number }) {
  const status = total >= 90 ? 'healthy' : total >= 60 ? 'warn' : 'risk';
  const color =
    status === 'healthy'
      ? 'text-[hsl(var(--healthy))]'
      : status === 'warn'
        ? 'text-[hsl(var(--warn))]'
        : 'text-[hsl(var(--risk))]';
  return <span className={cn('text-lg font-bold tabular-nums', color)}>{total}</span>;
}

// ---------- 风险徽章 ----------

const RISK_TYPE_STYLE: Record<string, string> = {
  inventory: 'bg-[#EAF4EF] text-[#3E7D5E] border-[#BFDCCD]',
  abnormal: 'bg-[#FDF1E8] text-[#B06A3A] border-[#F0D5BC]',
  decline: 'bg-[#EDEFFA] text-[#4A5C9E] border-[#CBD3EC]',
};

const RISK_TYPE_LABEL: Record<string, string> = {
  inventory: '库存积压',
  abnormal: '异常流向',
  decline: '销售下降',
};

export function RiskTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        RISK_TYPE_STYLE[type] ?? 'border-border text-muted-foreground'
      )}
    >
      {RISK_TYPE_LABEL[type] ?? type}
    </span>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  high: 'bg-[hsl(var(--risk)/0.12)] text-[hsl(var(--risk))] border-[hsl(var(--risk)/0.3)]',
  medium: 'bg-[hsl(var(--warn)/0.12)] text-[hsl(var(--warn))] border-[hsl(var(--warn)/0.3)]',
  low: 'bg-[hsl(var(--healthy)/0.12)] text-[hsl(var(--healthy))] border-[hsl(var(--healthy)/0.3)]',
};

const SEVERITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        SEVERITY_STYLE[severity] ?? 'border-border text-muted-foreground'
      )}
    >
      {SEVERITY_LABEL[severity] ?? severity}
    </span>
  );
}
