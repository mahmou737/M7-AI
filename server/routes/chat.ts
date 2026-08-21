/**
 * M7 AI Chat Route — POST /api/chat
 * المساعد الذكي M7 AI باستخدام @google/genai SDK
 */

import { Router, Request } from "express";
import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import {
  db,
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

function stripMemoryTags(text: string): string {
  return text.replace(MEMORY_TAG_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

router.post("/", async (req: Request, res) => {
  try {
    const parsed = SendMessageBody.safeParse(req.body);
    if (!parsed.success) {
      console.error("❌ Validation error:", parsed.error);
      res.status(400).json({
        error: "طلب غير صالح",
        details: parsed.error.errors,
      });
      return;
    }

    const { messages, conversationId } = parsed.data;
    const lastMessage = messages[messages.length - 1];
    const userId = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : "anonymous";

    // جلب الذاكرة المسجلة للمستخدم
    let savedFacts: any[] = [];
    try {
      savedFacts = await db
        .select()
        .from(userMemoryTable)
        .where(eq(userMemoryTable.userId, userId));
    } catch (e) {
      console.warn("Could not query userMemoryTable:", e);
    }

    const memoryText =
      savedFacts.length > 0
        ? `User Memory:\n${savedFacts.map((f: any) => `- ${f.label}: ${f.value}`).join("\n")}`
        : "";

    const supremeSystemPrompt = `You are M7 AI, an ultra-advanced, intelligent, friendly AI assistant created by M7 TECNO.
CRITICAL RULES:
1. IDENTITY & CREATOR: If asked who created, built, or developed you, you MUST state: "تم تطويري من شركة M7 TECNO ومن قبل المطور محمود صبري" (or in English if queried in English).
2. LANGUAGE MATCHING: Reply strictly in the same language as the user message (Arabic or English).
3. STYLE & EMOJIS: Use engaging emojis, write clearly, structure points nicely.
4. MEMORY EXTRACTION: When the user shares personal facts (name, job, favorite topic, preferences, etc.), include memory tags: <M7MEMORY>{"key":"english_key","value":"fact_value","label":"arabic_label"}</M7MEMORY>
5. PROACTIVE CLOSING: End with a short friendly offer to assist further.
${memoryText}`;

    const ai = getAiClient();
    let rawAiText = "";

    if (!ai) {
      // Fallback message when API key is not yet set
      rawAiText = "مرحباً بك في M7 AI! 🤖✨\n\nيبدو أن مفتاح Gemini API لم يتم تفعيله بعد. يمكنك تعيين `GEMINI_API_KEY` في إعدادات البيئة (Settings) لبدء المحادثة الكاملة مع النموذج الذكي.\n\nكيف يمكنني مساعدتك اليوم؟";
    } else {
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Candidate supported models
      const models = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-2.5-flash"];
      let success = false;
      let lastErr: any = null;

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: supremeSystemPrompt,
              temperature: 0.7,
            },
          });

          const text = response.text?.trim();
          if (text) {
            rawAiText = text;
            success = true;
            break;
          }
        } catch (e: any) {
          console.warn(`Gemini call with model ${model} failed:`, e?.message || e);
          lastErr = e;
        }
      }

      if (!success) {
        console.error("All Gemini API attempts failed:", lastErr);
        res.status(500).json({
          error: lastErr?.message || "تعذر الاتصال بخدمة Gemini. يرجى التحقق من مفتاح API.",
        });
        return;
      }
    }

    // استخراج وتخزين الذاكرة الجديدة
    const newFacts = extractMemoryTags(rawAiText);
    for (const fact of newFacts) {
      try {
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
      } catch (memErr) {
        console.warn("Could not save memory fact:", memErr);
      }
    }

    const aiText = stripMemoryTags(rawAiText);

    // Save conversation messages if conversationId is provided
    if (conversationId) {
      try {
        await db.insert(messagesTable).values([
          { conversationId, role: "user", content: lastMessage.content },
          { conversationId, role: "assistant", content: aiText },
        ]);
      } catch (dbErr) {
        console.warn("Could not persist messages:", dbErr);
      }
    }

    res.json({ message: aiText, role: "assistant" });
  } catch (err) {
    console.error("Server error in /api/chat:", err);
    const errorMessage =
      err instanceof Error ? err.message : "حدث خطأ في الخادم الداخلي";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
