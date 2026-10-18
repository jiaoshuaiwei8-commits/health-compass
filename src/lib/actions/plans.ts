"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { checkins, planTasks, plans } from "@/db/schema";
import { getBool, getString } from "@/lib/actions/parse";
import { requireUser } from "@/lib/auth/require-user";
import { toDateKey } from "@/lib/utils";

export async function toggleCheckinAction(formData: FormData) {
  const user = await requireUser("/plan");
  const taskId = getString(formData, "task_id");
  const done = getBool(formData, "done");
  if (!taskId) redirect("/plan");

  const db = await getDb();
  const [owned] = await db
    .select({ taskId: planTasks.id })
    .from(planTasks)
    .innerJoin(plans, eq(plans.id, planTasks.planId))
    .where(and(eq(planTasks.id, taskId), eq(plans.userId, user.id)))
    .limit(1);

  if (!owned) redirect("/plan");

  if (done) {
    await db
      .insert(checkins)
      .values({
        userId: user.id,
        planTaskId: taskId,
        checkedOn: toDateKey(),
        done: true,
      })
      .onConflictDoUpdate({
        target: checkins.planTaskId,
        set: { done: true, checkedOn: toDateKey() },
      });
  } else {
    await db.delete(checkins).where(eq(checkins.planTaskId, taskId));
  }

  revalidatePath("/plan");
  revalidatePath("/review");
  redirect("/plan");
}
