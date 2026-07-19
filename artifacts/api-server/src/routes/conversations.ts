import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@workspace/db";

const router: IRouter = Router();

/** Extract Firebase UID from Authorization header, fallback to 'anonymous'. */
function getUserId(req: Parameters<Parameters<IRouter["get"]>[1]>[0]): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ") && auth.length > 7) return auth.slice(7);
  return "anonymous";
}

// GET /conversations — list user's conversations, newest first
router.get("/", async (req, res) => {
  const userId = getUserId(req);
  try {
    const conversations = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, userId))
      .orderBy(desc(conversationsTable.updatedAt));
    res.json(conversations);
  } catch (err) {
    req.log.error({ err }, "listConversations error");
    res.status(500).json({ error: "فشل جلب المحادثات" });
  }
});

// POST /conversations — create new conversation for this user
router.post("/", async (req, res) => {
  const userId = getUserId(req);
  try {
    const [conv] = await db
      .insert(conversationsTable)
      .values({ userId, title: "محادثة جديدة" })
      .returning();
    res.json(conv);
  } catch (err) {
    req.log.error({ err }, "createConversation error");
    res.status(500).json({ error: "فشل إنشاء المحادثة" });
  }
});

// DELETE /conversations/:id
router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  try {
    const { id } = req.params;
    const result = await db
      .delete(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
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
  const userId = getUserId(req);
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
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
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
  const userId = getUserId(req);
  try {
    const { id } = req.params;
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
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
