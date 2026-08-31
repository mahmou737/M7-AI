/**
 * M7 AI Chat Route — POST /api/chat
 * المساعد الذكي M7 AI باستخدام @google/genai SDK
 * يدعم المحادثة الفورية، البحث الحي في الويب، وتوليد الصور عالي الدقة
 */

import { Router, Request } from "express";
import { GoogleGenAI } from "@google/genai";
import { eq, and, desc } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import {
  db,
  messagesTable,
  conversationsTable,
  userMemoryTable,
} from "@workspace/db";

const router = Router();
const MEMORY_TAG_RE = /<M7MEMORY>([\s\S]*?)<\/M7MEMORY>/g;

// تتبع انتهاء حصة أداة البحث لتجنب أخطاء 429 وتخطيها تلقائياً نحو البحث الحي
let googleSearchGroundingQuotaExhaustedUntil = 0;

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

/**
 * دالة مساعدة لفلترة وتنظيم تاريخ المحادثة بما يتوافق 100% مع معايير Gemini API
 * تمنع تكرار الأدوار وتضمن البدء بـ user وتستبعد رسائل الأخطاء السابقة
 */
function sanitizeForGemini(
  rawMessages: Array<{ role?: string; content?: string }>,
  attachedImage?: { data: string; mimeType: string },
  liveWebContext?: string
) {
  // 1. استبعاد الرسائل الفارغة أو رسائل التوقف أو الأخطاء
  const cleanMsgs = rawMessages
    .filter(
      (m) =>
        m.content &&
        !m.content.startsWith("⚠️") &&
        !m.content.startsWith("⏹️")
    )
    .slice(-8); // الاحتفاظ بآخر 8 رسائل لتسريع الاستجابة وتقليل استهلاك الوقت والرموز

  if (cleanMsgs.length === 0) {
    cleanMsgs.push({ role: "user", content: "مرحباً" });
  }

  // ضمان أن أول رسالة تبدأ من المستخدم
  while (cleanMsgs.length > 0 && cleanMsgs[0].role !== "user") {
    cleanMsgs.shift();
  }

  if (cleanMsgs.length === 0) {
    cleanMsgs.push({ role: "user", content: "مرحباً" });
  }

  // بناء أدوار متناوبة نظيفة
  const formatted: Array<{ role: "user" | "model"; parts: any[] }> = [];
  for (let i = 0; i < cleanMsgs.length; i++) {
    const m = cleanMsgs[i];
    const isLast = i === cleanMsgs.length - 1;
    const role: "user" | "model" =
      m.role === "assistant" || m.role === "model" ? "model" : "user";

    let text = (m.content || "").trim();
    if (isLast && liveWebContext) {
      text = `${text}${liveWebContext}`;
    }

    const parts: any[] = [];
    if (isLast && attachedImage) {
      parts.push({
        inlineData: {
          data: attachedImage.data.replace(/^data:[^;]+;base64,/, ""),
          mimeType: attachedImage.mimeType || "image/jpeg",
        },
      });
      if (!text) {
        text = "حلل هذه الصورة واشرح ما فيها باختصار شديد جداً مع إيموجيات.";
      }
    }

    if (text) {
      parts.push({ text });
    } else {
      parts.push({ text: "..." });
    }

    // دمج الرسائل المتتالية لنفس الدور لضمان التناوب الصارم (user -> model -> user)
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts.push(...parts);
    } else {
      formatted.push({ role, parts });
    }
  }

  // التأكد من أن الدور الأخير هو user
  if (formatted.length === 0 || formatted[formatted.length - 1].role !== "user") {
    formatted.push({
      role: "user",
      parts: [{ text: liveWebContext ? `مرحباً${liveWebContext}` : "مرحباً" }],
    });
  }

  return formatted;
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
 * دالة مساعدة لترجمة وتحسين أمر توليد الصورة للغة الإنجليزية بأعلى جودة
 * لضمان فهم محرك التوليد (FLUX / Diffusion) للشكل المطلوب بدقة 100%
 * مع إضافة معززات الجودة الفائقة (8k, photorealistic, cinematic lighting, octane render)
 */
