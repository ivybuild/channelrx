-- ============================================================
-- ChannelRx 迁移 0003：经销商-终端医院对应关系表（带时间维度）
-- 业务场景：医院的对应经销商可能更换（如集采切换），需要按时间记录
-- ============================================================

CREATE TABLE IF NOT EXISTS dealer_hospital_mapping (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  effective_from   DATE NOT NULL,          -- 生效起始日期
  effective_to     DATE,                   -- 失效日期（NULL = 至今）
  created_at       TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE dealer_hospital_mapping IS
  '经销商-终端医院对应关系（带时间维度）。effective_to 为 NULL 表示至今仍在合作。';
COMMENT ON COLUMN dealer_hospital_mapping.effective_from IS '对应关系生效起始日期';
COMMENT ON COLUMN dealer_hospital_mapping.effective_to IS '对应关系失效日期，NULL 表示至今有效';
