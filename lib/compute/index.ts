// ============================================================
// 评分计算入口：拉取原始数据 → 编排引擎 → 清空重写计算结果表
// 触发时机：数据导入后手动调用（MVP 无定时任务）
// ============================================================
import { getSupabaseServer } from '../supabase/server';
import { runComputeEngine, summarize, type ComputeDeps } from './engine';
import type { HealthScore, RiskAlert } from '../../types';

export interface ComputeSummary {
  healthScores: number;
  riskAlerts: number;
  byStatus: Record<string, number>;
  months: string[];
}

async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  // PostgREST 单次默认最多返回 1000 行，日粒度数据量较大，需分页拉全
  const PAGE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabaseServer()
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`读取 ${table} 失败: ${error.message}`);
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

async function clearTable(table: string) {
  const { error } = await getSupabaseServer()
    .from(table)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(`清空 ${table} 失败: ${error.message}`);
}

async function insertBatch<T>(table: string, rows: T[]) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await getSupabaseServer().from(table).insert(slice as never[]);
    if (error) throw new Error(`写入 ${table} 失败: ${error.message}`);
  }
}

export async function runCompute(): Promise<ComputeSummary> {
  const [sales, shipments, dealers, hospitals] = await Promise.all([
    fetchAll<ComputeDeps['sales'][number]>('manufacturer_sales', 'dealer_id, product_id, date, purchase_quantity'),
    fetchAll<ComputeDeps['shipments'][number]>('dealer_shipments', 'dealer_id, product_id, date, hospital_id, shipment_quantity'),
    fetchAll<{ id: string; province: string | null }>('dealers', 'id, province'),
    fetchAll<{ id: string; province: string }>('hospitals', 'id, province'),
  ]);

  const { healthScores, riskAlerts } = runComputeEngine({ sales, shipments, dealers, hospitals });

  // 重算 = 清空旧计算结果再写入（结果表仅由 compute 管理，并行清空）
  await Promise.all([clearTable('risk_alerts'), clearTable('health_scores')]);

  if (healthScores.length > 0) await insertBatch<HealthScore>('health_scores', healthScores);
  if (riskAlerts.length > 0) await insertBatch<RiskAlert>('risk_alerts', riskAlerts);

  const months = [...new Set(sales.map((s) => s.date.slice(0, 7)))].sort();
  return {
    healthScores: healthScores.length,
    riskAlerts: riskAlerts.length,
    byStatus: summarize(healthScores),
    months,
  };
}
