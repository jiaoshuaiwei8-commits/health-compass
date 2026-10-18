import { getCurrentUser } from "@/lib/auth/session";
import { getExportBundle } from "@/lib/data";
import { toDateKey } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const bundle = await getExportBundle(user.id);
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="health-compass-${toDateKey()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
