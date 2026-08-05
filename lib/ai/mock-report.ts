// ============================================================
// 模板报告生成器（未配置 DeepSeek Key 时使用）
// 数字全部来自数据库计算结果，语言由模板组织——与 AI 版职责一致
// （总结 / 解释 / 建议，不参与计算），后续填 key 无缝切换真实模型。
// ============================================================
import type { RiskRow, ScoreRow, DealerDetail } from '../queries';
import { RISK_LABEL, PRODUCT_LABEL } from '../utils';

export interface ReportContext {
  scope: 'region' | 'dealer' | 'product';
  scopeLabel: string;
  month: string;
  dealerCount: number;
  overview: { total: number; healthy: number; warn: number; risk: number };
  riskRows: RiskRow[];
  scoreRows: ScoreRow[];
  dealerDetail?: DealerDetail | null;
}

const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '0%');

function riskLine(r: RiskRow): string {
  const c = r.context ?? {};
  switch (r.risk_type) {
    case 'inventory':
      return `连续 ${c.consecutive_months ?? 3} 个月出库比例 <70%，最新 ${Math.round((Number(c.latest_ratio ?? 0)) * 100)}%（${c.latest_month ?? '-'}）`;
    case 'abnormal':
      return `出库比例 ${Math.round(Number(c.worst_ratio ?? 0) * 100)}%（${c.worst_month ?? '-'}），可能为窜货 / 数据异常`;
    case 'decline':
      return `采购与出库连续 ${c.months ?? 3} 个月下降，采购累计降幅 ${Math.round(Number(c.purchase_drop_pct ?? 0) * 100)}%`;
    default:
      return '规则命中，建议人工核查';
  }
}

function riskAdvice(type: string): string {
  switch (type) {
    case 'inventory':
      return '暂停或缩减供货计划，核查经销商实际库存与终端动销，必要时协助终端促销去库存';
    case 'abnormal':
      return '核查出库单据来源与流向，排查跨区域窜货或统计口径差异，与经销商核对进销存数据';
    case 'decline':
      return '与经销商确认区域市场情况，评估集采或竞品影响，调整市场支持与供货策略';
    default:
      return '建议人工核查';
  }
}

export function generateMockReport(ctx: ReportContext): string {
  const { overview, riskRows, month } = ctx;
  const L: string[] = [];
  const cn = ['一', '二', '三', '四', '五'];
  let sec = 0;
  const next = () => `${cn[Math.min(sec++, 4)]}、`;

  const scopeName =
    ctx.scope === 'region' ? `区域 ${ctx.scopeLabel}` :
    ctx.scope === 'dealer' ? `经销商 ${ctx.dealerDetail?.dealer_name ?? ctx.scopeLabel}` :
    `产品 ${PRODUCT_LABEL[ctx.scopeLabel] ?? ctx.scopeLabel}`;

  L.push(`# 渠道健康分析报告`);
  L.push('');
  L.push(`> **范围**：${scopeName}　**数据月份**：${month}　**生成方式**：规则模板（未调用大模型）`);
  L.push('');
  L.push(`## ${next()}渠道健康概览`);
  L.push('');
  L.push(`- 本月共 **${overview.total}** 条评分记录，涉及 **${ctx.dealerCount}** 家经销商`);
  L.push(`- 健康 **${overview.healthy}** 条（${pct(overview.healthy, overview.total)}），预警 **${overview.warn}** 条（${pct(overview.warn, overview.total)}），异常 **${overview.risk}** 条（${pct(overview.risk, overview.total)}）`);
  if (overview.risk > 0) {
    L.push(`- 整体渠道存在 **${overview.risk}** 条异常记录，建议优先关注下节风险名单`);
  } else if (overview.warn > 0) {
    L.push(`- 整体渠道基本健康，但仍有 **${overview.warn}** 条预警记录需要持续跟踪`);
  } else {
    L.push(`- 本月整体渠道健康，未发现明显风险`);
  }
  L.push('');

  if (ctx.dealerDetail) {
    L.push(`## ${next()}产品表现`);
    L.push('');
    for (const p of ctx.dealerDetail.products) {
      const st = p.status === 'healthy' ? '健康' : p.status === 'warn' ? '预警' : '异常';
      const trend = p.trend.shipment;
      const dir =
        trend.length >= 2 && trend[trend.length - 1] < trend[0]
          ? '呈下降趋势'
          : trend.length >= 2 && trend[trend.length - 1] > trend[0]
            ? '呈上升趋势'
            : '基本平稳';
      L.push(`- **${p.product_name}**：评分 **${p.total}**（${st}），出库比例 ${Math.round(p.shipment_ratio * 100)}%，${dir}`);
      L.push(`  - 展示指标：采购稳定性 ${p.stability} / 终端覆盖度 ${p.coverage}%（不参与评分）`);
      L.push(`  - 月度出库趋势：${p.trend.shipment.join(' → ')}（${p.trend.months.join(' / ')}）`);
    }
    L.push('');
  }

  if (ctx.scope !== 'dealer' && overview.risk > 0) {
    const worst = [...ctx.scoreRows].sort((a, b) => a.total - b.total).slice(0, 3);
    L.push(`## ${next()}低分样本（Top ${worst.length}）`);
    L.push('');
    for (const w of worst) {
      L.push(`- **${w.dealer_name}**（${w.product_name}）：${w.total} 分，出库比例 ${Math.round(w.shipment_ratio * 100)}%`);
    }
    L.push('');
  }

  if (riskRows.length > 0) {
    L.push(`## ${next()}风险提示`);
    L.push('');
    riskRows.forEach((r, i) => {
      L.push(`${i + 1}. **${r.dealer_name}**（${r.product_name}）：**${RISK_LABEL[r.risk_type] ?? r.risk_type}** 风险 —— ${riskLine(r)}`);
    });
    L.push('');
  }

  L.push(`## ${next()}运营建议`);
  L.push('');
  if (riskRows.length === 0) {
    L.push(`- 当前范围内无命中风险规则，保持现有供货与渠道管理节奏`);
    L.push(`- 建议按周关注预警经销商（出库比例 70%-80% / 120%-130% 区间）的动态`);
  } else {
    const byType = new Map<string, RiskRow[]>();
    for (const r of riskRows) {
      if (!byType.has(r.risk_type)) byType.set(r.risk_type, []);
      byType.get(r.risk_type)!.push(r);
    }
    let i = 1;
    for (const [type, rows] of byType) {
      L.push(`${i}. **${RISK_LABEL[type]}风险（${rows.length} 条）**：${riskAdvice(type)}`);
      L.push(`   - 涉及：${rows.map((r) => `${r.dealer_name}（${r.product_name}）`).join('、')}`);
      i += 1;
    }
    if (overview.risk > 0) {
      L.push(`${i}. **重点核查**：对异常（<60 分）经销商安排 1 周内回访，核对其进销存台账与终端流向数据`);
      i += 1;
    }
    L.push(`${i}. **数据治理**：对出库比例异常偏高（>130%）的记录核对数据来源，排查统计口径问题`);
  }
  L.push('');

  return L.join('\n');
}
