// ============================================================
// 采购稳定性（详情页展示指标，不参与健康评分）
// 基于近 N 个月采购量的变异系数（CV）评估稳定性：
//   CV = 标准差 / 均值，CV 越小越稳定
// 返回 0-100 的稳定性指标。
// ============================================================

/**
 * @param monthly 按月顺序排列的采购量（升序：最早 → 最近）
 * @returns 0-100 稳定性指标
 */
export function calcPurchaseStability(monthly: number[]): number {
  if (monthly.length === 0) return 0;
  const mean = monthly.reduce((a, b) => a + b, 0) / monthly.length;
  if (mean === 0) return 0;

  const variance = monthly.reduce((a, b) => a + (b - mean) ** 2, 0) / monthly.length;
  const cv = Math.sqrt(variance) / mean;

  // CV = 0 → 100 分；CV ≥ 1 → 0 分（线性映射）
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}
