import { existsSync } from "node:fs";

const candidates = [".env.local", ".env"];
for (const file of candidates) {
  if (!existsSync(file)) continue;
  try {
    process.loadEnvFile(file);
  } catch {
    // Node < 20.12 或文件格式异常时忽略，依赖进程环境变量
  }
}
