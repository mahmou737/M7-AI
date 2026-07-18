import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@workspace/db";

const router: IRouter = Router();

// GET /conversations — list all, newest first
router.get("/", async (req, res) => {
  try {
    const conversations = await db
      .select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.updatedAt));
    res.json(conversations);
  } catch (err) {
    req.log.error({ err }, "listConversations error");
    res.status(500).json({ error: "فشل جلب المحادثات" });
  }
});

// POST /conversations — create new
router.post("/", async (req, res) => {
  try {
    const [conv] = await db
      .insert(conversationsTable)
      .values({ title: "محادثة جديدة" })
      .returning();
    res.json(conv);
  } catch (err) {
    req.log.error({ err }, "createConversation error");
    res.status(500).json({ error: "فشل إنشاء المحادثة" });
  }
});

// DELETE /conversations/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .delete(conversationsTable)
      .where(eq(conversationsTable.id, id))
      .returning();
    if (result.length === 0) {
      res.status(404).json({ error: "المحادثة غير موجودة" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "deleteConversation error");
    res.status(500).json({ error: "فشل حذف المحادثة" });
  }
});

// PATCH /conversations/:id — update title
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body as { title: string };
    if (!title?.trim()) {
      res.status(400).json({ error: "العنوان مطلوب" });
      return;
    }
    const [updated] = await db
      .update(conversationsTable)
      .set({ title: title.trim(), updatedAt: new Date() })
      .where(eq(conversationsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "المحادثة غير موجودة" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "updateConversation error");
    res.status(500).json({ error: "فشل تحديث المحادثة" });
  }
});

// GET /conversations/:id/messages
router.get("/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    if (!conv) {
      res.status(404).json({ error: "المحادثة غير موجودة" });
      return;
    }
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(asc(messagesTable.createdAt));
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "getConversationMessages error");
    res.status(500).json({ error: "فشل جلب الرسائل" });
  }
});

export default router;
