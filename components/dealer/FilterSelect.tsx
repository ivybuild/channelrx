'use client';

// 筛选下拉框：onChange 自动提交所在表单（GET → 更新 URL 查询参数）
export function FilterSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="h-9 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
