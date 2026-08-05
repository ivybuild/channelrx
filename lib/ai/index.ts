// ============================================================
// DeepSeek AI 封装（阶段 5 使用）
// 职责边界：AI 只负责「总结 / 解释 / 建议」，不参与任何数值计算。
// ============================================================

const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

export interface DeepSeekInput {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 调用 DeepSeek Chat Completions。
 * 所有计算结论（评分、风险）必须先在代码中算好，再以文本喂给模型，模型只做语言组织。
 */
export async function callDeepSeek(input: DeepSeekInput): Promise<string> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置');
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 1200,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API 错误 ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}
