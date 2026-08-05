// ============================================================
// 健康评分核心（V1.1：评分仅基于流向健康度）
// ============================================================
import type { HealthStatus } from '../../types';

/**
 * 流向健康度评分函数（100 分制）
 * 输入：偏离度 dev = |出库比例 r - 1.0|
 *  - dev ≤ 0.2      → 80%-120% 区间，评分 90-100（健康）
 *  - 0.2 < dev ≤ 0.3 → 70%-80% / 120%-130% 区间，评分 60-89（预警）
 *  - dev > 0.3      → <70% / >130% 区间，评分 0-59（异常）
 */
export function calcFlowScore(dev: number): number {
  if (dev <= 0.2) {
    return 100 - dev * 50;
  } else if (dev <= 0.3) {
    return 90 - (dev - 0.2) * 300;
  }
  return Math.max(0, 60 - (dev - 0.3) * 200);
}

/** 由总分映射健康状态（三档） */
export function statusFromScore(total: number): HealthStatus {
  if (total >= 90) return 'healthy';
  if (total >= 60) return 'warn';
  return 'risk';
}

/** 计算出库比例 r = shipment / purchase；purchase 为 0 时记为 0 */
export function shipmentRatio(shipment: number, purchase: number): number {
  return purchase > 0 ? shipment / purchase : 0;
}

export interface FlowScoreResult {
  ratio: number;
  dev: number;
  total: number;
  status: HealthStatus;
}

/**
 * 计算单一经销商×产品×月的健康评分。
 * 注意：仅流向健康度参与 total，采购稳定性与终端覆盖度为详情页展示指标（见同级文件）。
 */
export function calculateHealthScore(shipment: number, purchase: number): FlowScoreResult {
  const ratio = shipmentRatio(shipment, purchase);
  const dev = Math.abs(ratio - 1);
  const total = Math.round(calcFlowScore(dev) * 10) / 10;
  return { ratio: Math.round(ratio * 1000) / 1000, dev, total, status: statusFromScore(total) };
}
