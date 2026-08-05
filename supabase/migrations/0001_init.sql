-- ============================================================
-- ChannelRx 数据库初始化迁移
-- DataRecord ChannelRx · 医疗器械经销商渠道健康度分析平台
-- 共 10 张表：3 维度 + 4 原始数据 + 3 计算结果
-- ============================================================

-- ---------- 基础维度表 ----------

-- 经销商
CREATE TABLE IF NOT EXISTS dealers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_name  TEXT NOT NULL,
  province     TEXT,
  city         TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dealer_name, province)
);

-- 医院
CREATE TABLE IF NOT EXISTS hospitals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name   TEXT NOT NULL,
  province        TEXT NOT NULL,
  city            TEXT,
  hospital_level  TEXT,  -- 三甲 / 三乙 / 二甲 ...
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (hospital_name, province)
);

-- 产品
CREATE TABLE IF NOT EXISTS products (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  TEXT UNIQUE NOT NULL,  -- ultrasound | stapler
  name  TEXT NOT NULL
);

-- ---------- 原始数据表（4 类来源） ----------

-- 1. 厂家采购数据（厂家 → 经销商）
CREATE TABLE IF NOT EXISTS manufacturer_sales (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id          UUID REFERENCES dealers(id) ON DELETE CASCADE,
  product_id         UUID REFERENCES products(id) ON DELETE CASCADE,
  month              TEXT NOT NULL,  -- 'YYYY-MM'
  purchase_quantity  NUMERIC NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dealer_id, product_id, month)
);

-- 2. 经销商出库数据（核心）
CREATE TABLE IF NOT EXISTS dealer_shipments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id          UUID REFERENCES dealers(id) ON DELETE CASCADE,
  hospital_id        UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  product_id         UUID REFERENCES products(id) ON DELETE CASCADE,
  month              TEXT NOT NULL,
  shipment_quantity  NUMERIC NOT NULL,
  source_type        TEXT NOT NULL CHECK (source_type IN ('invoice','delivery_note','inventory_report')),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- 3. 医院终端入院数据
CREATE TABLE IF NOT EXISTS hospital_intakes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  dealer_id   UUID REFERENCES dealers(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,
  quantity    NUMERIC NOT NULL,
  province    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. 省级集采数据（配送商 ≠ 经销商）
CREATE TABLE IF NOT EXISTS procurement_data (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE CASCADE,
  delivery_company TEXT NOT NULL,
  province         TEXT NOT NULL,
  month            TEXT NOT NULL,
  quantity         NUMERIC NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ---------- 计算结果表（评分 + 风险 + AI 报告） ----------

-- 健康评分（经销商 × 产品 × 月 粒度）
-- V1.1: total 仅基于流向健康度；stability / coverage 为详情页展示指标，不参与 total
CREATE TABLE IF NOT EXISTS health_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,
  total           NUMERIC,         -- 0-100，仅基于流向健康度
  shipment_ratio  NUMERIC,         -- 出库比例 = shipment / purchase
  stability       NUMERIC,         -- 展示用：采购稳定性指标（不参与 total）
  coverage        NUMERIC,         -- 展示用：终端覆盖度指标（不参与 total）
  status          TEXT CHECK (status IN ('healthy','warn','risk')),
  calculated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (dealer_id, product_id, month)
);

-- 风险预警
CREATE TABLE IF NOT EXISTS risk_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id    UUID REFERENCES dealers(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
  risk_type    TEXT CHECK (risk_type IN ('inventory','abnormal','decline')),
  severity     TEXT CHECK (severity IN ('low','medium','high')),
  context      JSONB,             -- 触发时的数据快照
  triggered_at TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- AI 报告
CREATE TABLE IF NOT EXISTS ai_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        TEXT,   -- region | dealer | product
  scope_value  TEXT,   -- '江苏' / dealer_id / 'ultrasound'
  period       TEXT,   -- week | month
  period_value TEXT,   -- '2026-W30' / '2026-07'
  content      TEXT,   -- Markdown 报告内容
  model        TEXT,   -- 'deepseek-chat'
  token_usage  JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ---------- 索引策略 ----------
-- 评分计算主查询
CREATE INDEX IF NOT EXISTS idx_mfr_sales_dpm      ON manufacturer_sales (dealer_id, product_id, month);
-- 出库聚合
CREATE INDEX IF NOT EXISTS idx_shipments_dpm      ON dealer_shipments   (dealer_id, product_id, month);
-- 终端覆盖分析
CREATE INDEX IF NOT EXISTS idx_shipments_hm       ON dealer_shipments   (hospital_id, month);
-- Dashboard 状态计数
CREATE INDEX IF NOT EXISTS idx_health_month_status ON health_scores     (month, status);
-- 详情页趋势查询
CREATE INDEX IF NOT EXISTS idx_health_dp          ON health_scores     (dealer_id, product_id);
-- 预警列表排序
CREATE INDEX IF NOT EXISTS idx_risk_triggered     ON risk_alerts       (triggered_at DESC);
-- 经销商风险聚合
CREATE INDEX IF NOT EXISTS idx_risk_dealer_type   ON risk_alerts       (dealer_id, risk_type);

-- 启用 RLS（MVP 演示可保持关闭；如需多租户再开启并配置策略）
-- ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
