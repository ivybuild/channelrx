// ============================================================
// 服务端查询层：页面直接调用的数据访问函数（Server Components 使用）
// 只读查询，不写库；写库统一走 lib/compute 与 import 流程。
// ============================================================
import { getSupabaseServer } from './supabase/server';

export type ProductFilter = 'all' | 'ultrasound' | 'stapler';
export type RiskFilter = 'all' | 'healthy' | 'warn' | 'risk';

export interface ScoreRow {
  dealer_id: string;
  dealer_name: string;
  province: string | null;
  product_code: string;
  product_name: string;
  total: number;
  status: 'healthy' | 'warn' | 'risk';
  shipment_ratio: number;
  stability: number;
  coverage: number;
  month: string;
}

/** 最新计算月份（health_scores 中最大的 month），可选限定年度 */
export async function getLatestMonth(year?: string): Promise<string | null> {
  let query = getSupabaseServer()
    .from('health_scores')
    .select('month')
    .order('month', { ascending: false })
    .limit(1);
  if (year) query = query.like('month', `${year}-%`);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`查询最新月份失败: ${error.message}`);
  return data?.month ?? null;
}

/** 解析目标月份：month 优先；否则取该年度内最新月份；否则取全量最新月份 */
async function resolveTargetMonth(year?: string, month?: string): Promise<string | null> {
  if (month) return month;
  let query = getSupabaseServer()
    .from('health_scores')
    .select('month')
    .order('month', { ascending: false })
    .limit(1);
  if (year) query = query.like('month', `${year}-%`);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`解析目标月份失败: ${error.message}`);
  return data?.month ?? null;
}

/** 数据中存在哪些年份（降序，如 ['2026','2025']） */
export async function getYears(): Promise<string[]> {
  const { data, error } = await getSupabaseServer().from('health_scores').select('month');
  if (error) throw new Error(`查询年份失败: ${error.message}`);
  const years = new Set((data ?? []).map((r: any) => String(r.month).slice(0, 4)));
  return [...years].sort().reverse();
}

/** 某年度内已有的数据月份（升序，如 ['2025-01',...]） */
export async function getMonthsOfYear(year: string): Promise<string[]> {
  const { data, error } = await getSupabaseServer()
    .from('health_scores')
    .select('month')
    .like('month', `${year}-%`);
  if (error) throw new Error(`查询月份失败: ${error.message}`);
  return [...new Set((data ?? []).map((r: any) => r.month))].sort();
}

/** 拉取目标月份的全部评分（含经销商/产品信息），可按产品 / 年度 / 月份过滤 */
export async function fetchLatestScores(
  product: ProductFilter,
  year?: string,
  month?: string
): Promise<ScoreRow[]> {
  const target = await resolveTargetMonth(year, month);
  if (!target) return [];

  let query = getSupabaseServer()
    .from('health_scores')
    .select(
      'total, status, shipment_ratio, stability, coverage, month, dealer_id, product_id, dealer:dealers(dealer_name, province), product:products(code, name)'
    )
    .eq('month', target);
  if (product !== 'all') {
    query = query.eq('product.code', product);
  }

  const { data, error } = await query;
  if (error) throw new Error(`查询评分失败: ${error.message}`);

  return (data ?? []).map((r: any) => ({
    dealer_id: r.dealer_id,
    dealer_name: r.dealer?.dealer_name ?? '未知',
    province: r.dealer?.province ?? null,
    product_code: r.product?.code ?? '',
    product_name: r.product?.name ?? '',
    total: Number(r.total ?? 0),
    status: r.status,
    shipment_ratio: Number(r.shipment_ratio ?? 0),
    stability: Number(r.stability ?? 0),
    coverage: Number(r.coverage ?? 0),
    month: r.month,
  }));
}

// ---------- Dashboard ----------

export interface ProvinceStat {
  province: string;
  total: number;
  healthy: number;
  warn: number;
  risk: number;
}

export interface DashboardData {
  month: string | null;
  overview: { total: number; healthy: number; warn: number; risk: number };
  byProvince: ProvinceStat[];
}

export async function getDashboardData(
  product: ProductFilter,
  year?: string,
  month?: string
): Promise<DashboardData> {
  const rows = await fetchLatestScores(product, year, month);

  const overview = { total: rows.length, healthy: 0, warn: 0, risk: 0 };
  const provinceMap = new Map<string, ProvinceStat>();

  for (const r of rows) {
    overview[r.status] += 1;
    const p = r.province ?? '未知省份';
    let stat = provinceMap.get(p);
    if (!stat) {
      stat = { province: p, total: 0, healthy: 0, warn: 0, risk: 0 };
      provinceMap.set(p, stat);
    }
    stat.total += 1;
    stat[r.status] += 1;
  }

  const byProvince = [...provinceMap.values()].sort((a, b) => b.total - a.total);
  return { month: rows[0]?.month ?? null, overview, byProvince };
}

// ---------- 经销商列表 ----------

export interface DealerListFilters {
  product: ProductFilter;
  province: string;
  risk: RiskFilter;
}

