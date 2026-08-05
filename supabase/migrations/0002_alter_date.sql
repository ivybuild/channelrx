-- ============================================================
-- ChannelRx 迁移 0002：原始数据时间字段 月份(YYYY-MM) → 日期(YYYY-MM-DD)
-- 说明：
--   - 4 张原始表 month → date，支持精确到日
--   - health_scores.month 保持不变（评分仍按月汇总，业务指标按月看）
--   - 运行后需重新执行 seed（scripts/seed-mock.ts）导入日期数据
-- ============================================================

ALTER TABLE manufacturer_sales RENAME COLUMN month TO date;
COMMENT ON COLUMN manufacturer_sales.date IS '业务日期 YYYY-MM-DD（精确到日）';

ALTER TABLE dealer_shipments RENAME COLUMN month TO date;
COMMENT ON COLUMN dealer_shipments.date IS '业务日期 YYYY-MM-DD（精确到日）';

ALTER TABLE hospital_intakes RENAME COLUMN month TO date;
COMMENT ON COLUMN hospital_intakes.date IS '业务日期 YYYY-MM-DD（精确到日）';

ALTER TABLE procurement_data RENAME COLUMN month TO date;
COMMENT ON COLUMN procurement_data.date IS '业务日期 YYYY-MM-DD（精确到日）';
