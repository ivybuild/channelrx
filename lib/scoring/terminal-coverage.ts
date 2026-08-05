// ============================================================
// 终端覆盖度（详情页展示指标，不参与健康评分）
// 评估该经销商在某产品上的医院终端渗透情况。
// ============================================================

/**
 * @param receivedHospitals 实际收到该产品的医院数量
 * @param provinceHospitalTotal 该经销商所在省份可用医院总数（覆盖基准）
 * @returns 0-100 终端覆盖度指标
 */
export function calcTerminalCoverage(
  receivedHospitals: number,
  provinceHospitalTotal: number
): number {
  if (provinceHospitalTotal <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((receivedHospitals / provinceHospitalTotal) * 100))
  );
}
