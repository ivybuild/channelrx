# DataRecord ChannelRx

医疗器械经销商渠道健康度智能分析平台 —— 从"厂家 → 经销商 → 医院"流向数据中，自动计算渠道健康评分、识别运营风险、生成 AI 分析报告。

> 线上体验：https://datarecord.me

## 为什么做这个项目

医疗器械厂商的渠道（经销商网络）存在大量隐性风险：压货囤积、窜货、终端覆盖不足、销售下滑。传统靠人工看 Excel 报表，数据分散、判断靠经验。本系统把流向数据统一入库，用规则引擎 + AI 报告，把"渠道健康"变成可量化、可追踪、可预警的运营指标。

## 核心能力

| 模块 | 说明 |
|---|---|
| 渠道健康评分 | 基于流向健康度（出库/采购比例偏离度）的 100 分制评分，健康/预警/异常三档 |
| 风险自动识别 | 库存积压（连续出库比例 <70%）、异常流向（>130%）、销售下降（连续 3 月下滑） |
| 渠道总览 | 全国/产品维度总览卡片 + 省份健康分布 + 年度/月份切换 |
| 经销商分析 | 列表筛选（产品/省份/状态）、详情页评分卡 + 采购/出库/医院流向趋势图 |
| AI 分析报告 | 按区域/经销商/产品生成 Markdown 报告（规则模板；配置 DeepSeek Key 自动切换真模型） |
| 数据导入 | CSV 上传（厂家采购/经销商出库/医院入院/省级集采），自动建维度、覆盖/追加模式、导入即重算 |

## 技术栈

- **前端**：Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn 风格组件 + ECharts
- **后端**：Supabase (PostgreSQL) + PostgREST，服务端渲染 (Server Components)
- **AI**：DeepSeek API（仅做总结/解释/建议，计算全部由规则引擎完成）
- **部署**：Vercel + 自有域名 datarecord.me

## 架构分层

```
┌─────────────────────────────────────────────┐
│  展示层  Dashboard / 经销商 / 风险 / 报告     │
├─────────────────────────────────────────────┤
│  计算层  lib/scoring 评分引擎 + lib/risk 风险 │
├─────────────────────────────────────────────┤
│  数据层  Supabase（4 类原始表 + 结果表 + 维度）│
└─────────────────────────────────────────────┘
```

设计原则：**AI 不碰计算**——评分与风险全部由确定性规则引擎计算，AI 只负责把计算结果组织成可读的总结与建议，保证指标可解释、可复核。

## 本地运行

```bash
npm install
cp .env.example .env.local   # 填入 Supabase URL 与密钥
npm run dev                  # http://localhost:3000
```

评分重算（数据导入后触发）：

```bash
curl -X POST http://localhost:3000/api/compute
```

## 数据库（10 张表）

- 维度表：`dealers` / `hospitals` / `products`
- 原始数据：`manufacturer_sales` / `dealer_shipments` / `hospital_intakes` / `procurement_data`（日期粒度 YYYY-MM-DD）
- 计算结果：`health_scores` / `risk_alerts` / `ai_reports`

迁移脚本见 `supabase/migrations/`（在 Supabase SQL Editor 执行）。

## 路线图

- [x] M1 数据可用（建表 + 数据导入）
- [x] M2 评分可算（评分引擎 + 风险识别 + /api/compute）
- [x] M3 页面可看（总览 / 经销商 / 详情 / 风险中心 / 报告 / 导入）
- [x] M5 线上部署（Vercel + datarecord.me）
- [ ] 真 AI 报告（配置 DEEPSEEK_API_KEY 即自动切换）
- [ ] 登录鉴权 + RLS 行级安全（正式版）
