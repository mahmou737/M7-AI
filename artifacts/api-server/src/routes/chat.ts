import { Router } from "express";
import { SendMessageBody } from "@workspace/api-zod";

const router = Router();

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

const SYSTEM_PROMPT =
  "أنت M7 AI، مساعد ذكاء اصطناعي متقدم يتحدث العربية بطلاقة. " +
  "تجيب بأسلوب واضح ومفيد وودي. استخدم العربية الفصحى البسيطة. " +
  "عند الحاجة للتعداد أو الخطوات، نظّمها بشكل جميل ومرتب. " +
  "لا تستخدم الإيموجي في ردودك.";

router.post("/", async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "طلب غير صالح" });
    return;
  }

  const { messages } = parsed.data;

  try {
    const response = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
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

    const text = data.choices?.[0]?.message?.content ?? "";
    res.json({ message: text, role: "assistant" });
  } catch (err) {
    req.log.error({ err }, "Chat route error");
    res.status(500).json({ error: "حدث خطأ أثناء معالجة طلبك" });
  }
});

export default router;
