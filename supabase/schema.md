# ChannelRx 数据库 Schema 文档

> DataRecord ChannelRx · 医疗器械经销商渠道健康度分析平台
> 迁移文件：`supabase/migrations/0001_init.sql`

## 总览

| 分类 | 表 | 说明 |
|---|---|---|
| 维度 | `dealers` | 经销商主数据 |
| 维度 | `hospitals` | 医院主数据 |
| 维度 | `products` | 产品（超声刀 / 吻合器） |
| 原始 | `manufacturer_sales` | 厂家采购数据（厂家 → 经销商） |
| 原始 | `dealer_shipments` | 经销商出库数据（核心） |
| 原始 | `hospital_intakes` | 医院终端入院数据 |
| 原始 | `procurement_data` | 省级集采数据（配送商 ≠ 经销商） |
| 计算 | `health_scores` | 健康评分（经销商 × 产品 × 月） |
| 计算 | `risk_alerts` | 风险预警 |
| 计算 | `ai_reports` | AI 生成的渠道分析报告 |

## 维度表

### dealers（经销商）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| dealer_name | TEXT | 经销商名称 |
| province | TEXT | 省份 |
| city | TEXT | 城市 |
| created_at | TIMESTAMPTZ | 创建时间 |

唯一约束：`(dealer_name, province)`

### hospitals（医院）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| hospital_name | TEXT | 医院名称 |
| province | TEXT | 省份（NOT NULL） |
| city | TEXT | 城市 |
| hospital_level | TEXT | 等级：三甲 / 三乙 / 二甲 |

### products（产品）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | 主键 |
| code | TEXT UNIQUE | `ultrasound` / `stapler` |
| name | TEXT | 中文名：超声刀 / 吻合器 |

## 原始数据表（4 类来源）

### manufacturer_sales（厂家采购）
厂家 → 经销商 的采购记录。`UNIQUE(dealer_id, product_id, month)`。

### dealer_shipments（经销商出库，核心）
经销商 → 医院 的出库记录。`source_type` 取值 `invoice` / `delivery_note` / `inventory_report`，用于判断数据来源可信度。

### hospital_intakes（医院入院）
医院终端实际入院数据，用于判断产品是否真正进入终端。`dealer_id` 关联原始供货经销商。

### procurement_data（省级集采）
**注意：配送商 ≠ 经销商。** `delivery_company` 是集采配送企业，与 `dealers` 无外键关系，仅用于辅助确认终端覆盖与区域销售。

## 计算结果表

### health_scores（健康评分）
粒度：`经销商 × 产品 × 月`。

> **V1.1 评分模型变更**：`total` 仅基于**流向健康度**（出库比例偏离度）计算，`stability` / `coverage` 仅作为详情页展示指标，**不参与总分**。

| 字段 | 类型 | 说明 |
|---|---|---|
| total | NUMERIC | 0-100，流向健康度评分 |
| shipment_ratio | NUMERIC | 出库比例 = 出库量 / 采购量 |
| stability | NUMERIC | 展示用：采购稳定性指标 |
| coverage | NUMERIC | 展示用：终端覆盖度指标 |
| status | TEXT | `healthy` / `warn` / `risk` |

### risk_alerts（风险预警）
`risk_type`：`inventory`(库存积压) / `abnormal`(异常流向) / `decline`(销售下降)。
`severity`：`low` / `medium` / `high`。
`context`：JSONB，保存触发时的数据快照。

### ai_reports（AI 报告）
`scope`：`region` / `dealer` / `product`；`period`：`week` / `month`；`content` 为 Markdown。

## 索引策略

| 表 | 索引 | 用途 |
|---|---|---|
| manufacturer_sales | (dealer_id, product_id, month) | 评分计算主查询 |
| dealer_shipments | (dealer_id, product_id, month) | 出库聚合 |
| dealer_shipments | (hospital_id, month) | 终端覆盖分析 |
| health_scores | (month, status) | Dashboard 状态计数 |
| health_scores | (dealer_id, product_id) | 详情页趋势查询 |
| risk_alerts | (triggered_at DESC) | 预警列表排序 |
| risk_alerts | (dealer_id, risk_type) | 经销商风险聚合 |

## 评分计算逻辑（供 seed / compute 复用）

```
ratio = shipment / purchase           # 出库比例
dev   = |ratio - 1|
total = dev ≤ 0.2      → 100 - dev*50
        dev ≤ 0.3      → 90 - (dev-0.2)*300
        dev > 0.3      → max(0, 60 - (dev-0.3)*200)
status = total ≥ 90 ? healthy : total ≥ 60 ? warn : risk
```

实现见 `lib/scoring/health-score.ts`。
