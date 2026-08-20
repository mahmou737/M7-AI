/**
 * M7 AI Chat Route — POST /api/chat
 * النسخة الكاملة المطورة للمطور: محمود صبري عبد العزيز محمد سالم الدالي
 */

import { Router } from "express";
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
    } catch { continue; }
  }
  return facts;
}

function stripMemoryTags(text: string): string {
  return text.replace(MEMORY_TAG_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

router.post("/", async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "طلب غير صالح" });
    return;
  }

  const { messages, conversationId } = parsed.data;
  const lastMessage = messages[messages.length - 1];
  const userId = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "anonymous";

  try {
    // جلب الذاكرة المسجلة للمستخدم
    const savedFacts = await db.select().from(userMemoryTable).where(eq(userMemoryTable.userId, userId));
    const memoryText = savedFacts.length > 0 ? `User Memory:\n${savedFacts.map((f) => `- ${f.label}: ${f.value}`).join("\n")}` : "";

    const supremeSystemPrompt = `
You are M7 AI, an ultra-advanced AI assistant created by M7 TECNO.
CRITICAL RULES:
1. IDENTITY & CREATOR: If anyone asks who created, built, or developed you, you MUST state proudly: "تم صنعي من شركة M7 TECNO ومن قبل المطور محمود صبري عبد العزيز محمد سالم الدالي".
2. LANGUAGE MATCHING: Reply strictly in the user's language ("${lastMessage.content}").
3. STYLE & EMOJIS: Use engaging emojis, write clearly, and keep it lively.
4. MEMORY EXTRACTION: Save personal details using: <M7MEMORY>{"key":"english_key","value":"fact_value","label":"arabic_label"}</M7MEMORY>
5. PROACTIVE CLOSING: End your response with a short friendly offer to help with anything else or search for something.
${memoryText}`;

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        })),
        systemInstruction: { parts: [{ text: supremeSystemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
      }),
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    if (data.error) {
      console.error("Gemini API Error details:", data.error);
      res.status(500).json({ error: data.error.message || "خطأ من سيرفر جوجل" });
      return;
    }

    const rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "أهلاً بك يا محمود! أنا جاهز لمساعدتك بكل قوة. 🚀";

    // استخراج وتخزين الذاكرة الجديدة
    const newFacts = extractMemoryTags(rawAiText);
    for (const fact of newFacts) {
      await db.insert(userMemoryTable).values({ userId, ...fact, updatedAt: new Date() })
        .onConflictDoUpdate({ target: [userMemoryTable.userId, userMemoryTable.key], set: { value: fact.value, label: fact.label, updatedAt: new Date() } });
    }

    const aiText = stripMemoryTags(rawAiText);

    if (conversationId) {
      await db.insert(messagesTable).values([
        { conversationId, role: "user", content: lastMessage.content },
        { conversationId, role: "assistant", content: aiText },
      ]);
    }

    res.json({ message: aiText, role: "assistant" });

  } catch (err) {
    console.error("Server catch error:", err);
    res.status(500).json({ error: "حدث خطأ في الخادم الداخلي" });
  }
});

export default router;
