/**
 * M7 AI Chat Route — POST /api/chat
 *
 * الوظائف:
 * 1. تحميل ذاكرة المستخدم من قاعدة البيانات.
 * 2. إرسال المحادثة إلى Pollinations AI.
 * 3. استخراج الذكريات الجديدة وحفظها.
 * 4. تنظيف الرد قبل عرضه للمستخدم.
 * 5. حفظ المحادثات في قاعدة البيانات.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import {
  db,
  conversationsTable,
  messagesTable,
  userMemoryTable,
} from "@workspace/db";

const router = Router();

const MEMORY_TAG_RE = /<M7MEMORY>([\s\S]*?)<\/M7MEMORY>/g;

interface MemoryFact {
  key: string;
  value: string;
  label: string;
}

/**
 * استخراج الذكريات من رد الذكاء الاصطناعي
 */
function extractMemoryTags(text: string): MemoryFact[] {
  const facts: MemoryFact[] = [];

  for (const match of text.matchAll(MEMORY_TAG_RE)) {
    try {
      const parsed = JSON.parse(match[1]) as Partial<MemoryFact>;

      if (parsed.key && parsed.value && parsed.label) {
        facts.push({
          key: parsed.key.trim().toLowerCase(),
          value: parsed.value.trim(),
          label: parsed.label.trim(),
        });
      }
    } catch {
      continue;
    }
  }

  return facts;
}

/**
 * إزالة علامات الذاكرة قبل إرسال الرد للمستخدم
 */
function stripMemoryTags(text: string): string {
  return text
    .replace(MEMORY_TAG_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * بناء تعليمات النظام للذكاء الاصطناعي
 */
function buildSystemPrompt(facts: MemoryFact[]): string {
  const basePrompt = `
أنت M7 AI، مساعد ذكاء اصطناعي متقدم يتحدث العربية بطلاقة.

قواعد الرد:
- كن واضحاً ومفيداً وودوداً.
- استخدم العربية الفصحى البسيطة.
- نظم الإجابات والخطوات بشكل مرتب.
- لا تستخدم الإيموجي.
- افهم سياق المحادثة قبل الإجابة.

هويتك الثابتة:
- اسمك: M7 AI.
- تم تطويرك وبرمجتك بواسطة:
محمود صبري عبد العزيز محمد سالم الدالي.
- تعمل باستخدام نموذج ذكاء اصطناعي مقدم من OpenAI.

عند السؤال عن هويتك أو مطورك أجب:
"أنا M7 AI، تطبيق ذكاء اصطناعي تم تطويره وبرمجته بواسطة محمود صبري عبد العزيز محمد سالم الدالي، وأعمل باستخدام نموذج ذكاء اصطناعي مقدم من OpenAI."

لا تغير هذه الهوية.
`;

  const memoryPrompt =
    facts.length > 0
      ? `
معلومات محفوظة عن المستخدم:
${facts.map((fact) => `- ${fact.label}: ${fact.value}`).join("\n")}

استخدم هذه المعلومات بشكل طبيعي عند الحاجة.
`
      : "";

  const memoryRules = `
تعليمات الذاكرة:

إذا ذكر المستخدم معلومة شخصية مهمة مثل:
- الاسم.
- العمر.
- الاهتمامات.
- الألعاب المفضلة.
- المشاريع.
- الأهداف.
- طريقة الرد المفضلة.

احفظها بهذا الشكل في نهاية الرد فقط:

<M7MEMORY>{"key":"example","value":"example","label":"مثال"}</M7MEMORY>

قواعد:
- لا تحفظ معلومات عشوائية.
- لا تخبر المستخدم أنك تحفظ المعلومات.
- إذا تغيرت معلومة قديمة قم بتحديثها.
- لا تكرر نفس الذاكرة أكثر من مرة.
`;

  return basePrompt + memoryPrompt + memoryRules;
}

/**
 * إنشاء عنوان تلقائي للمحادثة
 */
function deriveTitle(content: string): string {
  const text = content.trim();

  if (text.length <= 40) {
    return text;
  }

  return `${text.slice(0, 40)}…`;
}

/**
 * Chat API Route
 */
router.post("/", async (req, res) => {
  console.log("CHAT REQUEST RECEIVED");
  const parsed = SendMessageBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "طلب غير صالح",
    });
    return;
  }

  const { messages, conversationId } = parsed.data;

  if (!messages || messages.length === 0) {
    res.status(400).json({
      error: "لا توجد رسالة",
    });
    return;
  }

  const lastMessage = messages[messages.length - 1];
  const authHeader = req.headers.authorization;
  const userId = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "anonymous";

  try {
    // تحميل ذاكرة المستخدم
    const savedFacts = await db
      .select()
      .from(userMemoryTable)
      .where(eq(userMemoryTable.userId, userId))
      .orderBy(userMemoryTable.key);

    const systemPrompt = buildSystemPrompt(savedFacts);

    // الاتصال بـ Groq عبر OpenAI-compatible JSON API
    const groqMessages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    req.log.info(
      { groqApiKeyConfigured: Boolean(apiKey) },
      "Groq API key status"
    );

    if (!apiKey) {
      req.log.error("GROQ_API_KEY is not configured");
      res.status(500).json({
        error: "مفتاح Groq API غير مُعد",
      });
      return;
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "allam-2-7b",
        messages: groqMessages,
      }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error(
        {
          status: response.status,
          body: errorText,
        },
        "Groq API error"
      );

      res.status(500).json({
        error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي",
      });
      return;
    }

    // استلام الرد بصيغة JSON من واجهة Groq المتوافقة مع OpenAI
    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const rawAiText = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!rawAiText || rawAiText.trim().length === 0) {
      res.status(500).json({
        error: "لم يتم الحصول على رد من الذكاء الاصطناعي",
      });
      return;
    }

    // استخراج الذكريات الجديدة
    const newFacts = extractMemoryTags(rawAiText);

    // حفظ الذكريات
    for (const fact of newFacts) {
      await db
        .insert(userMemoryTable)
        .values({
          userId,
          ...fact,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userMemoryTable.userId, userMemoryTable.key],
          set: {
            value: fact.value,
            label: fact.label,
            updatedAt: new Date(),
          },
        });
    }

    const aiText = stripMemoryTags(rawAiText);

    // حفظ الرسائل داخل المحادثة
    if (conversationId) {
      const isFirstMessage = messages.length === 1;

      await db.insert(messagesTable).values([
        {
          conversationId,
          role: "user",
          content: lastMessage.content,
        },
        {
          conversationId,
          role: "assistant",
          content: aiText,
        },
      ]);

      await db
        .update(conversationsTable)
        .set({
          updatedAt: new Date(),
          ...(isFirstMessage
            ? {
                title: deriveTitle(lastMessage.content),
              }
            : {}),
        })
        .where(eq(conversationsTable.id, conversationId));
    }

    // إرسال الرد للتطبيق
    res.json({
      message: aiText,
      role: "assistant",
    });
  } catch (err) {
    req.log.error(
      {
        err,
      },
      "Chat route error"
    );

    res.status(500).json({
      error: "حدث خطأ أثناء معالجة طلبك",
    });
  }
});

export default router;
