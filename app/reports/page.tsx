import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { ReportForm } from '@/components/reports/ReportForm';
import { Markdown } from '@/components/reports/Markdown';
import {
  getProvinces,
  getDealerOptions,
  getProductOptions,
  getReportList,
  getReportById,
  getYears,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

const SCOPE_LABEL: Record<string, string> = {
  region: '区域',
  dealer: '经销商',
  product: '产品',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const [provinces, dealers, products, list, years] = await Promise.all([
    getProvinces(),
    getDealerOptions(),
    getProductOptions(),
    getReportList(20),
    getYears(),
  ]);

  const targetId = searchParams.id ?? list[0]?.id;
  const current = targetId ? await getReportById(targetId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AI 渠道分析报告</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          按区域 / 经销商 / 产品生成渠道健康分析报告（当前为规则模板模式，配置
          <code className="mx-1 rounded bg-muted px-1">DEEPSEEK_API_KEY</code>
          后自动切换 DeepSeek 生成）
        </p>
      </div>

      <Card>
        <CardTitle>生成报告</CardTitle>
        <ReportForm provinces={provinces} dealers={dealers} products={products} years={years} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 报告正文 */}
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>报告内容</CardTitle>
            {current ? (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {SCOPE_LABEL[current.scope] ?? current.scope} · {current.scope_value}
                  </span>
                  <span>数据月份 {current.period_value}</span>
                  <span>生成于 {new Date(current.created_at).toLocaleString('zh-CN')}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {current.model === 'mock-template' ? '模板生成' : current.model}
                  </span>
                </div>
                <Markdown content={current.content} />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                暂无报告，请在上方选择范围后点击「生成分析报告」
              </p>
            )}
          </Card>
        </div>

        {/* 历史列表 */}
        <div>
          <Card>
            <CardTitle>历史报告（{list.length}）</CardTitle>
            {list.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">暂无历史记录</p>
            ) : (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/reports?id=${r.id}`}
                      className="block rounded-lg border border-border p-3 transition-colors hover:border-[hsl(var(--primary)/0.5)] hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {SCOPE_LABEL[r.scope] ?? r.scope} · {r.scope_value}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.model === 'mock-template' ? '模板生成' : r.model} · 数据 {r.period_value}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
