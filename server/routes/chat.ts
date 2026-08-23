/**
 * M7 AI Chat Route — POST /api/chat
 * المساعد الذكي M7 AI باستخدام @google/genai SDK
 * يدعم المحادثة الفورية، البحث الحي في الويب، وتوليد الصور عالي الدقة
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

interface LiveSearchResult {
  title: string;
  uri: string;
  snippet: string;
  domain: string;
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

/**
 * دالة مساعدة لترجمة وتحسين أمر توليد الصورة للغة الإنجليزية
 * لضمان فهم محرك التوليد (FLUX / Diffusion) للشكل المطلوب بدقة 100%
 */
async function buildHighQualityImagePrompt(userPrompt: string, ai: GoogleGenAI | null): Promise<string> {
  const clean = userPrompt
    .replace(/^(اصنع|أنشئ|انشئ|ولد|ولّد|صمم|ارسم|اعمل|أعمل|وهات|هات|عايز\s+صورة|أريد\s+صورة|بدي\s+صورة|صورة\s+لـ|صورة\s+عن|صورة\s+ل|صورة|توليد\s+صورة|generate\s+an?\s+image|create\s+an?\s+image|draw\s+an?\s+image|paint\s+an?\s+image|image\s+of|picture\s+of)\s*/i, "")
    .replace(/(صورة|image|picture|photo)\s*/gi, "")
    .trim();

  const targetSubject = clean || userPrompt;

  // 1. محاولة استخدام نموذج Gemini السريع لصياغة Prompt إنجليزي فائق التفاصيل
  if (ai) {
    try {
      const transRes = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Translate and expand this subject into an ultra-detailed, cinematic, photorealistic English text-to-image prompt for FLUX diffusion model. Focus on the main subject, setting, lighting, 8k resolution. Output ONLY the English prompt (max 30 words), no intro, no quotes:\n\nSubject: "${targetSubject}"`,
        config: {
          temperature: 0.3,
        },
      });
      const generatedPrompt = transRes.text?.replace(/["'`]/g, "").trim();
      if (generatedPrompt && generatedPrompt.length > 8 && !/[ء-ي]/.test(generatedPrompt)) {
        return generatedPrompt;
      }
    } catch {
      // Continue to dictionary fallback
    }
  }

  // 2. قاموس ذكي شامل للكلمات العربية الشائعة لضمان التوليد الدقيق في حال عدم توفر الترجمة الفورية
  const AR_EN_MAP: Record<string, string> = {
    "حوت": "a majestic giant blue whale swimming in deep crystal clear ocean water with sunbeams",
    "حوت ازرق": "a majestic giant blue whale swimming in deep ocean",
    "اسد": "a majestic male lion with glorious mane in the golden savanna",
    "أسد": "a majestic male lion with glorious mane in the golden savanna",
    "نمر": "a magnificent royal Bengal tiger in lush green jungle",
    "فهد": "a graceful cheetah running across open african plains",
    "ذئب": "a noble grey wolf howling under a full moon in snowy forest",
    "قطة": "a cute adorable fluffy kitten with sparkling eyes in warm soft lighting",
    "قطه": "a cute adorable fluffy kitten with sparkling eyes in warm soft lighting",
    "كلب": "a playful happy golden retriever dog on green grass in park",
    "حصان": "a majestic white Arabian stallion galloping on ocean beach",
    "صقر": "a noble fierce falcon soaring over dramatic desert canyons",
    "نسر": "a powerful golden eagle flying high in the alpine sky",
    "طائر": "a colorful tropical parrot with vibrant feathers in rainforest",
    "سمكة": "vibrant colorful tropical clownfish in exotic coral reef",
    "قرش": "a powerful great white shark swimming in deep turquoise sea",
    "دولفين": "playful dolphins jumping out of ocean water at sunset",
    "سيارة": "a sleek modern futuristic luxury supercar on wet neon city street at night",
    "سياره": "a sleek modern futuristic luxury supercar on wet neon city street at night",
    "فيراري": "a stunning glossy red Ferrari sports car in Monaco, photorealistic",
    "لامبورجيني": "an aggressive Lamborghini hypercar with glowing LED headlights",
    "مرسيدس": "a luxurious black Mercedes-Benz sedan in modern metropolis",
    "بي ام دبليو": "a sporty BMW M8 competition on scenic mountain highway",
    "طائرة": "a modern commercial airliner flying above golden sunset clouds",
    "طيارة": "a modern commercial airliner flying above golden sunset clouds",
    "سفينة": "a massive cruise ship sailing in azure blue Mediterranean sea",
    "اهرامات": "a breathtaking panoramic view of the ancient Giza Pyramids in Egypt at sunset",
    "أهرامات": "a breathtaking panoramic view of the ancient Giza Pyramids in Egypt at sunset",
    "برج خليفة": "Burj Khalifa skyscraper touching clouds in modern Dubai skyline",
    "مكة": "a beautiful serene view of the holy Kaaba in Mecca with spiritual atmosphere",
    "القدس": "the iconic golden Dome of the Rock in Jerusalem under blue sky",
    "فضاء": "an astronaut in high-tech suit exploring deep space with glowing nebula and galaxies",
    "كوكب": "a stunning alien planet with glowing rings in starry outer space",
    "قمر": "a giant glowing full moon over calm reflective ocean water",
    "شمس": "a brilliant golden sunrise over misty mountain peaks",
    "بحر": "a pristine tropical turquoise ocean beach with palm trees and soft sand",
    "طبيعة": "a breathtaking alpine landscape with snowcapped mountains, pine forest and lake",
    "طبيعه": "a breathtaking alpine landscape with snowcapped mountains, pine forest and lake",
    "شلال": "a majestic cascading waterfall in lush tropical forest with rainbow",
    "غابة": "an enchanted lush green forest with sun rays shining through trees",
    "صحراء": "golden rolling desert sand dunes under dramatic blue sky",
    "ورد": "a luxurious bouquet of blooming red and pink roses with dew drops, macro",
    "زهور": "a vibrant colorful flower garden bathed in morning sunlight",
    "روبوت": "a futuristic humanoid cybernetic robot with glowing cyan circuit lights",
    "ذكاء اصطناعي": "futuristic glowing holographic artificial intelligence brain with data streams",
    "مدينة": "a futuristic cyberpunk megacity with flying vehicles and glowing neon holograms",
    "قلعة": "a grand medieval fantasy castle on high cliff surrounded by clouds",
    "بيت": "a beautiful modern luxury glass villa with infinity pool and garden",
    "شخصية كرتونية": "a charming 3D animated Pixar style character with expressive eyes",
    "انمي": "a beautiful high quality Japanese anime style artwork, vibrant colors",
  };

  const lowerTarget = targetSubject.toLowerCase();
  for (const [arKey, enVal] of Object.entries(AR_EN_MAP)) {
    if (lowerTarget.includes(arKey)) {
      return `${enVal}, photorealistic 8k, cinematic lighting, ultra-detailed masterpiece, trending on artstation`;
    }
  }

  // إذا لم يطابق قاموساً وكان إنجليزياً أو عاماً
  return `${targetSubject}, cinematic lighting, photorealistic 8k resolution, highly detailed visual masterpiece`;
}

