'use client';

import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

// echarts-for-react 在客户端动态加载，避免 SSR 时初始化问题
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      图表加载中...
    </div>
  ),
});

export function EChart({
  option,
  height = 280,
}: {
  option: EChartsOption;
  height?: number;
}) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
    />
  );
}