async function buildHighQualityImagePrompt(userPrompt: string, ai: GoogleGenAI | null): Promise<string> {
  const clean = userPrompt
    .replace(/^(اصنع|أنشئ|انشئ|ولد|ولّد|صمم|ارسم|اعمل|أعمل|وهات|هات|عايز\s+صورة|أريد\s+صورة|بدي\s+صورة|صورة\s+لـ|صورة\s+عن|صورة\s+ل|صورة|توليد\s+صورة|generate\s+an?\s+image|create\s+an?\s+image|draw\s+an?\s+image|paint\s+an?\s+image|image\s+of|picture\s+of)\s*/i, "")
    .replace(/(صورة|image|picture|photo)\s*/gi, "")
    .trim();

  const targetSubject = clean || userPrompt;

  // 1. محاولة صياغة الـ Prompt عبر Gemini بنماذج فائقة السرعة مع مهلة ذكية ومعالجة صامتة للأخطاء المؤقتة
  if (ai) {
    const promptModels = [
      "gemini-3.7-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];
    for (const pModel of promptModels) {
      try {
        const promptPromise = ai.models.generateContent({
          model: pModel,
          contents: `You are an expert AI visual prompt engineer specialized in state-of-the-art diffusion models (FLUX, Midjourney).
Translate the user's concept into an ultra-detailed, photorealistic, cinematic English text-to-image prompt.
Follow these rules strictly:
1. Describe the subject in vivid detail, camera composition (e.g. wide angle, macro, 85mm portrait), environment, atmosphere, and cinematic lighting (e.g. volumetric rays, golden hour, soft studio light, neon reflections).
2. Always append top-tier quality boosters: "8k resolution, photorealistic masterpiece, ultra-detailed texture, sharp focus, cinematic lighting, octane render, unreal engine 5, vivid colors, depth of field".
3. Output ONLY the finalized English prompt (max 35 words). No introductory text, no quotes, no markdown.

Subject: "${targetSubject}"`,
          config: {
            temperature: 0.35,
          },
        });
        const transRes = await withTimeout(promptPromise, 6000);
        const generatedPrompt = transRes.text?.replace(/["'`]/g, "").trim();
        if (generatedPrompt && generatedPrompt.length > 10 && !/[ء-ي]/.test(generatedPrompt)) {
          return generatedPrompt;
        }
      } catch {
        // الانتقال الفوري للنموذج التالي أو للقاموس الذكي دون إثارة أخطاء
        continue;
      }
    }
  }

  // 2. قاموس ذكي متقدم للمفاهيم والكلمات العربية الشائعة لضمان إخراج صور مذهلة دائماً
  const AR_EN_MAP: Record<string, string> = {
    "حوت": "a majestic giant blue whale swimming in deep crystal clear ocean water with volumetric sunbeams",
    "حوت ازرق": "a majestic giant blue whale breaching deep azure ocean water",
    "اسد": "a majestic regal male lion with glorious golden mane in the african savanna",
    "أسد": "a majestic regal male lion with glorious golden mane in the african savanna",
    "نمر": "a magnificent royal Bengal tiger with vivid stripes in lush misty rainforest",
    "فهد": "a graceful cheetah sprinting across sunlit golden savanna plains",
    "ذئب": "a noble grey wolf with piercing eyes howling under glowing full moon in winter snow forest",
    "قطة": "an adorable fluffy kitten with sparkling crystal eyes in cozy warm golden lighting",
    "قطه": "an adorable fluffy kitten with sparkling crystal eyes in cozy warm golden lighting",
    "كلب": "a playful happy golden retriever dog in blooming park under morning sunlight",
    "حصان": "a magnificent purebred white Arabian stallion galloping on ocean beach at sunset",
    "صقر": "a noble fierce falcon with sharp eyes soaring over dramatic desert canyons",
    "نسر": "a powerful golden eagle flying high above snowcapped alpine mountain peaks",
    "طائر": "a colorful exotic tropical parrot with vibrant plumage in deep jungle",
    "سمكة": "vibrant colorful exotic tropical fish swimming in glowing coral reef",
    "قرش": "a powerful majestic great white shark gliding through deep turquoise ocean",
    "دولفين": "playful dolphins leaping through turquoise ocean waves at sunset",
    "سيارة": "a futuristic sleek luxury supercar driving on wet neon-lit city street at night, reflective puddle",
    "سياره": "a futuristic sleek luxury supercar driving on wet neon-lit city street at night, reflective puddle",
    "فيراري": "a glossy aerodynamic red Ferrari sports car in luxury Monaco harbor, photorealistic",
    "لامبورجيني": "an aggressive sharp Lamborghini hypercar with glowing geometric headlights",
    "مرسيدس": "a prestigious black Mercedes-Benz luxury sedan in modern metropolis",
    "بي ام دبليو": "a sporty modern BMW M8 competition car on scenic mountain highway",
    "طائرة": "a modern commercial airliner cruising smoothly above sunset cloud blanket",
    "طيارة": "a modern commercial airliner cruising smoothly above sunset cloud blanket",
    "سفينة": "a massive luxury cruise yacht sailing across calm azure Mediterranean waters",
    "اهرامات": "a breathtaking panoramic view of the ancient Giza Pyramids in Egypt under golden hour sunset",
    "أهرامات": "a breathtaking panoramic view of the ancient Giza Pyramids in Egypt under golden hour sunset",
    "برج خليفة": "iconic Burj Khalifa skyscraper piercing through clouds in illuminated modern Dubai",
    "مكة": "a serene breathtaking view of the holy Kaaba in Mecca with spiritual atmospheric lighting",
    "القدس": "the majestic golden Dome of the Rock in Jerusalem under clear blue sky",
    "فضاء": "an intrepid astronaut exploring deep cosmos with glowing vibrant nebulae and distant galaxies",
    "كوكب": "a stunning alien planet with illuminated rings in starry deep outer space",
    "قمر": "a glowing supermoon hanging over calm reflective dark ocean water",
    "شمس": "a brilliant radiant golden sunrise rising over misty alpine peaks",
    "بحر": "a pristine tropical turquoise ocean lagoon with soft white sand and palm trees",
    "طبيعة": "a breathtaking alpine landscape with snowcapped mountains, crystal clear pine lake",
    "طبيعه": "a breathtaking alpine landscape with snowcapped mountains, crystal clear pine lake",
    "شلال": "a majestic cascading waterfall surrounded by lush tropical greenery with mist and rainbow",
    "غابة": "an enchanted lush green forest with dramatic volumetric god rays through tall trees",
    "صحراء": "endless sweeping golden sand dunes under a dramatic sunset sky",
    "ورد": "a luxurious bouquet of blooming velvety red roses with glistening dew drops, macro photography",
    "زهور": "a vibrant field of colorful blooming wildflowers bathed in soft morning sunlight",
    "روبوت": "a futuristic elegant cybernetic humanoid robot with glowing cyan fiber optic lights",
    "ذكاء اصطناعي": "a glowing holographic artificial intelligence neural network core with data streams",
    "مدينة": "a futuristic cyberpunk metropolis with flying vehicles, towering skyscrapers and neon reflections",
    "قلعة": "a grand majestic medieval fantasy castle perched on a rocky cliff surrounded by clouds",
    "بيت": "an ultra-modern luxury glass villa with infinity pool overlooking ocean at dusk",
    "شخصية كرتونية": "a charming lovable 3D animated character with expressive eyes in Pixar style",
    "انمي": "a visually stunning Japanese anime style masterpiece with vibrant colors and rich atmosphere",
  };

  const lowerTarget = targetSubject.toLowerCase();
  for (const [arKey, enVal] of Object.entries(AR_EN_MAP)) {
    if (lowerTarget.includes(arKey)) {
      return `${enVal}, 8k resolution, photorealistic, cinematic lighting, masterpiece, sharp focus, intricate texture, octane render, trending on artstation`;
    }
  }

  // التعزيز القياسي الشامل لجميع الأوامر لضمان مخرجات سينمائية مبهرة
  return `${targetSubject}, 8k resolution, photorealistic, ultra-detailed masterpiece, cinematic volumetric lighting, sharp focus, intricate details, vivid colors, octane render`;
}

/**
 * دالة مساعدة لتنفيذ أي Promise بمهلة زمنية قصوى محددة (Timeout) لمنع أي تعليق
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue?: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        if (fallbackValue !== undefined) {
          resolve(fallbackValue);
        } else {
          reject(new Error(`Timeout after ${ms}ms`));
        }
      }, ms)
    ),
  ]);
}

/**
 * دالة مساعدة لتنفيذ استدعاءات الذكاء الاصطناعي مع مهلة زمنية دقيقة
 * وتمرير الأخطاء فوراً للانتقال السريع للنموذج البديل دون تأخير
 */
async function executeWithBackoff<T>(
  operation: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return await withTimeout(operation(), timeoutMs);
}

/**
 * دالة مساعدة لجلب نتائج بحث حقيقية ومباشرة من الويب بسرعة فائقة
 * تستخدم مصادر متعددة متزامنة مع مهلة زمنية صارمة
 */
async function performLiveWebSearch(query: string): Promise<LiveSearchResult[]> {
  const results: LiveSearchResult[] = [];
  const seenUris = new Set<string>();

  const cleanQuery = query
    .replace(/^(ابحث عن|بحث عن|ما هو|ما هي|من هو|من هي|ماذا عن|آخر أخبار|أخبار|ما نتيجة|كم سعر|search for|search|who is|what is|latest on|news on)\s*/i, "")
    .trim() || query;

  // 1. استعلام متوازي وسريع عن ويكيبيديا العربية والإنجليزية وDuckDuckGo API
  const fetchPromises = [
    // ويكيبيديا العربية
    (async () => {
      try {
        const res = await fetch(
          `https://ar.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=3&namespace=0&format=json`,
          { signal: AbortSignal.timeout(2500) }
        );
        if (res.ok) {
          const data = await res.json();
          const titles: string[] = data[1] || [];
          const snippets: string[] = data[2] || [];
          const uris: string[] = data[3] || [];
          return titles.map((title, i) => ({
            title,
            uri: uris[i],
            snippet: snippets[i] || "",
            domain: "ar.wikipedia.org",
          })).filter(r => r.uri && r.title);
        }
      } catch {}
      return [];
    })(),

    // ويكيبيديا الإنجليزية
    (async () => {
      try {
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=3&namespace=0&format=json`,
          { signal: AbortSignal.timeout(2500) }
        );
        if (res.ok) {
          const data = await res.json();
          const titles: string[] = data[1] || [];
          const snippets: string[] = data[2] || [];
          const uris: string[] = data[3] || [];
          return titles.map((title, i) => ({
            title,
            uri: uris[i],
            snippet: snippets[i] || "",
            domain: "en.wikipedia.org",
          })).filter(r => r.uri && r.title);
        }
      } catch {}
      return [];
    })(),

    // DuckDuckGo Instant Answer API
    (async () => {
      try {
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`,
          { signal: AbortSignal.timeout(2500) }
        );
        if (res.ok) {
          const data = await res.json();
          const items: LiveSearchResult[] = [];
          if (data.AbstractText && data.AbstractURL) {
            items.push({
              title: data.Heading || cleanQuery,
              uri: data.AbstractURL,
              snippet: data.AbstractText,
              domain: "duckduckgo.com",
            });
          }
          if (Array.isArray(data.RelatedTopics)) {
            for (const t of data.RelatedTopics.slice(0, 3)) {
              if (t.FirstURL && t.Text) {
                items.push({
                  title: t.Text.slice(0, 60),
                  uri: t.FirstURL,
                  snippet: t.Text,
                  domain: "duckduckgo.com",
                });
              }
            }
          }
          return items;
        }
      } catch {}
      return [];
    })(),

    // DuckDuckGo HTML Direct Live Web Search
    (async () => {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
          },
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          const html = await res.text();
          const titleLinkRegex = /<a class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
          const snippetRegex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

          const items: LiveSearchResult[] = [];
          const titles: { uri: string; title: string }[] = [];
          let tMatch;

          while ((tMatch = titleLinkRegex.exec(html)) !== null && titles.length < 5) {
            let rawUri = tMatch[1];
            const uddgMatch = rawUri.match(/uddg=([^&]+)/);
            if (uddgMatch) {
              try {
                rawUri = decodeURIComponent(uddgMatch[1]);
              } catch {}
            }
            const cleanTitle = tMatch[2].replace(/<[^>]+>/g, "").trim();
            if (rawUri.startsWith("http") && !rawUri.includes("duckduckgo.com/y.js")) {
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
            items.push({
              title: titles[i].title || `${domain} - مصدر الويب`,
              uri: titles[i].uri,
              snippet: snippets[i] || "",
              domain,
            });
          }
          return items;
        }
      } catch {}
      return [];
    })(),
  ];

  try {
    const fetchedBatches = await withTimeout(Promise.all(fetchPromises), 3000, []);
    for (const batch of fetchedBatches) {
      for (const item of batch) {
        if (item.uri && !seenUris.has(item.uri) && results.length < 5) {
          seenUris.add(item.uri);
          results.push(item);
        }
      }
    }
  } catch {
    // Continue gracefully
  }

  return results;
}

