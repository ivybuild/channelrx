// ============================================================
// 风险规则 3：销售下降风险
// 条件：采购量连续下降 且 出库量连续下降（≥3 个月）
// ============================================================
import type { RiskSeverity } from '../../types';
import type { RiskResult } from './inventory-risk';

/** 判断序列末尾是否连续 k 个月严格递减 */
function trailingDecline(seq: number[], k: number): boolean {
  if (seq.length < k) return false;
  for (let i = seq.length - k + 1; i < seq.length; i++) {
    if (!(seq[i] < seq[i - 1])) return false;
  }
  return true;
}

/**
 * @param purchases 按月采购量（最早 → 最近）
 * @param shipments 按月出库量（最早 → 最近）
 */
export function detectDecline(
  purchases: number[],
  shipments: number[]
): RiskResult | null {
  const k = 3;
  if (purchases.length < k || shipments.length < k) return null;

  const purchaseDown = trailingDecline(purchases, k);
  const shipmentDown = trailingDecline(shipments, k);
  if (!purchaseDown || !shipmentDown) return null;

  const dropPct =
    (purchases[purchases.length - k] - purchases[purchases.length - 1]) /
    purchases[purchases.length - k];

  const severity: RiskSeverity =
    dropPct > 0.4 ? 'high' : dropPct > 0.2 ? 'medium' : 'low';

  return {
    severity,
    context: {
      rule: '采购与出库连续 3 个月下降',
      months: k,
      purchase_drop_pct: Math.round(dropPct * 100) / 100,
    },
  };
}
