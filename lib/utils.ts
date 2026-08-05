import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 健康状态中文映射 */
export const STATUS_LABEL: Record<string, string> = {
  healthy: '健康',
  warn: '预警',
  risk: '异常',
};

/** 风险类型中文映射 */
export const RISK_LABEL: Record<string, string> = {
  inventory: '库存积压',
  abnormal: '异常流向',
  decline: '销售下降',
};

/** 产品 code → 中文名 */
export const PRODUCT_LABEL: Record<string, string> = {
  ultrasound: '超声刀',
  stapler: '吻合器',
};