/**
 * دالة فحص وتحليل المدخلات المبهمة أو الطلاسم أو النصوص العشوائية لمنع التخمين الخاطئ والهبد
 */
function checkGibberishOrAmbiguous(text: string): { isGibberish: boolean; isEnglish: boolean } {
  const trimmed = text.trim();
  const isEnglish = /^[a-zA-Z0-9\s.,!?'"()#@%&*+-]+$/.test(trimmed) && /[a-zA-Z]{3,}/.test(trimmed);

  if (!trimmed) return { isGibberish: true, isEnglish };

  // إزالة المسافات وعلامات الترقيم والرموز التعبيرية
  const clean = trimmed.replace(/[\s\p{P}\p{S}\p{Emoji}\p{Extended_Pictographic}]/gu, "");
  if (clean.length === 0) {
    return { isGibberish: true, isEnglish };
  }

  // 1. تكرار حرف واحد أكثر من 4 مرات متتالية بدون كلمات أخرى (مثل: "aaaaaa", "ههههههه", "111111", "zzzzzz")
  if (/^(.)\1{3,}$/u.test(clean)) {
    return { isGibberish: true, isEnglish };
  }

  // 2. تكرار مقطع من حرفين أو ثلاثة 3 مرات متتالية (مثل: "asdfasdfasdf", "تنتنتنتن", "qwqwqw")
  if (/^(.{2,3})\1{2,}$/u.test(clean)) {
    return { isGibberish: true, isEnglish };
  }

  // 3. حروف عشوائية على الكيبورد بدون معنى (Keyboard mashing)
  const mashPatterns = [
    /^[asdfghjkl]{5,}$/i,
    /^[qwertyuiop]{5,}$/i,
    /^[zxcvbnm]{5,}$/i,
    /^[lkjhgfdsa]{5,}$/i,
    /^[poiuytrewq]{5,}$/i,
    /^[mnbvcxz]{5,}$/i,
    /^[ضصثقفغعهخحجد]{5,}$/,
    /^[شسيبلاتنمكط]{5,}$/,
    /^[ئءؤرلاىةوزظ]{5,}$/,
    /^[1234567890]{6,}$/,
  ];
  for (const p of mashPatterns) {
    if (p.test(clean)) {
      return { isGibberish: true, isEnglish };
    }
  }

  return { isGibberish: false, isEnglish };
}

/**
 * دالة استخراج وتنظيف أزرار الاقتراحات السريعة التفاعلية
 */
function extractSuggestionsTags(text: string): { cleanText: string; suggestions: string[] } {
  let cleanText = text;
  let suggestions: string[] = [];

  const match = text.match(/<M7SUGGESTIONS>([\s\S]*?)<\/M7SUGGESTIONS>/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 3);
      }
    } catch {
      const raw = match[1];
      const items = raw.match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        suggestions = items
          .map((i) => i.replace(/^["']|["']$/g, "").trim())
          .filter((s) => s.length > 0)
          .slice(0, 3);
      }
    }
    cleanText = cleanText.replace(/<M7SUGGESTIONS>[\s\S]*?<\/M7SUGGESTIONS>/g, "").trim();
  }

  return { cleanText, suggestions };
}

