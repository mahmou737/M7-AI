import { Router } from "express";
import { eq } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import { db, conversationsTable, messagesTable } from "@workspace/db";

const router = Router();

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

const SYSTEM_PROMPT =
  "أنت M7 AI، مساعد ذكاء اصطناعي متقدم يتحدث العربية بطلاقة. " +
  "تجيب بأسلوب واضح ومفيد وودي. استخدم العربية الفصحى البسيطة. " +
  "عند الحاجة للتعداد أو الخطوات، نظّمها بشكل جميل ومرتب. " +
  "لا تستخدم الإيموجي في ردودك.";

/** Derive a short title from the user's first message */
function deriveTitle(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
}

router.post("/", async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "طلب غير صالح" });
    return;
  }

  const { messages, conversationId } = parsed.data;

  // The last message is always the new user message
  const lastMessage = messages[messages.length - 1];

  try {
    // ── Call Pollinations AI ──────────────────────────────────────────────
    const response = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        seed: 42,
        private: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.error({ status: response.status, body: errText }, "Pollinations API error");
      res.status(500).json({ error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" });
      return;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const aiText = data.choices?.[0]?.message?.content ?? "";

    // ── Persist to DB if conversationId provided ──────────────────────────
    if (conversationId) {
      const isFirstMessage = messages.length === 1;

      await db.insert(messagesTable).values([
        { conversationId, role: "user", content: lastMessage.content },
        { conversationId, role: "assistant", content: aiText },
      ]);

      // Update conversation: bump updatedAt and set title from first message
      await db
        .update(conversationsTable)
        .set({
          updatedAt: new Date(),
          ...(isFirstMessage ? { title: deriveTitle(lastMessage.content) } : {}),
        })
        .where(eq(conversationsTable.id, conversationId));
    }

    res.json({ message: aiText, role: "assistant" });
  } catch (err) {
    req.log.error({ err }, "Chat route error");
    res.status(500).json({ error: "حدث خطأ أثناء معالجة طلبك" });
  }
});

export default router;
