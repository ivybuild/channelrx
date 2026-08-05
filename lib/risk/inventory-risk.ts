// ============================================================
// 风险规则 1：库存积压风险
// 条件：连续 3 个月出库比例 < 70%（ratio < 0.7）
// ============================================================
import type { RiskSeverity } from '../../types';

export interface MonthlyRatio {
  month: string;
  ratio: number;
  shipment: number;
  purchase: number;
}

export interface RiskResult {
  severity: RiskSeverity;
  context: Record<string, unknown>;
}

/**
 * 检测末尾连续 ≥3 个月 ratio < 0.7 的情况。
 */
export function detectInventoryRisk(series: MonthlyRatio[]): RiskResult | null {
  let run = 0;
  let lastHit: MonthlyRatio | null = null;
  for (const m of series) {
    if (m.ratio < 0.7) {
      run += 1;
      lastHit = m;
    } else {
      run = 0;
    }
  }

  if (run < 3 || !lastHit) return null;

  const severity: RiskSeverity =
    lastHit.ratio < 0.5 ? 'high' : lastHit.ratio < 0.6 ? 'medium' : 'low';

  return {
    severity,
    context: {
      rule: '连续 3 个月出库比例 < 70%',
      consecutive_months: run,
      latest_ratio: lastHit.ratio,
      latest_month: lastHit.month,
    },
  };
}
