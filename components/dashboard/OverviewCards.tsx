import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface OverviewStat {
  label: string;
  value: number;
  color: string;
  hint: string;
}

export function OverviewCards({ stats }: { stats: OverviewStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{s.label}</span>
          <span className={cn('text-3xl font-bold tabular-nums', s.color)}>{s.value}</span>
          <span className="text-xs text-muted-foreground/80">{s.hint}</span>
        </Card>
      ))}
    </div>
  );
}
