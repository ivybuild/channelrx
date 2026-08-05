// ============================================================
// 评分计算编排引擎（纯函数，不依赖数据库，可独立测试）
//
// 输入：4 类原始数据 + 维度数据
// 输出：health_scores + risk_alerts 待写入行
// 逻辑：聚合 dealer×product×month → lib/scoring 算分 → lib/risk 识别风险
// ============================================================
import type { HealthScore, HealthStatus, RiskAlert, RiskSeverity } from '../../types';
import {
  calculateHealthScore,
  calcPurchaseStability,
  calcTerminalCoverage,
} from '../scoring/index';
import {
  detectInventoryRisk,
  detectAbnormalFlow,
  detectDecline,
  type MonthlyRatio,
} from '../risk/index';

export interface ComputeDeps {
  sales: {
    dealer_id: string;
    product_id: string;
    date: string; // 'YYYY-MM-DD'
    purchase_quantity: number;
  }[];
  shipments: {
    dealer_id: string;
    product_id: string;
    date: string; // 'YYYY-MM-DD'
    hospital_id: string;
    shipment_quantity: number;
  }[];
  dealers: { id: string; province: string | null }[];
  hospitals: { id: string; province: string }[];
}

export interface ComputeResult {
  healthScores: HealthScore[];
  riskAlerts: RiskAlert[];
}

interface SaleKey {
  dealer_id: string;
  product_id: string;
  month: string;
}

const keyOf = (d: string, p: string, m: string) => `${d}|${p}|${m}`;
/** 日期 → 月份桶（'YYYY-MM-DD' → 'YYYY-MM'） */
const monthOf = (date: string) => date.slice(0, 7);

export function runComputeEngine(deps: ComputeDeps): ComputeResult {
  const months = [...new Set(deps.sales.map((s) => monthOf(s.date)))].sort();

  // 采购聚合：dealer×product×month（按日期归月）→ 采购量
  const purchaseMap = new Map<string, number>();
  for (const s of deps.sales) {
    const k = keyOf(s.dealer_id, s.product_id, monthOf(s.date));
    purchaseMap.set(k, (purchaseMap.get(k) ?? 0) + s.purchase_quantity);
  }

  // 出库聚合：dealer×product×month → 出库量；dealer×product → 覆盖医院集合
  const shipmentMap = new Map<string, number>();
  const hospitalSetMap = new Map<string, Set<string>>();
  for (const s of deps.shipments) {
    const k = keyOf(s.dealer_id, s.product_id, monthOf(s.date));
    shipmentMap.set(k, (shipmentMap.get(k) ?? 0) + s.shipment_quantity);
    const hk = keyOf(s.dealer_id, s.product_id, '');
    if (!hospitalSetMap.has(hk)) hospitalSetMap.set(hk, new Set());
    hospitalSetMap.get(hk)!.add(s.hospital_id);
  }

  // 省份医院数量（终端覆盖基准）
  const provinceHospitalTotal = new Map<string, number>();
  for (const h of deps.hospitals) {
    provinceHospitalTotal.set(h.province, (provinceHospitalTotal.get(h.province) ?? 0) + 1);
  }
  const dealerProvince = new Map(deps.dealers.map((d) => [d.id, d.province]));

  const healthScores: HealthScore[] = [];
  const riskAlerts: RiskAlert[] = [];

  // 遍历所有出现的 dealer×product 组合
  const combos = new Set<string>();
  for (const s of deps.sales) combos.add(`${s.dealer_id}|${s.product_id}`);
  for (const s of deps.shipments) combos.add(`${s.dealer_id}|${s.product_id}`);

  for (const combo of combos) {
    const [dealerId, productId] = combo.split('|');

    // 按月序列取值（缺月按 0 处理：无采购 → ratio 0 → 异常，需人工核查）
    const purchaseMonthly = months.map((m) => purchaseMap.get(keyOf(dealerId, productId, m)) ?? 0);
    const shipmentMonthly = months.map((m) => shipmentMap.get(keyOf(dealerId, productId, m)) ?? 0);
    const ratioMonthly: MonthlyRatio[] = months.map((m, i) => ({
      month: m,
      ratio: purchaseMonthly[i] > 0 ? shipmentMonthly[i] / purchaseMonthly[i] : 0,
      shipment: shipmentMonthly[i],
      purchase: purchaseMonthly[i],
    }));

    // 展示指标（不参与 total）
    const stability = calcPurchaseStability(purchaseMonthly);
    const province = dealerProvince.get(dealerId) ?? null;
    const provinceTotal = province ? (provinceHospitalTotal.get(province) ?? 0) : 0;
    const receivedHospitals = hospitalSetMap.get(keyOf(dealerId, productId, ''))?.size ?? 0;
    const coverage = calcTerminalCoverage(receivedHospitals, provinceTotal);

    // 逐月评分
    for (let i = 0; i < months.length; i++) {
      const { total, ratio, status } = calculateHealthScore(
        shipmentMonthly[i],
        purchaseMonthly[i]
      );
      healthScores.push({
        dealer_id: dealerId,
        product_id: productId,
        month: months[i],
        total,
        shipment_ratio: Math.round(ratio * 1000) / 1000,
        stability,
        coverage,
        status,
      });
    }

    // 风险识别（每类风险最多一条）
    const inv = detectInventoryRisk(ratioMonthly);
    if (inv) {
      riskAlerts.push({
        dealer_id: dealerId,
        product_id: productId,
        risk_type: 'inventory',
        severity: inv.severity as RiskSeverity,
        context: inv.context,
      });
    }
    const abn = detectAbnormalFlow(ratioMonthly);
    if (abn) {
      riskAlerts.push({
        dealer_id: dealerId,
        product_id: productId,
        risk_type: 'abnormal',
        severity: abn.severity as RiskSeverity,
        context: abn.context,
      });
    }
    const dec = detectDecline(purchaseMonthly, shipmentMonthly);
    if (dec) {
      riskAlerts.push({
        dealer_id: dealerId,
        product_id: productId,
        risk_type: 'decline',
        severity: dec.severity as RiskSeverity,
        context: dec.context,
      });
    }
  }

  return { healthScores, riskAlerts };
}

export function summarize(scores: HealthScore[]): Record<HealthStatus, number> {
  const s: Record<HealthStatus, number> = { healthy: 0, warn: 0, risk: 0 };
  for (const h of scores) s[h.status] += 1;
  return s;
}
