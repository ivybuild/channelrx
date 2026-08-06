import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { runCompute } from '@/lib/compute';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby 默认 10s 超时，导入+重算需要更长

type SourceType = 'manufacturer_sales' | 'dealer_shipments' | 'hospital_intakes' | 'procurement_data' | 'dealers' | 'hospitals' | 'dealer_hospital_mapping';

// 表头别名 → 规范字段
const ALIAS: Record<string, string> = {
  经销商名称: 'dealer_name', dealer_name: 'dealer_name', 经销商: 'dealer_name',
  医院名称: 'hospital_name', hospital_name: 'hospital_name', 医院: 'hospital_name',
  产品code: 'product_code', 产品: 'product_code', product_code: 'product_code', code: 'product_code',
  日期: 'date', date: 'date', 月份: 'date', month: 'date',
  采购数量: 'purchase_quantity', purchase_quantity: 'purchase_quantity',
  出库数量: 'shipment_quantity', shipment_quantity: 'shipment_quantity',
  数量: 'quantity', quantity: 'quantity',
  省份: 'province', province: 'province',
  城市: 'city', city: 'city', 生效日期: 'effective_from', effective_from: 'effective_from', 失效日期: 'effective_to', effective_to: 'effective_to',
  配送公司: 'delivery_company', delivery_company: 'delivery_company', 数据来源: 'source_type', source_type: 'source_type',
};

function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = ALIAS[k.trim()];
    if (field) out[field] = String(v ?? '').trim();
  }
  // 日期归一化：YYYY → YYYY-01-01, YYYY-MM → YYYY-MM-01
  if (out.date) {
    if (/^\d{4}$/.test(out.date)) out.date = `${out.date}-01-01`;
    else if (/^\d{4}-\d{2}$/.test(out.date)) out.date = `${out.date}-01`;
  }
  return out;
}

// ============ 维度批量预载（避免逐行查库，大幅提速） ============

interface DimStore {
  productByCode: Map<string, string>;
  dealerByName: Map<string, { id: string; province: string | null }[]>;
  hospitalByName: Map<string, { id: string; province: string | null }[]>;
}

async function loadDims(): Promise<DimStore> {
  const store: DimStore = {
    productByCode: new Map(),
    dealerByName: new Map(),
    hospitalByName: new Map(),
  };

  // 三个维度并行拉取
  const [products, dealers, hospitals] = await Promise.all([
    getSupabaseServer().from('products').select('id, code'),
    getSupabaseServer().from('dealers').select('id, dealer_name, province'),
    getSupabaseServer().from('hospitals').select('id, hospital_name, province'),
  ]);

  for (const p of products.data ?? []) store.productByCode.set(p.code, p.id);
  for (const d of dealers.data ?? []) {
    const list = store.dealerByName.get(d.dealer_name) ?? [];
    list.push({ id: d.id, province: d.province });
    store.dealerByName.set(d.dealer_name, list);
  }
  for (const h of hospitals.data ?? []) {
    const list = store.hospitalByName.get(h.hospital_name) ?? [];
    list.push({ id: h.id, province: h.province });
    store.hospitalByName.set(h.hospital_name, list);
  }

  return store;
}

async function insertMissing(store: DimStore, missing: {
  products: Set<string>;
  dealers: Set<string>; // 'name|province|city'
  hospitals: Set<string>; // 'name|province'
}) {
  for (const code of missing.products) {
    const name = code === 'ultrasound' ? '超声刀' : code === 'stapler' ? '吻合器' : code;
    const { data, error } = await getSupabaseServer().from('products').insert({ code, name }).select('id, code').single();
    if (error) throw new Error(`创建产品 ${code} 失败: ${error.message}`);
    store.productByCode.set(data.code, data.id);
  }

  if (missing.dealers.size > 0) {
    const rows = [...missing.dealers].map((key) => {
      const [name, province] = key.split('|');
      return { dealer_name: name, province: province === 'null' ? null : province };
    });
    const { data, error } = await getSupabaseServer().from('dealers').insert(rows).select('id, dealer_name, province');
    if (error) throw new Error(`创建经销商失败: ${error.message}`);
    for (const d of data ?? []) {
      const list = store.dealerByName.get(d.dealer_name) ?? [];
      list.push({ id: d.id, province: d.province });
      store.dealerByName.set(d.dealer_name, list);
    }
  }

  if (missing.hospitals.size > 0) {
    const rows = [...missing.hospitals].map((key) => {
      const [name, province] = key.split('|');
      return { hospital_name: name, province: province === 'null' ? '未知' : province };
    });
    const { data, error } = await getSupabaseServer().from('hospitals').insert(rows).select('id, hospital_name, province');
    if (error) throw new Error(`创建医院失败: ${error.message}`);
    for (const h of data ?? []) {
      const list = store.hospitalByName.get(h.hospital_name) ?? [];
      list.push({ id: h.id, province: h.province });
      store.hospitalByName.set(h.hospital_name, list);
    }
  }
}