export async function getDealersList(
  f: DealerListFilters,
  year?: string,
  month?: string
): Promise<ScoreRow[]> {
  let rows = await fetchLatestScores(f.product, year, month);
  if (f.province && f.province !== 'all') {
    rows = rows.filter((r) => r.province === f.province);
  }
  if (f.risk && f.risk !== 'all') {
    rows = rows.filter((r) => r.status === f.risk);
  }
  rows.sort((a, b) => a.total - b.total); // 低分优先，方便看到风险
  return rows;
}

export async function getProvinces(): Promise<string[]> {
  const { data, error } = await getSupabaseServer()
    .from('dealers')
    .select('province')
    .not('province', 'is', null);
  if (error) throw new Error(`查询省份失败: ${error.message}`);
  return [...new Set((data ?? []).map((d: any) => d.province))].sort();
}

// ---------- 经销商详情 ----------

export interface DealerDetail {
  id: string;
  dealer_name: string;
  province: string | null;
  city: string | null;
  products: DealerProductView[];
}

export interface DealerProductView {
  product_code: string;
  product_name: string;
  total: number;
  status: 'healthy' | 'warn' | 'risk';
  shipment_ratio: number;
  stability: number;
  coverage: number;
  month: string | null;
  trend: {
    months: string[];
    purchase: number[];
    shipment: number[];
    intake: number[];
  };
}

export async function getDealerDetail(dealerId: string): Promise<DealerDetail | null> {
  const { data: dealer, error: dealerError } = await getSupabaseServer()
    .from('dealers')
    .select('id, dealer_name, province, city')
    .eq('id', dealerId)
    .maybeSingle();
  if (dealerError) throw new Error(`查询经销商失败: ${dealerError.message}`);
  if (!dealer) return null;

  const { data: products, error: productError } = await getSupabaseServer()
    .from('products')
    .select('id, code, name')
    .order('code');
  if (productError) throw new Error(`查询产品失败: ${productError.message}`);

  const { data: scores, error: scoreError } = await getSupabaseServer()
    .from('health_scores')
    .select('month, total, status, shipment_ratio, stability, coverage, product_id')
    .eq('dealer_id', dealerId)
    .order('month');
  if (scoreError) throw new Error(`查询评分失败: ${scoreError.message}`);

  const latestMonth = scores?.length ? scores[scores.length - 1].month : null;

  const views: DealerProductView[] = [];
  for (const p of (products ?? []) as any[]) {
    const [sales, shipments, intakes] = await Promise.all([
      getSupabaseServer()
        .from('manufacturer_sales')
        .select('date, purchase_quantity')
        .eq('dealer_id', dealerId)
        .eq('product_id', p.id)
        .order('date'),
      getSupabaseServer()
        .from('dealer_shipments')
        .select('date, shipment_quantity')
        .eq('dealer_id', dealerId)
        .eq('product_id', p.id)
        .order('date'),
      getSupabaseServer()
        .from('hospital_intakes')
        .select('date, quantity')
        .eq('dealer_id', dealerId)
        .eq('product_id', p.id)
        .order('date'),
    ]);
    if (sales.error) throw new Error(`查询采购失败: ${sales.error.message}`);
    if (shipments.error) throw new Error(`查询出库失败: ${shipments.error.message}`);
    if (intakes.error) throw new Error(`查询入院失败: ${intakes.error.message}`);

    // 日期 → 月份桶（趋势按月展示）
    const monthOf = (d: string) => d.slice(0, 7);
    const months = [...new Set([
      ...(sales.data ?? []).map((s: any) => monthOf(s.date)),
      ...(shipments.data ?? []).map((s: any) => monthOf(s.date)),
      ...(intakes.data ?? []).map((s: any) => monthOf(s.date)),
    ])].sort();

    const purchaseMap = new Map<string, number>();
    for (const s of sales.data ?? []) {
      const m = monthOf(s.date);
      purchaseMap.set(m, (purchaseMap.get(m) ?? 0) + Number(s.purchase_quantity));
    }
    const shipmentMap = new Map<string, number>();
    for (const s of shipments.data ?? []) {
      const m = monthOf(s.date);
      shipmentMap.set(m, (shipmentMap.get(m) ?? 0) + Number(s.shipment_quantity));
    }
    const intakeMap = new Map<string, number>();
    for (const s of intakes.data ?? []) {
      const m = monthOf(s.date);
      intakeMap.set(m, (intakeMap.get(m) ?? 0) + Number(s.quantity));
    }

    const latest = (scores ?? []).filter((s: any) => s.product_id === p.id).at(-1);

    views.push({
      product_code: p.code,
      product_name: p.name,
      total: Number(latest?.total ?? 0),
      status: (latest?.status ?? 'risk') as DealerProductView['status'],
      shipment_ratio: Number(latest?.shipment_ratio ?? 0),
      stability: Number(latest?.stability ?? 0),
      coverage: Number(latest?.coverage ?? 0),
      month: latest?.month ?? latestMonth,
      trend: {
        months,
        purchase: months.map((m) => purchaseMap.get(m) ?? 0),
        shipment: months.map((m) => shipmentMap.get(m) ?? 0),
        intake: months.map((m) => intakeMap.get(m) ?? 0),
      },
    });
  }

  return { id: dealer.id, dealer_name: dealer.dealer_name, province: dealer.province, city: dealer.city, products: views };
}

