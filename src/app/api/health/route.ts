import { ensureDatabase } from "@/db/client";

export async function GET() {
  try {
    const bundle = await ensureDatabase();
    await bundle.query("SELECT 1");
    return Response.json({ status: "ok", dialect: bundle.dialect });
  } catch (error) {
    return Response.json(
      { status: "error", message: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
