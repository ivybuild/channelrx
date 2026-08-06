'use client';

import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';

type SourceKey = 'manufacturer_sales' | 'dealer_shipments' | 'hospital_intakes' | 'procurement_data' | 'dealers' | 'hospitals' | 'dealer_hospital_mapping';

const SOURCES: {
  key: SourceKey;
  label: string;
  desc: string;
  headers: string;
  example: string;
  section: 'flow' | 'dim';
}[] = [
  {
    key: 'manufacturer_sales',
    label: '厂家采购',
    desc: '厂家 → 经销商 的采购记录',
    headers: '经销商名称,产品code,日期,采购数量,省份',
    example: '宁创医疗科技有限公司,ultrasound,2026-06-15,150,江苏',
    section: 'flow',
  },
  {
    key: 'dealer_shipments',
    label: '经销商出库（核心）',
    desc: '经销商 → 医院 的出库记录',
    headers: '经销商名称,医院名称,产品code,日期,出库数量,数据来源,省份',
    example: '宁创医疗科技有限公司,江宁医科大学附属第一医院,ultrasound,2026-03,50,invoice,江苏',
    section: 'flow',
  },
  {
    key: 'hospital_intakes',
    label: '医院入院',
    desc: '医院终端实际入院数据',
    headers: '医院名称,经销商名称,产品code,日期,数量,省份',
    example: '江宁医科大学附属第一医院,宁创医疗科技有限公司,ultrasound,2026-03,48,江苏',
    section: 'flow',
  },
  {
    key: 'procurement_data',
    label: '省级集采',
    desc: '集采配送记录（配送商 ≠ 经销商）',
    headers: '医院名称,配送公司,产品code,日期,数量,省份',
    example: '江宁医科大学附属第一医院,健邦医药,ultrasound,2026,60,江苏',
    section: 'flow',
  },
  {
    key: 'dealers',
    label: '经销商',
    desc: '导入/更新经销商主数据',
    headers: '经销商名称,省份,城市',
    example: '宁创医疗科技有限公司,江苏,南京',
    section: 'dim',
  },
  {
    key: 'hospitals',
    label: '医院',
    desc: '导入/更新医院主数据',
    headers: '医院名称,省份,城市',
    example: '江宁医科大学附属第一医院,江苏,南京',
    section: 'dim',
  },
  {
    key: 'dealer_hospital_mapping',
    label: '对应关系',
    desc: '经销商-终端医院对应表（带有效期，支持医院更换经销商）',
    headers: '经销商名称,医院名称,生效日期,失效日期',
    example: '宁创医疗科技有限公司,江宁医科大学附属第一医院,2025-01-01,',
    section: 'dim',
  },
];

const HEADER_ALIAS: Record<string, string> = {
  经销商名称: '经销商名称', dealer_name: '经销商名称',
  医院名称: '医院名称', hospital_name: '医院名称',
  产品code: '产品code', product_code: '产品code', code: '产品code',
  日期: '日期', date: '日期', 月份: '日期', month: '日期',
  采购数量: '采购数量', purchase_quantity: '采购数量',
  出库数量: '出库数量', shipment_quantity: '出库数量',
  数量: '数量', quantity: '数量',
  省份: '省份', province: '省份',
  数据来源: '数据来源', source_type: '数据来源',
  配送公司: '配送公司', delivery_company: '配送公司',
  城市: '城市', city: '城市',
  生效日期: '生效日期', effective_from: '生效日期',
  失效日期: '失效日期', effective_to: '失效日期',
};

