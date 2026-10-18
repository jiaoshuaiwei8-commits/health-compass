import type { z } from "zod";

export interface ChatJsonOptions<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  temperature?: number;
}

export class LlmError extends Error {
  constructor(message: string, readonly raw?: string) {
    super(message);
    this.name = "LlmError";
  }
}

export function llmEnabled(): boolean {
  return process.env.AI_PROVIDER === "deepseek" && Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export function llmModel(): string {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return candidate;
  return candidate.slice(start, end + 1);
}

async function callOnce<T>(options: ChatJsonOptions<T>, extraHint?: string): Promise<T> {
  const base = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: llmModel(),
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        {
          role: "user",
          content: extraHint ? `${options.user}\n\n上一次输出不符合要求：${extraHint}\n请重新输出严格合法的 JSON。` : options.user,
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new LlmError(`模型请求失败（${response.status}）：${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new LlmError("模型未返回内容");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new LlmError("模型返回的不是合法 JSON", content.slice(0, 500));
  }

  const result = options.schema.safeParse(parsed);
  if (!result.success) {
    throw new LlmError(`模型输出结构不符合要求：${result.error.issues[0]?.message ?? "未知字段"}`, content.slice(0, 500));
  }
  return result.data;
}

export async function chatJson<T>(options: ChatJsonOptions<T>): Promise<T> {
  try {
    return await callOnce(options);
  } catch (error) {
    const hint = error instanceof LlmError ? error.message : String(error);
    return await callOnce(options, hint);
  }
}