/**
 * دالة مساعدة لجلب نتائج بحث حقيقية ومباشرة من الويب
 */
async function performLiveWebSearch(query: string): Promise<LiveSearchResult[]> {
  const results: LiveSearchResult[] = [];
  try {
    const cleanQuery = query
      .replace(/^(ابحث عن|بحث عن|ما هو|ما هي|من هو|من هي|ماذا عن|آخر أخبار|أخبار|search for|search|who is|what is|latest on)\s*/i, "")
      .trim();

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery || query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(4500),
    });

    if (response.ok) {
      const html = await response.text();
      const titleLinkRegex = /<a class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const snippetRegex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

      const titles: { uri: string; title: string }[] = [];
      let tMatch;
      const seenUris = new Set<string>();

      while ((tMatch = titleLinkRegex.exec(html)) !== null && titles.length < 5) {
        let rawUri = tMatch[1];
        const uddgMatch = rawUri.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          try {
            rawUri = decodeURIComponent(uddgMatch[1]);
          } catch {}
        }
        const cleanTitle = tMatch[2].replace(/<[^>]+>/g, "").trim();
        if (rawUri.startsWith("http") && !seenUris.has(rawUri)) {
          seenUris.add(rawUri);
          titles.push({ uri: rawUri, title: cleanTitle });
        }
      }

      const snippets: string[] = [];
      let sMatch;
      while ((sMatch = snippetRegex.exec(html)) !== null && snippets.length < 5) {
        snippets.push(sMatch[1].replace(/<[^>]+>/g, "").trim());
      }

      for (let i = 0; i < titles.length; i++) {
        let domain = "";
        try {
          domain = new URL(titles[i].uri).hostname.replace(/^www\./, "");
        } catch {
          domain = "web";
        }
        results.push({
          title: titles[i].title || `${domain} - مصدر الويب`,
          uri: titles[i].uri,
          snippet: snippets[i] || "",
          domain,
        });
      }
    }
  } catch (err) {
    console.warn("Direct live web search fetch:", err);
  }

  // مسار احتياطي عبر ويكيبيديا إذا كانت النتائج فارغة
  if (results.length === 0) {
    try {
      const wikiRes = await fetch(
        `https://ar.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const titles = data[1] || [];
        const snippets = data[2] || [];
        const uris = data[3] || [];
        for (let i = 0; i < titles.length; i++) {
          if (uris[i]) {
            results.push({
              title: titles[i],
              uri: uris[i],
              snippet: snippets[i] || "",
              domain: "ar.wikipedia.org",
            });
          }
        }
      }
    } catch {}
  }

  return results;
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

    const userPrompt = lastMessage?.content || "";
    const attachedImage = (req.body as any)?.image as { data: string; mimeType: string } | undefined;

    // 1. التحقق من نية البحث في الويب (سواء بالزر أو السؤال عن أحداث حية/أخبار/2024-2026)
    const userRequestedWebSearchExplicit = Boolean(
      (req.body as any)?.useWebSearch || (req.body as any)?.webSearch
    );
    const hasLiveSearchKeywords =
      /(أخبار|اخبار|اليوم|الآن|الكرة الذهبية|من هو الفائز|من الفائز|سعر|نتائج|مباراة|مباريات|طقس|أحدث|جديد|news|latest|today|who won|current price|weather|breakthrough)/i.test(
        userPrompt
      );
    const userRequestedWebSearch = userRequestedWebSearchExplicit || (hasLiveSearchKeywords && !attachedImage);

    // 2. التحقق من نية توليد الصور
    const isImageGenerationExplicit = Boolean((req.body as any)?.generateImage);
    const isImageGenerationIntent =
      isImageGenerationExplicit ||
      /^(اصنع|أنشئ|انشئ|ولد|ولّد|صمم|ارسم|اعمل|أعمل|وهات|هات|عايز\s+صورة|أريد\s+صورة|بدي\s+صورة|صورة\s+لـ|صورة\s+عن|صورة\s+ل|توليد\s+صورة|generate\s+an?\s+image|create\s+an?\s+image|draw\s+an?\s+image|paint\s+an?\s+image|image\s+of|picture\s+of)/i.test(
        userPrompt.trim()
      ) ||
      /(اصنع\s+صورة|أنشئ\s+صورة|انشئ\s+صورة|ولّد\s+صورة|ولد\s+صورة|ارسم\s+صورة|صمم\s+صورة|generate\s+image|draw\s+image|create\s+image)/i.test(
        userPrompt.trim()
      );

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

    const searchInstruction = userRequestedWebSearch
      ? `\n4. WEB SEARCH MODE (وضع البحث الحي المباشر في الويب عبر Google Search):
   - Real-time web search is active. Ground your answer in factual up-to-date information (e.g., Rodri won Ballon d'Or 2024, recent 2024-2026 sports, tech, news).
   - Summarize the web findings in an ultra-concise, crystal-clear manner with engaging emojis 🌐🔍.
   - Present the answer directly in 1-3 short bullet points without unnecessary filler words.
   - Conclude with the mandatory interactive question.`
      : `\n4. STANDARD CONVERSATION MODE:
   - Provide direct, fast, intelligent answers from your knowledge base and user memory.`;

    const imageAnalysisInstruction = attachedImage
      ? `\n7. MULTIMODAL IMAGE ANALYSIS (تحليل وفهم الصور المرفقة):
   - The user attached an image. Look at it thoroughly and provide an ultra-concise, crystal-clear explanation/analysis of what is shown.
   - Mention key subjects, colors, or answers to any specific question the user asked.
   - Keep it extremely short (مختصرة جداً جداً وبدون حشو), punchy, and decorated with vivid emojis 🖼️🔍✨.
   - Conclude with the mandatory interactive question.`
      : "";

    const supremeSystemPrompt = `You are M7 AI, an ultra-advanced, intelligent, friendly AI assistant created by M7 TECNO.
CRITICAL RULES:
1. IDENTITY & CREATOR: If asked who created, built, or developed you, you MUST state: "تم تطويري من شركة M7 TECNO ومن قبل المطور محمود صبري" (or in English if queried in English).
2. ULTRA-CONCISE & EMOJIS (إجابات مختصرة جداً جداً مع إيموجيات):
   - You MUST keep all your answers extremely short, concise, direct, and to the point (مختصرة جداً جداً بدون أي حشو أو كلام زائد).
   - Use lively, appropriate emojis in every response to make it engaging and clear 🎯✨.
   - If the user sends a simple greeting, reply with a single-line greeting with emojis.
3. MANDATORY INTERACTIVE CLOSING QUESTION (الخاتمة التفاعلية الثابتة):
   - EVERY single response MUST end with a relevant interactive suggested question following this exact style:
     "لو تحب أبحث ليك عن [موضوع متعلق] أو أشوف ليك [اقتراح متعلق]؟ 🔍💡"
     (or similar friendly Egyptian/Arabic phrased suggestion like: لو تحب أبص ليك على كذا أو أجهز ليك كذا؟).
   - If responding in English, conclude with: "Would you like me to search for [related topic] or check out [related suggestion] for you? 🔍✨"${searchInstruction}${imageAnalysisInstruction}
5. LANGUAGE MATCHING: Reply strictly in the same language as the user message (Arabic or English).
6. MEMORY EXTRACTION: When the user shares personal facts (name, job, favorite topic, preferences, etc.), include memory tags: <M7MEMORY>{"key":"english_key","value":"fact_value","label":"arabic_label"}</M7MEMORY>
${memoryText}`;

    const ai = getAiClient();
    let rawAiText = "";
    let isWebSearch = userRequestedWebSearch;
    let isImageGeneration = false;
    let generatedImageUrl: string | null = null;
    let searchSources: Array<{ title: string; uri: string; domain?: string }> = [];

    // ── IMAGE GENERATION HANDLING (توليد الصور الدقيق) ─────────────────────────
    if (isImageGenerationIntent && !attachedImage) {
      isImageGeneration = true;

      // 1. ترجمة وصياغة الـ Prompt باللغة الإنجليزية الدقيقة لمحرك التوليد
      const highQualityPrompt = await buildHighQualityImagePrompt(userPrompt, ai);
      console.log("🎨 Generating AI image with prompt:", highQualityPrompt);

      // 2. استخدام محرك FLUX المتطور والموثوق لتوليد الصورة المطلوبة بالضبط
      const encodedPrompt = encodeURIComponent(highQualityPrompt);
      const randomSeed = Math.floor(Math.random() * 9000000) + 1000000;
      generatedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}&model=flux&enhance=true`;

      // 3. استخراج اسم الموضوع لتقديمه في الرد بأسلوب أنيق ومختصر جداً مع إيموجيز
      const subjectPreview = userPrompt
        .replace(/^(اصنع|أنشئ|انشئ|ولد|ولّد|صمم|ارسم|اعمل|أعمل|عايز\s+صورة|أريد\s+صورة|صورة\s+لـ|صورة\s+عن|صورة|generate\s+an?\s+image|create\s+an?\s+image|draw\s+an?\s+image|image\s+of)\s*/i, "")
        .trim();

      const isEnglish = /[a-zA-Z]{4,}/.test(userPrompt);
      if (isEnglish) {
        rawAiText = `Here is your high-definition AI generated artwork (${subjectPreview || "Masterpiece"})! 🎨✨\n\nWould you like me to adjust any visual details or generate another creative concept for you? 🔍💡`;
      } else {
        const topicName = subjectPreview ? `(${subjectPreview})` : "";
        rawAiText = `تم توليد الصورة لك بدقة عالية وتفاصيل فنية مميزة ${topicName}! 🎨✨\n\nلو تحب أعدل ليك تفاصيل في الصورة دي أو أنشئ ليك صورة تانية؟ 🔍💡`;
      }
    } else if (!ai) {
      // Fallback message when API key is not yet set
      rawAiText = "أهلاً بك في M7 AI! 🤖✨ يرجى تفعيل مفتاح `GEMINI_API_KEY` في إعدادات البيئة للبدء فوراً.\n\nلو تحب أبحث ليك عن خطوات الضبط أو أشوف ليك أي تفاصيل تانية؟ 🔍💡";
    } else {
      // ── CONSTRUCT CONTENTS (TEXT + OPTIONAL ATTACHED IMAGE) ─────────────────
      let liveWebContext = "";
      if (userRequestedWebSearch && !attachedImage) {
        // جلب نتائج البحث الحي من الويب لدعم النموذج بالمعلومات الفورية
        const liveResults = await performLiveWebSearch(userPrompt);
        if (liveResults.length > 0) {
          liveWebContext = `\n\n[Real-Time Live Web Search Results for "${userPrompt}"]:\n` +
            liveResults.map((r, i) => `${i + 1}. [${r.title}] (${r.uri})\nSummary: ${r.snippet}`).join("\n\n");
          
          for (const r of liveResults) {
            searchSources.push({
              title: r.title,
              uri: r.uri,
              domain: r.domain,
            });
          }
        }
      }

      const contents = messages.map((m, idx) => {
        const isLast = idx === messages.length - 1;
        const parts: any[] = [];

        if (isLast && attachedImage) {
          parts.push({
            inlineData: {
              data: attachedImage.data.replace(/^data:[^;]+;base64,/, ""),
              mimeType: attachedImage.mimeType || "image/jpeg",
            },
          });
        }

        let messageText = m.content;
        if (isLast && liveWebContext) {
          messageText = `${messageText}${liveWebContext}`;
        }
        if (isLast && attachedImage && !messageText) {
          messageText = "حلل هذه الصورة واشرح ما فيها باختصار شديد جداً مع إيموجيات.";
        }

        parts.push({
          text: messageText || "",
        });

        return {
          role: m.role === "assistant" ? "model" : "user",
          parts,
        };
      });

      const searchModels = [
        "gemini-3.7-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.1-pro-preview",
      ];

      const chatModels = [
        "gemini-3.7-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.1-pro-preview",
      ];

      let success = false;
      let lastErr: any = null;
      let detectedRetrySeconds = 0;

      const parseRetryDelay = (err: any): number => {
        try {
          const str = err?.message || err?.toString() || "";
          const match = str.match(/retry in ([0-9.]+)s/i);
          if (match && match[1]) {
            return Math.ceil(parseFloat(match[1]));
          }
          if (err?.details && Array.isArray(err.details)) {
            for (const d of err.details) {
              if (d.retryDelay) {
                const s = parseInt(d.retryDelay, 10);
                if (!isNaN(s)) return s;
              }
            }
          }
        } catch {
          // ignore
        }
        return 0;
      };

      // 1. Try with Web Search Grounding if requested
      if (userRequestedWebSearch && !attachedImage) {
        for (const model of searchModels) {
          if (success) break;

          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: supremeSystemPrompt,
                temperature: 0.3,
                tools: [{ googleSearch: {} }],
              },
            });

            const text = response.text?.trim();
            if (text) {
              rawAiText = text;
              success = true;

              // Grounding metadata from Gemini native Google Search
              const candidate = response.candidates?.[0];
              const groundingMetadata = candidate?.groundingMetadata as any;
              if (groundingMetadata) {
                const chunks = groundingMetadata.groundingChunks || [];
                const seenUris = new Set(searchSources.map((s) => s.uri));
                for (const chunk of chunks) {
                  const uri = chunk.web?.uri;
                  if (uri && !seenUris.has(uri)) {
                    seenUris.add(uri);
                    let domain = "";
                    try {
                      domain = new URL(uri).hostname.replace(/^www\./, "");
                    } catch {
                      domain = "google.com";
                    }
                    searchSources.push({
                      title: chunk.web?.title || domain || "نتيجة بحث ويب",
                      uri,
                      domain,
                    });
                  }
                }
              }
              break;
            }
          } catch (err: any) {
            lastErr = err;
            const retrySec = parseRetryDelay(err);
            if (retrySec > 0) detectedRetrySeconds = retrySec;
            console.warn(`Native search on model ${model} failed, falling back:`, err?.message || err);
          }
        }
      }

      // 2. Standard Generation Mode (or fallback when native search grounding is rate limited)
      if (!success) {
        for (const model of chatModels) {
          if (success) break;

          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: supremeSystemPrompt,
                temperature: 0.5,
              },
            });

            const text = response.text?.trim();
            if (text) {
              rawAiText = text;
              success = true;
              break;
            }
          } catch (err: any) {
            lastErr = err;
            const retrySec = parseRetryDelay(err);
            if (retrySec > 0) detectedRetrySeconds = retrySec;
            console.warn(`Chat on model ${model} failed:`, err?.message || err);
          }
        }
      }

      // 3. Fallback graceful response if all Google models are momentarily rate-limited
      if (!success) {
        console.error("All Gemini API models and retries temporarily exhausted:", lastErr);
        const lastUserText = messages[messages.length - 1]?.content || "";
        const isEnglish = /[a-zA-Z]{4,}/.test(lastUserText);

        const timeNotice =
          detectedRetrySeconds > 0
            ? isEnglish
              ? ` (approx. ${detectedRetrySeconds} seconds)`
              : ` (حوالي ${detectedRetrySeconds} ثانية)`
            : "";

        if (isEnglish) {
          rawAiText = `Hello! 🌟 The AI service was momentarily busy. Please wait a moment${timeNotice} and click the Retry button to receive your answer! 🚀\n\nWould you like me to retry this query for you? 🔍✨`;
        } else {
          rawAiText = `أهلاً بك! 🌟 الخدمة مشغولة لحظياً بسبب حدود الاستخدام المجاني (Rate Limit). يرجى الانتظار قليلاً${timeNotice} ثم الضغط على زر "إعادة المحاولة" لتصلك الإجابة فوراً! 🚀\n\nلو تحب أعيد المحاولة ليك على استفسارك ده أول ما يتاح؟ 🔍💡`;
        }
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
        let userContentToSave = lastMessage.content || "";
        if (attachedImage) {
          const userImgDataUrl = `data:${attachedImage.mimeType || "image/jpeg"};base64,${attachedImage.data.replace(/^data:[^;]+;base64,/, "")}`;
          userContentToSave = `<M7IMAGE>${JSON.stringify({ url: userImgDataUrl })}</M7IMAGE>\n${userContentToSave}`.trim();
        } else if (lastMessage.imageUrl) {
          userContentToSave = `<M7IMAGE>${JSON.stringify({ url: lastMessage.imageUrl })}</M7IMAGE>\n${userContentToSave}`.trim();
        }

        let assistantContentToSave = aiText;
        if (generatedImageUrl) {
          assistantContentToSave = `<M7IMAGE>${JSON.stringify({ url: generatedImageUrl })}</M7IMAGE>\n${assistantContentToSave}`.trim();
        }

        await db.insert(messagesTable).values([
          { conversationId, role: "user", content: userContentToSave },
          { conversationId, role: "assistant", content: assistantContentToSave },
        ]);
      } catch (dbErr) {
        console.warn("Could not persist messages:", dbErr);
      }
    }

    res.json({
      message: aiText,
      role: "assistant",
      imageUrl: generatedImageUrl,
      isWebSearch,
      isImageGeneration,
      searchSources: searchSources.slice(0, 5),
    });
  } catch (err) {
    console.error("Server error in /api/chat:", err);
    const errorMessage =
      err instanceof Error ? err.message : "حدث خطأ في الخادم الداخلي";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;

