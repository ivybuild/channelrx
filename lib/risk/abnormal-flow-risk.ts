// ============================================================
// 风险规则 2：异常流向风险
// 条件：任意月份出库比例 > 130%（ratio > 1.3）
// 可能原因：窜货 / 数据遗漏 / 统计异常
// ============================================================
import type { RiskSeverity } from '../../types';
import type { MonthlyRatio, RiskResult } from './inventory-risk';

/**
 * 检测是否存在 ratio > 1.3 的月份，取最严重的那个月生成一条预警。
 */
export function detectAbnormalFlow(series: MonthlyRatio[]): RiskResult | null {
  const hits = series.filter((m) => m.ratio > 1.3);
  if (hits.length === 0) return null;

  const worst = hits.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  const severity: RiskSeverity =
    worst.ratio > 1.5 ? 'high' : worst.ratio > 1.4 ? 'medium' : 'low';

  return {
    severity,
    context: {
      rule: '出库比例 > 130%',
      abnormal_months: hits.map((h) => h.month),
      worst_ratio: worst.ratio,
      worst_month: worst.month,
    },
  };
}
