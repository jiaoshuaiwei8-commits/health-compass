import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { ensureDatabase, toVectorLiteral } from "@/db/client";
import { kbDocs } from "@/db/schema";
import { embedTexts } from "@/lib/ai/embeddings";

export interface ParsedDocument {
  slug: string;
  title: string;
  publisher: string | null;
  year: number | null;
  url: string | null;
  edition: string | null;
  body: string;
  hash: string;
}

export interface ChunkDraft {
  sectionPath: string;
  content: string;
}

export function parseDocument(raw: string, fallbackSlug: string): ParsedDocument {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  const frontmatter: Record<string, string> = {};
  let body = normalized;

  if (match) {
    body = normalized.slice(match[0].length);
    for (const line of match[1].split("\n")) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key) frontmatter[key] = value;
    }
  }

  return {
    slug: frontmatter.slug || fallbackSlug,
    title: frontmatter.title || fallbackSlug,
    publisher: frontmatter.publisher || null,
    year: frontmatter.year ? Number(frontmatter.year) : null,
    url: frontmatter.url || null,
    edition: frontmatter.edition || null,
    body: body.trim(),
    hash: createHash("sha256").update(normalized).digest("hex"),
  };
}

/**
 * 按标题层级切块，保留章节路径；块内合并相邻段落，目标 450-800 字。
 */
export function chunkDocument(doc: ParsedDocument): ChunkDraft[] {
  const lines = doc.body.split("\n");
  const chunks: ChunkDraft[] = [];
  const headingStack: { level: number; text: string }[] = [];
  let buffer: string[] = [];
  let bufferSection = doc.title;

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content.length < 30) {
      buffer = [];
      return;
    }
    chunks.push({
      sectionPath: bufferSection,
      content: `${bufferSection}\n${content}`.trim(),
    });
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush();
      const level = heading[1].length;
      const text = heading[2].replace(/#+$/, "").trim();
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, text });
      bufferSection = headingStack.map((item) => item.text).join(" / ");
      buffer.push(`## ${text}`);
      continue;
    }

    buffer.push(line);
    if (buffer.join("\n").length > 800) {
      flush();
    }
  }
  flush();

  return chunks.filter((chunk) => chunk.content.length >= 40);
}

async function ingestFile(filePath: string, force: boolean, log: (message: string) => void) {
  const raw = await readFile(filePath, "utf8");
  const fallbackSlug = path.basename(filePath, ".md");
  const doc = parseDocument(raw, fallbackSlug);
  const chunks = chunkDocument(doc);
  const bundle = await ensureDatabase();
  const db = bundle.db;

  const [existing] = await db.select().from(kbDocs).where(eq(kbDocs.slug, doc.slug)).limit(1);
  if (existing && existing.contentHash === doc.hash && !force) {
    log(`跳过（内容未变）：${doc.title}`);
    return 0;
  }

  let docId: string;
  if (existing) {
    docId = existing.id;
    await db
      .update(kbDocs)
      .set({
        title: doc.title,
        publisher: doc.publisher,
        publishedYear: doc.year,
        url: doc.url,
        edition: doc.edition,
        contentHash: doc.hash,
        ingestedAt: new Date(),
      })
      .where(eq(kbDocs.id, docId));
    await bundle.query(`DELETE FROM kb_chunks WHERE doc_id = $1`, [docId]);
  } else {
    const [inserted] = await db
      .insert(kbDocs)
      .values({
        slug: doc.slug,
        title: doc.title,
        publisher: doc.publisher,
        publishedYear: doc.year,
        url: doc.url,
        edition: doc.edition,
        contentHash: doc.hash,
        ingestedAt: new Date(),
      })
      .returning({ id: kbDocs.id });
    docId = inserted.id;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const vector = embeddings[i];
    await bundle.query(
      `INSERT INTO kb_chunks (doc_id, chunk_index, section_path, content, embedding, token_estimate)
       VALUES ($1, $2, $3, $4, $5::vector, $6)`,
      [
        docId,
        i,
        chunk.sectionPath,
        chunk.content,
        toVectorLiteral(vector),
        Math.round(chunk.content.length / 1.6),
      ],
    );
  }

  log(`已入库：${doc.title}（${chunks.length} 块）`);
  return chunks.length;
}

export async function ingestKnowledge(options: { force?: boolean; dir?: string; log?: (msg: string) => void } = {}) {
  const { force = false, dir = path.resolve(process.cwd(), "content/knowledge") } = options;
  const log = options.log ?? ((message: string) => console.log(message));
  await ensureDatabase();
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md")).sort();
  let total = 0;
  for (const file of files) {
    total += await ingestFile(path.join(dir, file), force, log);
  }
  log(`知识库更新完成，共写入 ${total} 个片段。`);
  return { documents: files.length, chunks: total };
}