/**
 * توليد اقتراحات ذكية متوافقة مع السياق واللغة في حال عدم توليد النموذج لها
 */
function generateFallbackSuggestions(text: string, isEnglish: boolean, isImage: boolean, isClarification: boolean): string[] {
  if (isClarification) {
    return isEnglish
      ? [
          "Explain in more detail 💡",
          "Search recent tech news 🌐",
          "Create an AI artwork 🎨",
        ]
      : [
          "توضيح السؤال بمزيد من التفصيل 💡",
          "أحدث أخبار التقنية والذكاء الاصطناعي 🌐",
          "توليد صورة فنية بالذكاء الاصطناعي 🎨",
        ];
  }

  if (isImage) {
    return isEnglish
      ? [
          "Generate a different variation 🎨",
          "Enhance details & lighting ✨",
          "Create in a futuristic style 🚀",
        ]
      : [
          "أنشئ نسخة بتفاصيل سينمائية أكثر 🎨",
          "عدل الإضاءة والألوان لتكون أزهى ✨",
          "اصنع صورة بأسلوب مستقبلي فائق الدقة 🚀",
        ];
  }

  if (isEnglish) {
    return [
      "Tell me more details 🔍",
      "What are the best practices? 💡",
      "Summarize in 3 quick points 📋",
    ];
  }

  return [
    "أخبرني بمزيد من التفاصيل 🔍",
    "ما هي أهم النصائح والتطبيقات؟ 💡",
    "لخص لي في 3 نقاط سريعة 📋",
  ];
}

/**
 * دالة مساعدة لتوليد عنوان ذكي ومختصر للمحادثة (من 2 إلى 4 كلمات) يعبر عن صلب الموضوع والهدف الأساسي
 * تستبعد كلمات الترحيب المجردة مثل (أهلاً، مرحبا، Hi، Hello) وتحدد الموضوع الحقيقي تلقائياً
 */
