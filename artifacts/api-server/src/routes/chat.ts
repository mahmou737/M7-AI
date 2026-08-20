/**
 * M7 AI Chat Route — POST /api/chat
 * النسخة الكاملة المطورة للمطور: محمود صبري عبد العزيز محمد سالم الدالي
 * ✅ تم إصلاح مشكلة عدم الرد
 */

import { Router, Request } from "express";
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

router.post("/", async (req: Request, res) => {
  try {
    console.log("📨 Chat request received", {
      headers: req.headers,
      bodyKeys: Object.keys(req.body)
    });

    const parsed = SendMessageBody.safeParse(req.body);
    if (!parsed.success) {
      console.error("❌ Validation error:", parsed.error);
      res.status(400).json({ 
        error: "طلب غير صالح",
        details: parsed.error.errors
      });
      return;
    }

    const { messages, conversationId } = parsed.data;
    const lastMessage = messages[messages.length - 1];
    const userId = req.headers.authorization?.startsWith("Bearer ") 
      ? req.headers.authorization.slice(7) 
      : "anonymous";

    console.log("✅ Request parsed successfully:", {
      userId,
      messagesCount: messages.length,
      conversationId,
      lastMessagePreview: lastMessage.content.substring(0, 50)
    });

    // جلب الذاكرة المسجلة للمستخدم
    const savedFacts = await db
      .select()
      .from(userMemoryTable)
      .where(eq(userMemoryTable.userId, userId));
    
    console.log("📝 User memory facts:", savedFacts.length);

    const memoryText = savedFacts.length > 0 
      ? `User Memory:\n${savedFacts.map((f) => `- ${f.label}: ${f.value}`).join("\n")}` 
      : "";

    const supremeSystemPrompt = `You are M7 AI, an ultra-advanced AI assistant created by M7 TECNO.
CRITICAL RULES:
1. IDENTITY & CREATOR: If anyone asks who created, built, or developed you, you MUST state: "تم صنعي من شركة M7 TECNO ومن قبل المطور محمود صبري"
2. LANGUAGE MATCHING: Reply strictly in the same language as the user message
3. STYLE & EMOJIS: Use engaging emojis, write clearly, and keep it lively
4. MEMORY EXTRACTION: Save personal details using: <M7MEMORY>{"key":"english_key","value":"fact_value","label":"arabic_label"}</M7MEMORY>
5. PROACTIVE CLOSING: End your response with a short friendly offer to help or search for something
${memoryText}`;

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is not configured");
      res.status(500).json({ 
        error: "خطأ في التكوين: API key غير موجودة" 
      });
      return;
    }

    console.log("🔑 API Key configured, sending to Gemini...");

    const requestBody = {
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      systemInstruction: { 
        parts: [{ text: supremeSystemPrompt }] 
      },
      generationConfig: { 
        temperature: 0.7, 
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 64,
      },
    };

    console.log("📤 Sending to Gemini API with", messages.length, "messages");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("📬 Gemini API response status:", response.status);

    // Get response text first
    const responseText = await response.text();
    console.log("📦 Raw response:", responseText.substring(0, 200));

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText) as {
        error?: { message?: string; code?: number };
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
          finishReason?: string;
        }>;
      };
    } catch (parseError) {
      console.error("❌ JSON Parse error:", parseError);
      res.status(500).json({ 
        error: "خطأ في معالجة رد الذكاء الاصطناعي" 
      });
      return;
    }

    console.log("🔍 Parsed response:", {
      hasError: !!data.error,
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length,
      firstCandidateHasContent: !!data.candidates?.[0]?.content
    });

    // Check for errors
    if (data.error) {
      console.error("❌ Gemini API Error:", data.error);
      res.status(500).json({ 
        error: data.error.message || "خطأ من سيرفر جوجل" 
      });
      return;
    }

    // Check if response is ok but has no content
    if (!response.ok) {
      console.error("❌ HTTP Error:", response.status, response.statusText);
      res.status(500).json({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      });
      return;
    }

    // Extract text from candidates
    const rawAiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!rawAiText) {
      console.error("❌ No text found in response");
      console.error("Full response structure:", JSON.stringify(data, null, 2));
      res.status(500).json({ 
        error: "لم يتمكن الذكاء الاصطناعي من توليد رد" 
      });
      return;
    }

    console.log("✅ AI Response received:", rawAiText.substring(0, 100) + "...");

    // استخراج وتخزين الذاكرة الجديدة
    const newFacts = extractMemoryTags(rawAiText);
    console.log("💾 Storing", newFacts.length, "new memory facts");
    
    for (const fact of newFacts) {
      await db
        .insert(userMemoryTable)
        .values({ 
          userId, 
          ...fact, 
          updatedAt: new Date() 
        })
        .onConflictDoUpdate({ 
          target: [userMemoryTable.userId, userMemoryTable.key], 
          set: { 
            value: fact.value, 
            label: fact.label, 
            updatedAt: new Date() 
          } 
        });
    }

    const aiText = stripMemoryTags(rawAiText);

    // Save conversation if provided
    if (conversationId) {
      console.log("💬 Saving to conversation:", conversationId);
      await db.insert(messagesTable).values([
        { conversationId, role: "user", content: lastMessage.content },
        { conversationId, role: "assistant", content: aiText },
      ]);
    }

    console.log("✅ Sending response to client");
    res.json({ message: aiText, role: "assistant" });

  } catch (err) {
    console.error("💥 Server error:", err);
    const errorMessage = err instanceof Error ? err.message : "حدث خطأ في الخادم الداخلي";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
