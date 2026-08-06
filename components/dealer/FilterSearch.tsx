'use client';

/** 搜索输入框：按经销商名称模糊搜索（GET 表单，保留现有 URL 参数） */
export function FilterSearch({
  defaultValue,
  existingKeys,
}: {
  defaultValue?: string;
  existingKeys?: string; // 现有的 GET 参数（不含 q），如 "product=ultrasound&province=浙江"
}) {
  return (
    <form method="get" className="flex items-center gap-2">
      {existingKeys?.split('&').filter(Boolean).map((kv) => {
        const [k, v] = kv.split('=');
        return <input key={k} type="hidden" name={k} value={v ?? ''} />;
      })}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue ?? ''}
        placeholder="搜索经销商名称..."
        className="h-9 w-48 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-[hsl(var(--primary))]"
      />
      <button
        type="submit"
        className="h-9 rounded-lg bg-[hsl(var(--primary))] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
      >
        搜索
      </button>
      {defaultValue && (
        <a href={`?${existingKeys ?? ''}`} className="text-xs text-muted-foreground hover:underline">
          清除
        </a>
      )}
    </form>
  );
}
