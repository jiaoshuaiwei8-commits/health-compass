import "./load-env";
import { closeDatabase, ensureDatabase } from "../src/db/client";

async function main() {
  const bundle = await ensureDatabase();
  console.log(`数据库已就绪（${bundle.dialect}），表结构已是最新。`);
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error("迁移失败：", error);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