// ---------- 风险预警中心 ----------

export type RiskTypeFilter = 'all' | 'inventory' | 'abnormal' | 'decline';
export type RiskLevelFilter = 'all' | 'low' | 'medium' | 'high';

export interface RiskRow {
  id: string;
  dealer_id: string;
  dealer_name: string;
  province: string | null;
  product_code: string;
  product_name: string;
  risk_type: 'inventory' | 'abnormal' | 'decline';
  severity: 'low' | 'medium' | 'high';
  context: Record<string, any> | null;
  triggered_at: string;
  resolved_at: string | null;
}

export interface RiskSummary {
  total: number;
  open: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

const SEVERITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export async function getRiskRows(f: {
  product: ProductFilter;
  riskType: RiskTypeFilter;
  level: RiskLevelFilter;
  year?: string;
}): Promise<RiskRow[]> {
  let query = getSupabaseServer()
    .from('risk_alerts')
    .select(
      'id, risk_type, severity, context, triggered_at, resolved_at, dealer_id, product_id, dealer:dealers(dealer_name, province), product:products(code, name)'
    );
  if (f.product !== 'all') query = query.eq('product.code', f.product);
  if (f.riskType !== 'all') query = query.eq('risk_type', f.riskType);
  if (f.level !== 'all') query = query.eq('severity', f.level);

  const { data, error } = await query.order('triggered_at', { ascending: false });
  if (error) throw new Error(`查询风险失败: ${error.message}`);

  let rows = (data ?? []).map((r: any) => ({
    id: r.id,
    dealer_id: r.dealer_id,
    dealer_name: r.dealer?.dealer_name ?? '未知',
    province: r.dealer?.province ?? null,
    product_code: r.product?.code ?? '',
    product_name: r.product?.name ?? '',
    risk_type: r.risk_type,
    severity: r.severity,
    context: r.context,
    triggered_at: r.triggered_at,
    resolved_at: r.resolved_at,
  })) as RiskRow[];

  // 按年份过滤：以 context 中引用的数据月份（latest_month / worst_month / abnormal_months）为准
  if (f.year) {
    rows = rows.filter((r) => {
      const c = r.context ?? {};
      const months = [
        c.latest_month,
        c.worst_month,
        ...(Array.isArray(c.abnormal_months) ? c.abnormal_months : []),
      ].filter(Boolean);
      return months.some((m) => String(m).startsWith(`${f.year}-`));
    });
  }

  rows.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  return rows;
}

export async function getRiskSummary(): Promise<RiskSummary> {
  const { data, error } = await getSupabaseServer()
    .from('risk_alerts')
    .select('risk_type, severity, resolved_at');
  if (error) throw new Error(`查询风险汇总失败: ${error.message}`);

  const summary: RiskSummary = {
    total: (data ?? []).length,
    open: 0,
    resolved: 0,
    byType: { inventory: 0, abnormal: 0, decline: 0 },
    bySeverity: { low: 0, medium: 0, high: 0 },
  };
  for (const r of data ?? []) {
    if (r.resolved_at) summary.resolved += 1;
    else summary.open += 1;
    summary.byType[r.risk_type] = (summary.byType[r.risk_type] ?? 0) + 1;
    summary.bySeverity[r.severity] = (summary.bySeverity[r.severity] ?? 0) + 1;
  }
  return summary;
}

// ---------- AI 报告模块 ----------

export interface DealerOption {
  id: string;
  dealer_name: string;
  province: string | null;
}

export async function getDealerOptions(): Promise<DealerOption[]> {
  const { data, error } = await getSupabaseServer()
    .from('dealers')
    .select('id, dealer_name, province')
    .order('dealer_name');
  if (error) throw new Error(`查询经销商选项失败: ${error.message}`);
  return (data ?? []) as DealerOption[];
}

export interface ProductOption {
  id: string;
  code: string;
  name: string;
}

export async function getProductOptions(): Promise<ProductOption[]> {
  const { data, error } = await getSupabaseServer()
    .from('products')
    .select('id, code, name')
    .order('code');
  if (error) throw new Error(`查询产品选项失败: ${error.message}`);
  return (data ?? []) as ProductOption[];
}

export interface ReportListItem {
  id: string;
  scope: string;
  scope_value: string;
  period: string;
  period_value: string;
  model: string;
  created_at: string;
}

export async function getReportList(limit = 20): Promise<ReportListItem[]> {
  const { data, error } = await getSupabaseServer()
    .from('ai_reports')
    .select('id, scope, scope_value, period, period_value, model, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`查询报告列表失败: ${error.message}`);
  return (data ?? []) as ReportListItem[];
}

export async function getReportById(id: string) {
  const { data, error } = await getSupabaseServer()
    .from('ai_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询报告失败: ${error.message}`);
  return data;
}
