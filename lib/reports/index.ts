// ============================================================
// AI 报告编排：构建上下文 → 生成（模板 / DeepSeek 双路径）→ 落库
// 未配置 DEEPSEEK_API_KEY 时走规则模板（mock-report.ts）；
// 配置后自动切换真实模型。AI 只做总结/解释/建议，数字全部来自计算层。
// ============================================================
import { getSupabaseServer } from '../supabase/server';
import {
  fetchLatestScores,
  getDealerDetail,
  getRiskRows,
  getLatestMonth,
  type RiskRow,
  type ScoreRow,
  type DealerDetail,
} from '../queries';
import { callDeepSeek } from '../ai/index';
import { generateMockReport, type ReportContext } from '../ai/mock-report';

export type ReportScope = 'region' | 'dealer' | 'product';

export interface GenerateInput {
  scope: ReportScope;
  scopeValue: string;
  period?: 'week' | 'month';
  year?: string;
}

export interface GenerateResult {
  id: string;
  content: string;
  model: string;
}

/** 构建报告上下文：数字全部来自数据库 */
async function buildContext(
  scope: ReportScope,
  scopeValue: string,
  year?: string
): Promise<ReportContext> {
  const month = (await getLatestMonth(year)) ?? '-';
  const allRows = await fetchLatestScores('all', year);
  const risks = await getRiskRows({ product: 'all', riskType: 'all', level: 'all', year });

  const count = (rows: ScoreRow[]) => {
    const o = { total: rows.length, healthy: 0, warn: 0, risk: 0 };
    for (const r of rows) o[r.status] += 1;
    return o;
  };

  if (scope === 'region') {
    const rows = allRows.filter((r) => r.province === scopeValue);
    const riskRows = risks.filter((r) => r.province === scopeValue);
    return {
      scope,
      scopeLabel: scopeValue,
      month,
      dealerCount: new Set(rows.map((r) => r.dealer_id)).size,
      overview: count(rows),
      riskRows,
      scoreRows: rows,
    };
  }

  if (scope === 'dealer') {
    const detail: DealerDetail | null = await getDealerDetail(scopeValue);
    const rows = allRows.filter((r) => r.dealer_id === scopeValue);
    const riskRows = risks.filter((r) => r.dealer_id === scopeValue);
    return {
      scope,
      scopeLabel: detail?.dealer_name ?? scopeValue,
      month,
      dealerCount: 1,
      overview: count(rows),
      riskRows,
      scoreRows: rows,
      dealerDetail: detail,
    };
  }

  // product
  const rows = allRows.filter((r) => r.product_code === scopeValue);
  const riskRows = risks.filter((r) => r.product_code === scopeValue);
  return {
    scope,
    scopeLabel: scopeValue,
    month,
    dealerCount: new Set(rows.map((r) => r.dealer_id)).size,
    overview: count(rows),
    riskRows,
    scoreRows: rows,
  };
}

/** 组装喂给大模型的 prompt（真实模型路径） */
function buildDeepSeekPrompt(ctx: ReportContext): { system: string; user: string } {
  const ctxLines = [
    `范围：${ctx.scopeLabel}（${ctx.scope}）`,
    `数据月份：${ctx.month}`,
    `评分记录 ${ctx.overview.total} 条：健康 ${ctx.overview.healthy} / 预警 ${ctx.overview.warn} / 异常 ${ctx.overview.risk}`,
    `风险 ${ctx.riskRows.length} 条：${ctx.riskRows
      .map((r) => `${r.dealer_name}-${r.product_name}-${r.risk_type}`)
      .join('；') || '无'}`,
  ].join('\n');
  return {
    system:
      '你是医疗器械渠道运营分析助手。请基于用户给出的结构化数据，生成中文 Markdown 渠道分析报告，包含：一、渠道健康概览；二、风险提示；三、运营建议。只总结与解释已有数据并给出建议，禁止编造任何数字。',
    user: ctxLines,
  };
}

export async function generateReport(input: GenerateInput): Promise<GenerateResult> {
  const ctx = await buildContext(input.scope, input.scopeValue, input.year);

  let content: string;
  let model: string;

  if (process.env.DEEPSEEK_API_KEY) {
    const { system, user } = buildDeepSeekPrompt(ctx);
    content = await callDeepSeek({ systemPrompt: system, userPrompt: user, maxTokens: 1500 });
    model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  } else {
    content = generateMockReport(ctx);
    model = 'mock-template';
  }

  const { data, error } = await getSupabaseServer()
    .from('ai_reports')
    .insert({
      scope: input.scope,
      scope_value: input.scopeValue,
      period: input.period ?? 'month',
      period_value: ctx.month,
      content,
      model,
      token_usage: null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`报告落库失败: ${error.message}`);

  return { id: data.id, content, model };
}
