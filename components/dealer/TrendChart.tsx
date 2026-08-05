'use client';

import { EChart } from '@/components/charts/EChart';
import type { EChartsOption } from 'echarts';

const SERIES = [
  { name: '采购', color: '#5BA88A' },
  { name: '出库', color: '#4A90C4' },
  { name: '医院流向', color: '#C98A5B' },
];

export function TrendChart({
  months,
  purchase,
  shipment,
  intake,
}: {
  months: string[];
  purchase: number[];
  shipment: number[];
  intake: number[];
}) {
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['采购', '出库', '医院流向'],
      top: 0,
      textStyle: { fontSize: 12, color: '#5c6b62' },
    },
    grid: { left: 40, right: 16, top: 36, bottom: 24 },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: '#d6e0da' } },
      axisLabel: { color: '#8a9a90', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#edf2ef' } },
      axisLabel: { color: '#8a9a90', fontSize: 11 },
    },
    series: [
      {
        name: '采购',
        type: 'bar',
        data: purchase,
        itemStyle: { color: SERIES[0].color, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 26,
      },
      {
        name: '出库',
        type: 'line',
        data: shipment,
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2.5, color: SERIES[1].color },
        itemStyle: { color: SERIES[1].color },
      },
      {
        name: '医院流向',
        type: 'line',
        data: intake,
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2.5, color: SERIES[2].color },
        itemStyle: { color: SERIES[2].color },
      },
    ],
  };

  return <EChart option={option} />;
}