function resolveId(
  byName: Map<string, { id: string; province: string | null }[]>,
  name: string,
  province?: string
): string | null {
  const list = byName.get(name);
  if (!list || list.length === 0) return null;
  const match = province ? list.find((d) => d.province === province) : undefined;
  return (match ?? list[0]).id;
}

async function processRows(source: SourceType, rows: Record<string, string>[], replace: boolean) {
  const store = await loadDims();
  const missing = { products: new Set<string>(), dealers: new Set<string>(), hospitals: new Set<string>() };

  // 第一遍：标记缺失维度
  for (const r of rows) {
    if (r.product_code && !store.productByCode.has(r.product_code)) missing.products.add(r.product_code);
    if (r.dealer_name && !resolveId(store.dealerByName, r.dealer_name, r.province)) {
      missing.dealers.add(`${r.dealer_name}|${r.province ?? 'null'}`);
    }
    if (r.hospital_name && !resolveId(store.hospitalByName, r.hospital_name, r.province)) {
      missing.hospitals.add(`${r.hospital_name}|${r.province ?? 'null'}`);
    }
  }
  await insertMissing(store, missing);

  // 第二遍：组装有效行
  const valid: any[] = [];
  for (const r of rows) {
    if (source === 'manufacturer_sales') {
      if (!r.dealer_name || !r.product_code || !r.date || !r.purchase_quantity) continue;
      valid.push({
        dealer_id: resolveId(store.dealerByName, r.dealer_name, r.province),
        product_id: store.productByCode.get(r.product_code),
        date: r.date,
        purchase_quantity: Number(r.purchase_quantity),
      });
    } else if (source === 'dealer_shipments') {
      if (!r.dealer_name || !r.hospital_name || !r.product_code || !r.date || !r.shipment_quantity) continue;
      valid.push({
        dealer_id: resolveId(store.dealerByName, r.dealer_name, r.province),
        hospital_id: resolveId(store.hospitalByName, r.hospital_name, r.province),
        product_id: store.productByCode.get(r.product_code),
        date: r.date,
        shipment_quantity: Number(r.shipment_quantity),
        source_type: ['invoice', 'delivery_note', 'inventory_report'].includes(r.source_type) ? r.source_type : 'invoice',
      });
    } else if (source === 'hospital_intakes') {
      if (!r.hospital_name || !r.dealer_name || !r.product_code || !r.date || !r.quantity) continue;
      valid.push({
        hospital_id: resolveId(store.hospitalByName, r.hospital_name, r.province),
        dealer_id: resolveId(store.dealerByName, r.dealer_name, r.province),
        product_id: store.productByCode.get(r.product_code),
        date: r.date,
        quantity: Number(r.quantity),
        province: r.province ?? null,
      });
    } else if (source === 'procurement_data') {
      if (!r.hospital_name || !r.delivery_company || !r.product_code || !r.date || !r.quantity) continue;
      valid.push({
        hospital_id: resolveId(store.hospitalByName, r.hospital_name, r.province),
        product_id: store.productByCode.get(r.product_code),
        delivery_company: r.delivery_company,
        province: r.province ?? '未知',
        date: r.date,
        quantity: Number(r.quantity),
      });
    } else if (source === 'dealers') {
      if (!r.dealer_name) continue;
      const key = `${r.dealer_name}|${r.province ?? ''}`;
      if (missing.dealers.has(key)) continue; // 已标记缺失，等 insertMissing
      const id = resolveId(store.dealerByName, r.dealer_name, r.province);
      if (id) valid.push({ id, dealer_name: r.dealer_name, province: r.province || null, city: r.city || null });
      else missing.dealers.add(key);
    } else if (source === 'hospitals') {
      if (!r.hospital_name) continue;
      const key = `${r.hospital_name}|${r.province ?? ''}`;
      if (missing.hospitals.has(key)) continue;
      const id = resolveId(store.hospitalByName, r.hospital_name, r.province);
      if (id) valid.push({ id, hospital_name: r.hospital_name, province: r.province || '未知', city: r.city || null });
      else missing.hospitals.add(key);
    } else if (source === 'dealer_hospital_mapping') {
      if (!r.dealer_name || !r.hospital_name || !r.effective_from) continue;
      valid.push({ _dealer_name: r.dealer_name, _dealer_province: r.province, _hospital_name: r.hospital_name, effective_from: r.effective_from, effective_to: r.effective_to || null });
    }
  }

  // 经销商-医院对应：需要二次解析维度（因为 dealer/hospital 可能在同批新增）
  let clean = valid.filter((v) => Object.values(v).every((x) => x !== null && x !== undefined));
  if (source === 'dealer_hospital_mapping') {
    clean = [];
    for (const v of valid) {
      if (!v._dealer_name || !v._hospital_name) continue;
      const did = resolveId(store.dealerByName, v._dealer_name, v._dealer_province);
      const hid = resolveId(store.hospitalByName, v._hospital_name);
      if (did && hid) clean.push({ dealer_id: did, hospital_id: hid, effective_from: v.effective_from, effective_to: v.effective_to });
    }
  } else if (source === 'dealers' || source === 'hospitals') {
    // 维度已有 id，直接 upsert
  }
  if (clean.length === 0) return { imported: 0 };

  // 厂家采购有唯一键（经销商×产品×日期）：同一批内重复键先合并（数量相加），
  // 否则 ON CONFLICT DO UPDATE 会在一条语句里二次更新同一行而报错
  if (source === 'manufacturer_sales') {
    const merged = new Map<string, any>();
    for (const row of clean) {
      const k = `${row.dealer_id}|${row.product_id}|${row.date}`;
      const prev = merged.get(k);
      if (prev) prev.purchase_quantity += row.purchase_quantity;
      else merged.set(k, { ...row });
    }
    clean = [...merged.values()];
  }

  // 覆盖模式：先删除该批次日期区间的旧记录，再插入
  if (replace) {
    const dates = clean.map((c: any) => c.date).sort();
    const from = dates[0];
    const to = dates[dates.length - 1];
    const { error: delErr } = await getSupabaseServer()
      .from(source)
      .delete()
      .gte('date', from)
      .lte('date', to);
    if (delErr) throw new Error(`删除旧数据失败: ${delErr.message}`);
  }

  const conflict = source === 'manufacturer_sales' ? { onConflict: 'dealer_id,product_id,date' }
    : source === 'dealers' ? { onConflict: 'dealer_name,province' }
    : source === 'hospitals' ? { onConflict: 'hospital_name,province' }
    : undefined;
  const { error } = await getSupabaseServer()
    .from(source)
    .upsert(clean, conflict ?? {});
  if (error) throw new Error(`写入 ${source} 失败: ${error.message}`);

  return { imported: clean.length, replaced: replace };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const source: SourceType | undefined = body?.source;
    const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];
    const replace: boolean = body?.replace === true;

    const SOURCES: SourceType[] = ['manufacturer_sales', 'dealer_shipments', 'hospital_intakes', 'procurement_data', 'dealers', 'hospitals', 'dealer_hospital_mapping'];
    if (!source || !SOURCES.includes(source) || rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: '参数缺失：需要 source 和 rows（非空数组）' },
        { status: 400 }
      );
    }

    const normalized = rows.map((r) => normalizeRow((r ?? {}) as Record<string, unknown>));
    const { imported, replaced } = await processRows(source, normalized, replace);

    // 导入后自动重算评分与风险
    const dimensional = ['dealers', 'hospitals', 'dealer_hospital_mapping'].includes(source);
    const compute = dimensional ? null : await runCompute();

    return NextResponse.json({
      ok: true,
      source,
      imported,
      replaced: replaced ?? false,
      ...(compute ? { compute } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
