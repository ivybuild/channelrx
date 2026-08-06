import { Card, CardTitle } from '@/components/ui/card';
import { ImportForm } from '@/components/import/ImportForm';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">数据导入</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          上传 4 类流水 + 3 类维度数据（CSV），导入后自动重新计算评分与风险。
          维度（经销商/医院/产品）按名称 upsert 匹配；流水表支持覆盖/追加模式。
        </p>
      </div>

      <Card>
        <CardTitle>选择数据源并上传</CardTitle>
        <ImportForm />
      </Card>

      <div className="card-surface p-4 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">导入说明：</strong>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>支持中文或英文字段名（如 经销商名称 / dealer_name），日期格式 YYYY-MM-DD（也接受 YYYY-MM，自动补 01）</li>
          <li>产品 code：ultrasound（超声刀）/ stapler（吻合器），新 code 会自动创建产品</li>
          <li>数据来源字段：invoice / delivery_note / inventory_report（出库表）</li>
          <li>厂家采购按 经销商×产品×日期 去重覆盖；其余表默认按行追加</li>
          <li>勾选「覆盖导入」= 先删除本批日期区间的旧数据再写入（适合整月重导，避免重复翻倍）</li>
          <li>评分按 经销商×产品×月 汇总（日期自动归月）；导入完成后自动重算，各页面即时刷新</li>
        </ul>
      </div>
    </div>
  );
}
