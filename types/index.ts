// ============================================================
// ChannelRx 核心类型定义（与数据库表一一对应）
// ============================================================

/** 健康状态：健康 / 预警 / 异常 */
export type HealthStatus = 'healthy' | 'warn' | 'risk';

/** 风险类型 */
export type RiskType = 'inventory' | 'abnormal' | 'decline';

/** 风险严重级别 */
export type RiskSeverity = 'low' | 'medium' | 'high';

/** 出库数据来源类型 */
export type ShipmentSourceType = 'invoice' | 'delivery_note' | 'inventory_report';

/** 产品 code */
export type ProductCode = 'ultrasound' | 'stapler';

// ---------- 维度表 ----------

export interface Dealer {
  id: string;
  dealer_name: string;
  province: string | null;
  city: string | null;
  created_at?: string;
}

export interface Hospital {
  id: string;
  hospital_name: string;
  province: string;
  city: string | null;
  hospital_level: string | null; // 三甲 / 三乙 / 二甲
  created_at?: string;
}

export interface Product {
  id: string;
  code: ProductCode;
  name: string;
}

// ---------- 原始数据表（4 类来源） ----------

/** 1. 厂家采购数据（厂家 → 经销商） */
export interface ManufacturerSale {
  id?: string;
  dealer_id: string;
  product_id: string;
  date: string; // 'YYYY-MM-DD' 业务日期，精确到日
  purchase_quantity: number;
  created_at?: string;
}

/** 2. 经销商出库数据（核心） */
export interface DealerShipment {
  id?: string;
  dealer_id: string;
  hospital_id: string;
  product_id: string;
  date: string; // 'YYYY-MM-DD'
  shipment_quantity: number;
  source_type: ShipmentSourceType;
  created_at?: string;
}

/** 3. 医院终端入院数据 */
export interface HospitalIntake {
  id?: string;
  hospital_id: string;
  dealer_id: string;
  product_id: string;
  date: string; // 'YYYY-MM-DD'
  quantity: number;
  province: string | null;
  created_at?: string;
}

/** 4. 省级集采数据（配送商 ≠ 经销商） */
export interface ProcurementRecord {
  id?: string;
  hospital_id: string;
  product_id: string;
  delivery_company: string;
  province: string;
  date: string; // 'YYYY-MM-DD'
  quantity: number;
  created_at?: string;
}

// ---------- 计算结果表 ----------

/** 健康评分（经销商 × 产品 × 月 粒度） */
export interface HealthScore {
  id?: string;
  dealer_id: string;
  product_id: string;
  month: string;
  total: number; // 0-100，仅基于流向健康度
  shipment_ratio: number; // 出库比例 = shipment / purchase
  stability: number; // 展示用：采购稳定性指标（不参与 total）
  coverage: number; // 展示用：终端覆盖度指标（不参与 total）
  status: HealthStatus;
  calculated_at?: string;
}

/** 风险预警 */
export interface RiskAlert {
  id?: string;
  dealer_id: string;
  product_id: string;
  risk_type: RiskType;
  severity: RiskSeverity;
  context: Record<string, unknown> | null; // 触发时数据快照
  triggered_at?: string;
  resolved_at?: string | null;
}

/** AI 报告 */
export interface AiReport {
  id?: string;
  scope: 'region' | 'dealer' | 'product';
  scope_value: string;
  period: 'week' | 'month';
  period_value: string;
  content: string;
  model: string;
  token_usage: Record<string, unknown> | null;
  created_at?: string;
}

/** 经销商-终端医院对应关系（带时间维度，支持医院更换经销商） */
export interface DealerHospitalMapping {
  id?: string;
  dealer_id: string;
  hospital_id: string;
  effective_from: string;  // 'YYYY-MM-DD'
  effective_to?: string | null;  // null = 至今
}
