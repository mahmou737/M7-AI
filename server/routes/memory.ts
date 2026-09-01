import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userMemoryTable } from "@workspace/db";

const router: IRouter = Router();

function getUserAuth(req: any): { userId: string; plan: "free" | "pro" } {
  const auth = req.headers.authorization;
  const headerPlan = req.headers["x-user-plan"];
  let userId = "anonymous";
  let plan: "free" | "pro" = headerPlan === "pro" ? "pro" : "free";

  if (auth?.startsWith("Bearer ") && auth.length > 7) {
    const raw = decodeURIComponent(auth.slice(7));
    if (raw.includes(":")) {
      const parts = raw.split(":");
      userId = parts[0] || "anonymous";
      if (parts[1] === "pro") plan = "pro";
    } else {
      userId = raw;
    }
  }

  if (req.body?.userPlan === "pro") {
    plan = "pro";
  }

  return { userId, plan };
}

// ── GET /memory ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { userId, plan } = getUserAuth(req);
  try {
    const limit = plan === "pro" ? 1000 : 100;
    const facts = await db
      .select()
      .from(userMemoryTable)
      .where(eq(userMemoryTable.userId, userId))
      .orderBy(userMemoryTable.key)
      .limit(limit);
    res.json(facts);
  } catch (err) {
    console.error("listMemory error:", err);
    res.status(500).json({ error: "فشل جلب الذاكرة" });
  }
});

// ── POST /memory ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { userId, plan } = getUserAuth(req);
  const { key, value, label } = req.body as {
    key?: string;
    value?: string;
    label?: string;
  };

  if (!key?.trim() || !value?.trim() || !label?.trim()) {
    res.status(400).json({ error: "الحقول key و value و label مطلوبة" });
    return;
  }

  try {
    // Check tier limits: 100 facts for Free, 1000 for PRO
    const maxFacts = plan === "pro" ? 1000 : 100;
    const existing = await db
      .select()
      .from(userMemoryTable)
      .where(eq(userMemoryTable.userId, userId));

    const isUpdatingExistingKey = existing.some((f) => f.key === key.trim());

    if (!isUpdatingExistingKey && existing.length >= maxFacts) {
      const errorMsg =
        plan === "pro"
          ? "وصلت للحد الأقصى للذاكرة في باقة PRO (1000 معلومة)."
          : "وصلت للحد الأقصى للذاكرة في الباقة المجانية (100 معلومة). يرجى الترقية إلى باقة PRO لزيادة السعة إلى 1000 معلومة!";
      res.status(403).json({
        error: errorMsg,
        limitReached: true,
        currentCount: existing.length,
        maxLimit: maxFacts,
      });
      return;
    }

    const [fact] = await db
      .insert(userMemoryTable)
      .values({
        userId,
        key: key.trim(),
        value: value.trim(),
        label: label.trim(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userMemoryTable.userId, userMemoryTable.key],
        set: { value: value.trim(), label: label.trim(), updatedAt: new Date() },
      })
      .returning();
    res.json(fact);
  } catch (err) {
    console.error("upsertMemory error:", err);
    res.status(500).json({ error: "فشل حفظ المعلومة" });
  }
});

// ── DELETE /memory/:key ──────────────────────────────────────────────────────
router.delete("/:key", async (req, res) => {
  const { userId } = getUserAuth(req);
  try {
    const result = await db
      .delete(userMemoryTable)
      .where(
        and(
          eq(userMemoryTable.userId, userId),
          eq(userMemoryTable.key, req.params.key)
        )
      )
      .returning();
    if (result.length === 0) {
      res.status(404).json({ error: "المعلومة غير موجودة" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("deleteMemory error:", err);
    res.status(500).json({ error: "فشل حذف المعلومة" });
  }
});

export default router;