async function generateSmartConversationTitle(
  messages: Array<{ role?: string; content?: string }>,
  isImageGen: boolean,
  isWebSearch: boolean,
  ai: GoogleGenAI | null
): Promise<string> {
  // جمع رسائل المحادثة المتوفرة حتى الآن لفهم الفكرة المحورية
  const allUserTexts = messages
    .filter((m) => m.role === "user" || !m.role)
    .map((m) =>
      (m.content || "")
        .replace(/<M7IMAGE>[\s\S]*?<\/M7IMAGE>/g, "")
        .replace(/<[^>]*>/g, "")
        .trim()
    )
    .filter(Boolean);

  const lastAssistantText = messages
    .filter((m) => m.role === "assistant" || m.role === "model")
    .map((m) =>
      (m.content || "")
        .replace(/<M7[^>]*>[\s\S]*?<\/M7[^>]*>/g, "")
        .replace(/<[^>]*>/g, "")
        .trim()
    )
    .filter(Boolean)
    .pop();

  const conversationSample = allUserTexts.join(" | ");

  // كلمات الترحيب العامة التي يجب عدم جعلها عنواناً للشات أبداً
  const GREETING_WORDS = new Set([
    "مرحبا", "مرحباً", "اهلا", "أهلا", "اهلاً", "أهلاً", "السلام عليكم", "سلام", "صباح الخير", "مساء الخير",
    "هاي", "الو", "ألو", "هلا", "يا هلا", "hi", "hello", "hey", "good morning", "good evening", "how are you"
  ]);

  const cleanSample = conversationSample
    .toLowerCase()
    .replace(/[،,!?؟.]/g, "")
    .trim();

  // 1. محاولة توليد عنوان ذكي باستخدام الذكاء الاصطناعي السريع
  if (ai && conversationSample.length > 0) {
    try {
      const titlePromise = ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `You are an expert conversation titler.
Analyze the user's conversation intent and generate a crisp, meaningful title (STRICTLY 2 to 4 words).
STRICT RULES:
1. NEVER use generic greetings (e.g. "مرحبا", "أهلاً", "Hello", "Hi").
2. Capture the core subject, topic, or request (e.g. "تطوير كود Node.js", "أفكار لتصميم واجهة", "استفسار تقني", "Python Data Analysis").
3. Match the language of the conversation (Arabic if Arabic, English if English).
4. Output ONLY the 2-4 word title string. No quotes, no prefix, no punctuation.

User Messages: "${conversationSample.slice(0, 350)}"
${lastAssistantText ? `Assistant Context: "${lastAssistantText.slice(0, 200)}"` : ""}`,
        config: {
          temperature: 0.2,
        },
      });

      const res = await withTimeout(titlePromise, 4000);
      let title = res.text?.replace(/["'`*\n]/g, "").trim();
      if (title && title.length >= 3 && title.length <= 50) {
        const lower = title.toLowerCase();
        if (!GREETING_WORDS.has(lower)) {
          if (isImageGen && !title.includes("🎨")) title += " 🎨";
          else if (isWebSearch && !title.includes("🌐")) title += " 🌐";
          return title;
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  // 2. معالجة ذكية احتياطية محلية (Heuristic Topic Extraction)
  if (isImageGen) {
    const subject = allUserTexts[allUserTexts.length - 1] || "توليد صورة فنية";
    const shortSubject = subject.slice(0, 30);
    return `${shortSubject} 🎨`;
  }

  if (isWebSearch) {
    const query = allUserTexts[allUserTexts.length - 1] || "بحث في الويب";
    const shortQuery = query.slice(0, 30);
    return `${shortQuery} 🌐`;
  }

  // فحص كل رسائل المستخدم للعثور على جملة حقيقية ذات مغزى وليست مجرد ترحيب
  for (const text of allUserTexts) {
    const cleaned = text.replace(/^[أإا]هلا\s+وسهلا|^مرحبا|^السلام\s+عليكم|^hi\s+there|^hello/gi, "").trim();
    if (cleaned.length >= 4) {
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const firstFew = words.slice(0, 4).join(" ");
        if (!GREETING_WORDS.has(firstFew.toLowerCase())) {
          return firstFew.length > 35 ? firstFew.slice(0, 35) + "..." : firstFew;
        }
      }
    }
  }

  return "محادثة ذكية 💬";
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

    // 1. التحقق من نية توليد الصور
    const isImageGenerationExplicit = Boolean((req.body as any)?.generateImage);
    const isImageGenerationIntent =
      isImageGenerationExplicit ||
      /^(اصنع|أنشئ|انشئ|ولد|ولّد|صمم|ارسم|اعمل|أعمل|وهات|هات|عايز\s+صورة|أريد\s+صورة|بدي\s+صورة|صورة\s+لـ|صورة\s+عن|صورة\s+ل|توليد\s+صورة|generate\s+an?\s+image|create\s+an?\s+image|draw\s+an?\s+image|paint\s+an?\s+image|image\s+of|picture\s+of)/i.test(
        userPrompt.trim()
      ) ||
      /(اصنع\s+صورة|أنشئ\s+صورة|انشئ\s+صورة|ولّد\s+صورة|ولد\s+صورة|ارسم\s+صورة|صمم\s+صورة|generate\s+image|draw\s+image|create\s+image)/i.test(
        userPrompt.trim()
      );

    // 2. الذكاء التلقائي والبحث الذاتي (Auto Grounding / Web Search)
    const userRequestedWebSearchExplicit = Boolean(
      (req.body as any)?.useWebSearch || (req.body as any)?.webSearch
    );
    const hasLiveSearchKeywords =
      /(أخبار|اخبار|اليوم|الآن|الكرة الذهبية|من هو|من هي|من الفائز|كم سعر|سعر|أسعار|اسعار|نتائج|مباراة|مباريات|طقس|أحدث|جديد|مقارنة|مواصفات|إحصائيات|تحديث|تحديثات|news|latest|today|current|price|prices|weather|who is|who won|score|match|specs|vs|versus|2024|2025|2026)/i.test(
        userPrompt
      ) ||
      /^(ما هو|ما هي|من هو|من هي|متى|أين|كيف|كم|هل|what is|who is|when did|where is|how much|is there)/i.test(
        userPrompt.trim()
      );
    const userRequestedWebSearch = userRequestedWebSearchExplicit || (hasLiveSearchKeywords && !attachedImage && !isImageGenerationIntent);

    // 3. الذاكرة الدائمة والذاكرة العابرة معطلة بالكامل لضمان عزل تام بنسبة 100% بين الشاتات
    let savedFacts: any[] = [];
    let crossChatContextText = "";
    const memoryText = "";
    const fullMemorySection = "";

    const searchInstruction = userRequestedWebSearch
      ? `\n\n4. WEB SEARCH & GROUNDING MODE (وضع البحث الحي المباشر في الويب عبر Google Search):
   - Real-time web search and live grounding are active. Ground all answers strictly in verified, factual, and up-to-date data.
   - Deliver the answer directly and concisely. Organize information using Markdown tables and structured bullet points.
   - Strictly zero filler, zero repetitive introductions, and zero fluff.
   - Conclude with the brief interactive closing suggestion.`
      : `\n\n4. STANDARD CONVERSATION MODE:
   - Deliver the requested answer immediately without preambles, introductory greetings (unless user only greeted), or conversational fluff.
   - Organize multi-attribute info, comparisons, and complex data using Markdown tables and structured bullet points.`;

    const imageAnalysisInstruction = attachedImage
      ? `\n\n7. MULTIMODAL IMAGE ANALYSIS (تحليل وفهم الصور المرفقة):
   - The user attached an image. Deliver an ultra-concise, direct analysis or answer to their question immediately.
   - Highlight key visual elements or answers in 1-3 short points with appropriate emojis 🖼️🔍.
   - Strictly no conversational padding or lengthy preambles.
   - Conclude with the brief interactive closing suggestion.`
      : "";

    const currentDateStr = "2026-08-25";
    const supremeSystemPrompt = `You are M7 AI, an advanced, highly intelligent, articulate, and direct AI assistant created by M7 TECNO.
CURRENT TIMELINE: Today is ${currentDateStr} (Year 2026). Treat 2024, 2025, and 2026 as current and recent events.

CRITICAL OPERATIONAL RULES & INTELLIGENCE DIRECTIVES:

1. INTELLIGENT SPELL CHECKING & AUTO-CORRECTION (التعامل الذكي مع الأخطاء الإملائية والمطبعية):
   - Seamless Understanding: Always understand the user's intended meaning even if their input contains spelling mistakes, typos, phonetic approximations, or missing letters. Answer their question fully, accurately, and naturally first.
   - Polite End Note: If the user's question contained an obvious spelling error, append a gentle, polite, and light correction note at the very end of your response:
     • Arabic format: "💡 ملاحظة بسيطة: كلمة «[الكلمة الخاطئة]» يُكتب الصحيح منها «[الكلمة الصحيحة]»."
     • English format: "💡 Quick note: '[misspelled word]' is correctly spelled as '[correct word]'."

2. UNCLEAR INPUT HANDLING & ZERO HALLUCINATION (التعامل مع النصوص غير المفهومة تماماً ومنع التخمين أو الهبد):
   - STRICTLY FORBIDDEN: NEVER guess, fabricate answers, hallucinate, or generate random responses when receiving gibberish, talisman-like text, chaotic keyboard smashes, or completely incomprehensible input that cannot be resolved with spell checking.
   - If the input is completely incomprehensible, respond with EXACTLY this fixed clarification sentence and nothing else:
     • Arabic: "لم أستطع فهم قصدك بشكل كامل، هل يمكنك توضيح سؤالك أو إعادة صياغته لأتمكن من مساعدتك بدقة؟ 💡"
     • English: "I couldn't fully understand your request. Could you please clarify or rephrase your question so I can assist you accurately? 💡"

3. AUTO GROUNDING & FACTUAL ACCURACY (الذكاء التلقائي والبحث الذاتي):
   - Web Search & Google Grounding is automatically integrated.
   - Whenever the user asks about current events, changing data, latest technology, technical specifications, prices, scores, or any topic requiring high certainty: automatically rely on verified search grounding to ensure 100% factual accuracy.
   - Never guess facts, dates, or numbers — rely on search grounding for accuracy.

4. TONE, STRUCTURE & READABILITY (أسلوب الإجابة والتنظيم):
   - Deliver answers directly in the very first sentence without lengthy preambles, introductory greetings (unless the user only greeted), or conversational filler.
   - For complex topics, comparisons (e.g. comparing tools, models, frameworks, specs), multi-attribute data, or structured information: ALWAYS format and organize the content using Markdown Tables (| Header | ...) and clear Bullet Points (•) for instant scannability and reading comfort.
   - Balance deep conceptual comprehension with crystal-clear explanations, upholding the highest scientific and technical rigor.

5. ARABIC LANGUAGE MASTERY (فصاحة وبلاغة اللغة العربية الفصحى المعاصرة):
   - Speak in crisp, natural, modern, and elegant Standard Arabic (لغة عربية فصحى معاصرة وبليغة وسلسة وواضحة جداً).
   - Strictly avoid literal, awkward, or robotic translations.

6. IDENTITY & CREATOR:
   - If asked who created, built, or developed you, state directly: "تم تطويري بواسطة شركة M7 TECNO ومن قبل المطور محمود صبري 🚀✨" (or in English if queried in English).

7. MANDATORY SHORT CLOSING SUGGESTION (الخاتمة التفاعلية السريعة):
   - When answering a valid question, conclude your response with one short interactive follow-up question (placed right before any spelling tip):
     • Arabic: "هل تود أن أبحث لك عن [موضوع متعلق] أو أستكشف لك [اقتراح متعلق]؟ 🔍💡"
     • English: "Would you like me to search for [related topic] or explore [related suggestion] for you? 🔍✨"${searchInstruction}${imageAnalysisInstruction}

8. LANGUAGE & TONE MATCHING (محاكاة أسلوب المستخدم - Mirroring Technique):
   - Dynamic Tone Adaptation: Carefully analyze the user's conversational vibe, phrasing, and personality from their current message and historical memory:
     • Friendly & Respectful / Warm Peer: If the user talks like a close, respectful friend ("يا صاحبي", "أخي الغالي", "حبيبي", "يا فنان", polite banter), adapt seamlessly and reply as a supportive, warm, highly respectful buddy ("صاحب محترم") without being overly formal.
     • Sharp, Direct, or Challenging: If the user writes with a sharp, blunt, assertive, or cynical tone, adapt to their directness and match their cadence with confident, sharp, uncompromising, and razor-sharp intellect—STRICTLY with ZERO profanity, ZERO vulgarity, and ZERO insults.
     • Professional / Formal: If the user writes formally or academically, mirror their structured, professional diction.
   - Cognitive Alignment (محاكاة منطق وتفكير المستخدم): Reference the user's accumulated memory facts, cognitive preferences, interests, domain habits, and thinking style to provide solutions that resonate with how they reason.

9. ADAPTIVE MEMORY & PERSONA EXTRACTION (تخزين واستخراج الملف الشخصي للذاكرة طويلة المدى):
   - Extract and store any user attributes, interests, career/skills, nicknames, recurring dialect quirks, common spelling patterns, preferred topics, or personal preferences using:
     <M7MEMORY>{"key":"english_key","value":"fact_value","label":"arabic_label"}</M7MEMORY>

10. INTERACTIVE QUICK SUGGESTIONS (أزرار الاقتراحات السريعة التفاعلية):
   - At the very end of EVERY response, attach 2 to 3 concise, relevant follow-up suggestions or questions for what the user might ask next.
   - Format them strictly as a valid JSON array within the tag: <M7SUGGESTIONS>["اقتراح 1 🚀", "اقتراح 2 💡", "اقتراح 3 📋"]</M7SUGGESTIONS>
   - Keep each suggestion short (under 7 words) with a fitting emoji.
${fullMemorySection}`;

    const ai = getAiClient();
    let rawAiText = "";
    let isWebSearch = userRequestedWebSearch;
    let isImageGeneration = false;
    let generatedImageUrl: string | null = null;
    let searchSources: Array<{ title: string; uri: string; domain?: string }> = [];

    // ── GIBBERISH & INCOMPREHENSIBLE INPUT FAST-HANDLING ─────────────────────
    const gibberishCheck = checkGibberishOrAmbiguous(userPrompt);
    if (gibberishCheck.isGibberish && !attachedImage && !isImageGenerationIntent) {
      const clarifyMsg = gibberishCheck.isEnglish
        ? "I couldn't fully understand your request. Could you please clarify or rephrase your question so I can assist you accurately? 💡"
        : "لم أستطع فهم قصدك بشكل كامل، هل يمكنك توضيح سؤالك أو إعادة صياغته لأتمكن من مساعدتك بدقة؟ 💡";

      rawAiText = clarifyMsg;
    } else if (isImageGenerationIntent && !attachedImage) {
      // ── IMAGE GENERATION HANDLING (توليد الصور الدقيق) ─────────────────────────
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
        rawAiText = `Here is your high-definition AI generated artwork (${subjectPreview || "Masterpiece"})! 🎨✨\n\nWould you like me to adjust any visual details or explore another creative concept for you? 🔍💡`;
      } else {
        const topicName = subjectPreview ? `(${subjectPreview})` : "";
        rawAiText = `تم توليد الصورة لك بأعلى درجات الدقة والجمال الفني ${topicName}! 🎨✨\n\nهل تود أن أعدل لك بعض التفاصيل في هذا التصميم أو أنشئ لك مفهوماً بصرياً آخر؟ 🔍💡`;
      }
    } else if (!ai) {
      // Fallback message when API key is not yet set
      rawAiText = "أهلاً بك في M7 AI! 🤖✨ يرجى تفعيل مفتاح `GEMINI_API_KEY` في إعدادات البيئة للبدء فوراً.\n\nهل تود أن أستعرض لك خطوات الضبط أو أساعدك في أي استفسار آخر؟ 🔍💡";
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

      const contents = sanitizeForGemini(messages, attachedImage, liveWebContext);

      // قائمة النماذج الصالحة والمتوافقة مع SDK وGoogle Search Grounding
      const searchModels = [
        { model: "gemini-3.1-flash-lite", timeoutMs: 18000 },
        { model: "gemini-3.7-flash", timeoutMs: 25000 },
        { model: "gemini-flash-latest", timeoutMs: 20000 },
        { model: "gemini-3.1-pro-preview", timeoutMs: 25000 },
      ];

      const chatModels = [
        { model: "gemini-3.1-flash-lite", timeoutMs: 18000 },
        { model: "gemini-3.7-flash", timeoutMs: 25000 },
        { model: "gemini-flash-latest", timeoutMs: 20000 },
        { model: "gemini-3.1-pro-preview", timeoutMs: 25000 },
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

      // 1. محاولة البحث المباشر عبر Google Search Grounding مع مهلة زمنية ذكية وتراجع أسي
      if (userRequestedWebSearch && !attachedImage && Date.now() > googleSearchGroundingQuotaExhaustedUntil) {
        for (const { model, timeoutMs } of searchModels) {
          if (success) break;

          try {
            const response = await executeWithBackoff(
              () =>
                ai.models.generateContent({
                  model,
                  contents,
                  config: {
                    systemInstruction: supremeSystemPrompt,
                    temperature: 0.3,
                    tools: [{ googleSearch: {} }],
                  },
                }),
              timeoutMs
            );
            const text = response.text?.trim();
            if (text) {
              rawAiText = text;
              success = true;

              // استخراج مصادر البحث الحقيقية من Grounding Metadata
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
            const errStr = String(err?.message || err?.status || err || "");
            const isQuotaErr = /exceeded\s*your\s*current\s*quota|RESOURCE_EXHAUSTED|429/i.test(errStr);
            if (isQuotaErr) {
              googleSearchGroundingQuotaExhaustedUntil = Date.now() + 15 * 60 * 1000;
              break;
            }
            console.warn(`Search grounding attempt with ${model} failed/timed out:`, err?.message || err);
            lastErr = err;
            const retrySec = parseRetryDelay(err);
            if (retrySec > 0) detectedRetrySeconds = retrySec;
          }
        }
      }

      // 2. الوضع المعتاد أو مسار الطوارئ السريع في حال تعذر Grounding
      if (!success) {
        for (const { model, timeoutMs } of chatModels) {
          if (success) break;

          try {
            const response = await executeWithBackoff(
              () =>
                ai.models.generateContent({
                  model,
                  contents,
                  config: {
                    systemInstruction: supremeSystemPrompt,
                    temperature: 0.35,
                  },
                }),
              timeoutMs
            );
            const text = response.text?.trim();
            if (text) {
              rawAiText = text;
              success = true;
              break;
            }
          } catch (err: any) {
            console.warn(`Standard chat attempt with ${model} failed/timed out:`, err?.message || err);
            lastErr = err;
            const retrySec = parseRetryDelay(err);
            if (retrySec > 0) detectedRetrySeconds = retrySec;
          }
        }
      }

      // 3. Fallback graceful response if all Google models are momentarily rate-limited
      if (!success) {
        const lastUserText = messages[messages.length - 1]?.content || "";
        const isEnglish = /[a-zA-Z]{4,}/.test(lastUserText);

        if (searchSources.length > 0) {
          const formattedSnippets = searchSources
            .slice(0, 3)
            .map((r) => `🔹 **${r.title}**\nالمصدر: ${r.domain || "الويب"}`)
            .join("\n\n");

          if (isEnglish) {
            rawAiText = `🌐 **Live Web Search Results**:\n\n${formattedSnippets}\n\n💡 Results retrieved directly from verified web sources. Would you like more details on any of these? 🔍✨`;
          } else {
            rawAiText = `🌐 **نتائج البحث المباشر**:\n\n${formattedSnippets}\n\n💡 تم جلب هذه البيانات المحدثة من مصادر الويب الحية. هل تحب أتعمق معاك في تفاصيل أي نتيجة منهم؟ 🔍✨`;
          }
        } else {
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

    const { cleanText: textWithoutSuggestions, suggestions: extractedSuggestions } =
      extractSuggestionsTags(rawAiText);

    const isEnglishResponse =
      /[a-zA-Z]{4,}/.test(textWithoutSuggestions) &&
      !/[\u0600-\u06FF]/.test(textWithoutSuggestions);

    const finalSuggestions =
      extractedSuggestions.length > 0
        ? extractedSuggestions
        : generateFallbackSuggestions(
            textWithoutSuggestions,
            isEnglishResponse,
            isImageGeneration,
            gibberishCheck.isGibberish
          );

    const aiText = stripMemoryTags(textWithoutSuggestions);

    // 4. Resolve or create unique conversation record
    let effectiveConversationId = conversationId?.trim() || null;
    if (effectiveConversationId) {
      try {
        const [existing] = await db
          .select()
          .from(conversationsTable)
          .where(and(eq(conversationsTable.id, effectiveConversationId), eq(conversationsTable.userId, userId)));
        if (!existing) {
          // If a specific conversationId was passed but not yet recorded in DB, create it
          await db
            .insert(conversationsTable)
            .values({ id: effectiveConversationId, userId, title: "محادثة جديدة" });
        }
      } catch (checkErr) {
        console.warn("Could not check/ensure conversation existence:", checkErr);
      }
    } else {
      // If no conversationId was provided, generate a brand new conversation record
      try {
        const [newConv] = await db
          .insert(conversationsTable)
          .values({ userId, title: "محادثة جديدة" })
          .returning();
        if (newConv) {
          effectiveConversationId = newConv.id;
        }
      } catch (createErr) {
        console.warn("Could not auto-create new conversation:", createErr);
      }
    }

    // Save conversation messages to the specific effectiveConversationId
    if (effectiveConversationId) {
      try {
        let userContentToSave = lastMessage.content || "";
        if (attachedImage) {
          const userImgDataUrl = `data:${attachedImage.mimeType || "image/jpeg"};base64,${attachedImage.data.replace(/^data:[^;]+;base64,/, "")}`;
          userContentToSave = `<M7IMAGE>${JSON.stringify({ url: userImgDataUrl })}</M7IMAGE>\n${userContentToSave}`.trim();
        } else if (lastMessage.imageUrl) {
          userContentToSave = `<M7IMAGE>${JSON.stringify({ url: lastMessage.imageUrl })}</M7IMAGE>\n${userContentToSave}`.trim();
        }

        let assistantContentToSave = aiText;
        if (finalSuggestions && finalSuggestions.length > 0) {
          assistantContentToSave = `<M7SUGGESTIONS>${JSON.stringify(finalSuggestions)}</M7SUGGESTIONS>\n${assistantContentToSave}`.trim();
        }
        if (generatedImageUrl) {
          assistantContentToSave = `<M7IMAGE>${JSON.stringify({ url: generatedImageUrl })}</M7IMAGE>\n${assistantContentToSave}`.trim();
        }
        if (searchSources && searchSources.length > 0) {
          assistantContentToSave = `<M7SOURCES>${JSON.stringify(searchSources.slice(0, 5))}</M7SOURCES>\n${assistantContentToSave}`.trim();
        }

        await db.insert(messagesTable).values([
          { conversationId: effectiveConversationId, role: "user", content: userContentToSave },
          { conversationId: effectiveConversationId, role: "assistant", content: assistantContentToSave },
        ]);

        // Auto-update conversation title and updatedAt timestamp ONLY for this specific conversation
        try {
          const [existingConv] = await db
            .select()
            .from(conversationsTable)
            .where(and(eq(conversationsTable.id, effectiveConversationId), eq(conversationsTable.userId, userId)));

          let updatedTitle: string | undefined;
          const defaultTitles = new Set(["محادثة جديدة", "New Chat", "محادثة ذكية 💬", ""]);
          const isGenericGreeting = existingConv && (
            defaultTitles.has(existingConv.title?.trim() || "") ||
            /^(مرحبا|أهلا|اهلاً|أهلاً|hi|hello|hey)$/i.test(existingConv.title?.trim() || "")
          );

          if (existingConv && (isGenericGreeting || !existingConv.title)) {
            updatedTitle = await generateSmartConversationTitle(
              messages,
              isImageGeneration,
              isWebSearch,
              ai
            );
          }

          await db
            .update(conversationsTable)
            .set({
              ...(updatedTitle ? { title: updatedTitle } : {}),
              updatedAt: new Date(),
            })
            .where(and(eq(conversationsTable.id, effectiveConversationId), eq(conversationsTable.userId, userId)));
        } catch (convUpdateErr) {
          console.warn("Could not update conversation timestamp/title:", convUpdateErr);
        }
      } catch (dbErr) {
        console.warn("Could not persist messages:", dbErr);
      }
    }

    res.json({
      conversationId: effectiveConversationId,
      message: aiText,
      role: "assistant",
      imageUrl: generatedImageUrl,
      isWebSearch,
      isImageGeneration,
      searchSources: searchSources.slice(0, 5),
      suggestions: finalSuggestions,
    });
  } catch (err) {
    console.error("Server error in /api/chat:", err);
    const errorMessage =
      err instanceof Error ? err.message : "حدث خطأ في الخادم الداخلي";
    res.status(500).json({ error: errorMessage });
  }
});

export default router;

