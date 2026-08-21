import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userMemoryTable } from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: any): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ") && auth.length > 7) return auth.slice(7);
  return "anonymous";
}

// ── GET /memory ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  try {
    const facts = await db
      .select()
      .from(userMemoryTable)
      .where(eq(userMemoryTable.userId, userId))
      .orderBy(userMemoryTable.key);
    res.json(facts);
  } catch (err) {
    console.error("listMemory error:", err);
    res.status(500).json({ error: "فشل جلب الذاكرة" });
  }
});

// ── POST /memory ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const userId = getUserId(req);
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
  const userId = getUserId(req);
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
