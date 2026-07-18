/**
 * Memory Routes — /api/memory
 *
 * Stores persistent user facts (name, city, age, …).
 * The chat route reads these facts on every request and injects them into
 * the system prompt so the AI always "remembers" the user.
 *
 * Endpoints:
 *   GET    /memory          — list all facts
 *   POST   /memory          — create or update a fact (upsert by key)
 *   DELETE /memory/:key     — remove a fact
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userMemoryTable } from "@workspace/db";

const router: IRouter = Router();

// ── GET /memory ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const facts = await db
      .select()
      .from(userMemoryTable)
      .orderBy(userMemoryTable.key);
    res.json(facts);
  } catch (err) {
    req.log.error({ err }, "listMemory error");
    res.status(500).json({ error: "فشل جلب الذاكرة" });
  }
});

// ── POST /memory ─────────────────────────────────────────────────────────────
// Creates or updates (upserts) a fact identified by its key.
router.post("/", async (req, res) => {
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
      .values({ key: key.trim(), value: value.trim(), label: label.trim(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userMemoryTable.key,
        set: { value: value.trim(), label: label.trim(), updatedAt: new Date() },
      })
      .returning();
    res.json(fact);
  } catch (err) {
    req.log.error({ err }, "upsertMemory error");
    res.status(500).json({ error: "فشل حفظ المعلومة" });
  }
});

// ── DELETE /memory/:key ──────────────────────────────────────────────────────
router.delete("/:key", async (req, res) => {
  try {
    const result = await db
      .delete(userMemoryTable)
      .where(eq(userMemoryTable.key, req.params.key))
      .returning();
    if (result.length === 0) {
      res.status(404).json({ error: "المعلومة غير موجودة" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteMemory error");
    res.status(500).json({ error: "فشل حذف المعلومة" });
  }
});

export default router;