export function ImportForm() {
  const [source, setSource] = useState<SourceKey>('manufacturer_sales');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ imported: number; replaced?: boolean; compute?: { healthScores: number; riskAlerts: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = SOURCES.find((s) => s.key === source)!;
  const preview = rows.slice(0, 5);

  function parse(textValue: string) {
    setText(textValue);
    setError('');
    setResult(null);
    const parsed = Papa.parse<Record<string, string>>(textValue.trim(), { header: true, skipEmptyLines: true });
    if (parsed.errors?.length) {
      setError(`CSV 解析错误：${parsed.errors[0].message}`);
      return;
    }
    const normalized = (parsed.data ?? [])
      .map((raw) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          const label = HEADER_ALIAS[k?.trim() ?? ''];
          if (label) out[label] = String(v ?? '').trim();
        }
        return out;
      })
      .filter((r) => Object.values(r).some((v) => v !== ''));
    setRows(normalized);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parse(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  async function onImport() {
    if (rows.length === 0 || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, rows, replace }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? '导入失败');
      setResult({ imported: data.imported, compute: data.compute });
      setRows([]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setLoading(false);
    }
  }

  function copyTemplate() {
    navigator.clipboard?.writeText(`${current.headers}\n${current.example}`).then(() => {
      setText(`${current.headers}\n${current.example}`);
      parse(`${current.headers}\n${current.example}`);
    });
  }

  return (
    <div className="space-y-4">
      {/* 数据源选择 */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">流水导入（导入后自动重算评分与风险）</div>
        <div className="flex flex-wrap gap-2">
          {SOURCES.filter((s) => s.section === 'flow').map((s) => (
            <button key={s.key} type="button" onClick={() => { setSource(s.key); setRows([]); setResult(null); setText(''); setError(''); }}
              className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors',
                source === s.key ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] font-medium text-[hsl(var(--primary))]' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs font-medium text-muted-foreground">维度管理（先维护基础数据与对应关系，不触发重算）</div>
        <div className="flex flex-wrap gap-2">
          {SOURCES.filter((s) => s.section === 'dim').map((s) => (
            <button key={s.key} type="button" onClick={() => { setSource(s.key); setRows([]); setResult(null); setText(''); setError(''); }}
              className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors',
                source === s.key ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] font-medium text-[hsl(var(--primary))]' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{current.desc}</p>

      {/* 输入区 */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-9 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
          >
            选择 CSV 文件
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <button
            type="button"
            onClick={copyTemplate}
            className="h-9 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            粘贴模板示例
          </button>
          <span className="text-xs text-muted-foreground">
            表头：{current.headers.split(',').join(' / ')}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => parse(e.target.value)}
          placeholder="也可以直接粘贴 CSV 内容（首行为表头）..."
          rows={6}
          className="w-full rounded-lg border border-border bg-card p-3 font-mono text-xs outline-none focus:border-[hsl(var(--primary))]"
        />
      </div>

      {error && <p className="text-xs text-[hsl(var(--risk))]">{error}</p>}

      {/* 预览 */}
      {preview.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            预览前 {preview.length} 行，共解析 {preview.length >= 5 ? '≥5' : preview.length} 行（导入将按此格式解析全部行）
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {Object.keys(preview[0]).map((k) => (
                    <th key={k} className="px-4 py-2 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    {Object.entries(r).map(([k, v]) => (
                      <td key={k} className="px-4 py-2">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 导入按钮 + 覆盖开关（仅流水表，维度表由 upsert 自动覆盖） */}
      {preview.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          {current.section === 'flow' && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              覆盖导入（先删除本批日期区间的旧数据，再写入）
            </label>
          )}
          <button
            type="button"
            onClick={onImport}
            disabled={loading}
            className="h-10 rounded-lg bg-[hsl(var(--primary))] px-6 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '导入并重算中...' : '导入数据并重新计算评分'}
          </button>
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div className="rounded-lg border border-[hsl(var(--healthy)/0.4)] bg-[hsl(var(--healthy)/0.06)] p-4 text-sm">
          ✅ 导入成功：{result.imported} 条记录
          {result.replaced && <span>（覆盖模式：已先删除本批日期区间旧数据）</span>}
          {result.compute
            ? <span>；已自动重算评分 <strong>{result.compute.healthScores}</strong> 条、风险 <strong>{result.compute.riskAlerts}</strong> 条。页面数据已刷新。</span>
            : <span>（维度数据，无需重算）</span>}
        </div>
      )}
    </div>
  );
}
