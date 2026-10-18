export const EMBEDDING_DIMENSIONS = 1024;

/**
 * 本地哈希向量：把中文单字/二元组与英文词映射到固定维度。
 * 不依赖网络，语义能力弱于神经向量，但足以支撑关键词级别的检索，
 * 适合作为开发默认值与线上故障时的降级方案。
 */
export function hashEmbedding(text: string): number[] {
  const vector = new Float32Array(EMBEDDING_DIMENSIONS);
  const normalized = text.toLowerCase();

  const hanChars = Array.from(normalized).filter((char) => /\p{Script=Han}/u.test(char));
  for (let i = 0; i < hanChars.length; i += 1) {
    addToken(vector, hanChars[i], 1);
    if (i + 1 < hanChars.length) {
      addToken(vector, `${hanChars[i]}${hanChars[i + 1]}`, 2);
    }
  }

  for (const word of normalized.match(/[a-z0-9]+/g) ?? []) {
    addToken(vector, word, 1.2);
  }

  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vector, (value) => value / norm);
}

function addToken(vector: Float32Array, token: string, weight: number) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  const index = unsigned % EMBEDDING_DIMENSIONS;
  const sign = (unsigned >>> 16) & 1 ? 1 : -1;
  vector[index] += sign * weight;
}

export function isNeuralEmbeddingEnabled(): boolean {
  return (
    process.env.EMBEDDING_PROVIDER === "bailian" &&
    Boolean(process.env.DASHSCOPE_API_KEY?.trim())
  );
}

async function embedWithBailian(texts: string[]): Promise<number[][]> {
  const base = (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = process.env.EMBEDDING_MODEL || "text-embedding-v4";
  const response = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: "float",
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding 请求失败（${response.status}）：${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    data?: { embedding: number[]; index: number }[];
  };
  if (!data.data?.length) throw new Error("Embedding 返回为空");
  return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!isNeuralEmbeddingEnabled()) return texts.map(hashEmbedding);

  const results: number[][] = [];
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    results.push(...(await embedWithBailian(batch)));
  }
  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
