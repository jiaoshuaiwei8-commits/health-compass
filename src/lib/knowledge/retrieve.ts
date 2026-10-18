import { ensureDatabase, toVectorLiteral } from "@/db/client";
import type { RetrievedChunk } from "@/lib/types";
import { embedTexts } from "@/lib/ai/embeddings";

interface VectorRow {
  id: string;
  title: string;
  section_path: string;
  content: string;
  similarity: number;
}

interface KeywordRow {
  id: string;
  title: string;
  section_path: string;
  content: string;
}

export interface RetrieveOptions {
  query: string;
  keywords?: string[];
  k?: number;
}

function keywordScore(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  let hits = 0;
  for (const keyword of keywords) {
    if (keyword.length >= 2 && content.includes(keyword)) hits += 1;
  }
  return Math.min(0.3, hits * 0.08);
}

export async function retrieveChunks(options: RetrieveOptions): Promise<RetrievedChunk[]> {
  const { query, keywords = [], k = 6 } = options;
  const bundle = await ensureDatabase();
  const merged = new Map<string, RetrievedChunk>();

  try {
    const [embedding] = await embedTexts([query]);
    const rows = await bundle.query<VectorRow>(
      `SELECT c.id, d.title, c.section_path, c.content,
              1 - (c.embedding <=> $1::vector) AS similarity
       FROM kb_chunks c
       JOIN kb_docs d ON d.id = c.doc_id
       WHERE c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      [toVectorLiteral(embedding), k * 3],
    );
    for (const row of rows) {
      merged.set(row.id, {
        chunkId: row.id,
        docTitle: row.title,
        sectionPath: row.section_path,
        content: row.content,
        score: Number(row.similarity) + keywordScore(row.content, keywords),
      });
    }
  } catch (error) {
    console.warn("[retrieve] 向量检索失败，降级为关键词检索", error);
  }

  if (merged.size < k) {
    const terms = keywords.filter((term) => term.trim().length >= 2).slice(0, 5);
    if (terms.length > 0) {
      const conditions = terms
        .map((_, index) => `(c.content ILIKE $${index + 1} OR c.section_path ILIKE $${index + 1})`)
        .join(" OR ");
      const params = terms.map((term) => `%${term}%`);
      try {
        const rows = await bundle.query<KeywordRow>(
          `SELECT c.id, d.title, c.section_path, c.content
           FROM kb_chunks c
           JOIN kb_docs d ON d.id = c.doc_id
           WHERE ${conditions}
           LIMIT $${terms.length + 1}`,
          [...params, k * 2],
        );
        for (const row of rows) {
          const existing = merged.get(row.id);
          const score = 0.35 + keywordScore(row.content, keywords);
          if (!existing || existing.score < score) {
            merged.set(row.id, {
              chunkId: row.id,
              docTitle: row.title,
              sectionPath: row.section_path,
              content: row.content,
              score,
            });
          }
        }
      } catch (error) {
        console.warn("[retrieve] 关键词检索失败", error);
      }
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, k);
}

export async function knowledgeBaseStats() {
  const bundle = await ensureDatabase();
  const [row] = await bundle.query<{ docs: number; chunks: number }>(
    `SELECT (SELECT COUNT(*) FROM kb_docs)::int AS docs,
            (SELECT COUNT(*) FROM kb_chunks)::int AS chunks`,
  );
  return row ?? { docs: 0, chunks: 0 };
}
