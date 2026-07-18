import { Router } from "express";
import { SendMessageBody } from "@workspace/api-zod";

const router = Router();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const SYSTEM_PROMPT =
  "أنت M7 AI، مساعد ذكاء اصطناعي متقدم يتحدث العربية بطلاقة. " +
  "تجيب بأسلوب واضح ومفيد وودي. استخدم العربية الفصحى البسيطة. " +
  "عند الحاجة للتعداد أو الخطوات، نظّمها بشكل جميل ومرتب.";

router.post("/", async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "طلب غير صالح" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "مفتاح API غير مضبوط" });
    return;
  }

  const { messages } = parsed.data;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.error({ status: response.status, body: errText }, "Anthropic API error");
      res.status(500).json({ error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" });
      return;
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const text = data.content.find((b) => b.type === "text")?.text ?? "";
    res.json({ message: text, role: "assistant" });
  } catch (err) {
    req.log.error({ err }, "Chat route error");
    res.status(500).json({ error: "حدث خطأ أثناء معالجة طلبك" });
  }
});

export default router;
