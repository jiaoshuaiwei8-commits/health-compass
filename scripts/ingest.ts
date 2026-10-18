import "./load-env";
import { closeDatabase } from "../src/db/client";
import { ingestKnowledge } from "../src/lib/knowledge/ingest";

async function main() {
  const force = process.argv.includes("--force");
  const result = await ingestKnowledge({ force });
  console.log(
    `完成：处理 ${result.documents} 个文档，写入 ${result.chunks} 个片段。` +
      (process.env.EMBEDDING_PROVIDER === "bailian" ? "" : "（本地哈希向量模式）"),
  );
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error("知识库入库失败：", error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
