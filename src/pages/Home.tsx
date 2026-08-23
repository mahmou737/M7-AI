import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Brain,
  Mic,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Zap,
  ShieldCheck,
  Languages,
  UserCircle,
  LogIn,
  UserPlus,
  Bot
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [quickPrompt, setQuickPrompt] = useState("");

  const isRtl = i18n.language === "ar";

  const toggleLanguage = () => {
    const next = isRtl ? "en" : "ar";
    i18n.changeLanguage(next);
    document.dir = next === "ar" ? "rtl" : "ltr";
  };

  const handleStartChat = (initialText?: string) => {
    const textToSend = initialText ?? quickPrompt;
    if (textToSend.trim()) {
      sessionStorage.setItem("m7_initial_prompt", textToSend.trim());
    }
    navigate("/chat");
  };

  const PROMPT_CHIPS = isRtl
    ? [
        { label: "💡 كيف أطور مهاراتي في البرمجة؟", text: "كيف أطور مهاراتي في البرمجة وأبدأ مساراً مهنياً ناجحاً؟" },
        { label: "📊 صمم لي خطة عمل لمشروع ناشئ", text: "صمم لي خطة عمل واضحة ومبتكرة لمشروع ناشئ في مجال التقنية" },
        { label: "✍️ اكتب رسالة تقديم رسمية للوظيفة", text: "اكتب لي رسالة تغطية (Cover Letter) احترافية لوظيفة مهندس برمجيات" },
        { label: "🧠 لخص لي مفهوم الحوسبة السحابية", text: "اشرح لي مفهوم الحوسبة السحابية والذكاء الاصطناعي ببساطة وأمثلة عملية" },
      ]
    : [
        { label: "💡 How to level up coding skills?", text: "How can I level up my software engineering skills and build a great portfolio?" },
        { label: "📊 Create a startup business plan", text: "Draft a concise business plan for an innovative AI tech startup" },
        { label: "✍️ Write a professional cover letter", text: "Write a polished and compelling cover letter for a Senior Developer role" },
        { label: "🧠 Explain Cloud Computing simply", text: "Explain Cloud Computing and modern AI architectures with practical examples" },
      ];

  const FEATURES = isRtl
    ? [
        {
          icon: Brain,
          title: "الذاكرة الذكية المستمرة",
          desc: "يتذكر M7 سياقك واهتماماتك ومعلوماتك بين الجلسات ليقدم لك إجابات مخصصة تناسبك تماماً.",
          badge: "ذاكرة فورية",
        },
        {
          icon: Mic,
          title: "المحادثات الصوتية التفاعلية",
          desc: "إمكانية الإملاء الصوتي المباشر باللغة العربية مع نطق الإجابات صوتياً بنقاء ووضوح.",
          badge: "صوت ونطق",
        },
        {
          icon: Zap,
          title: "استجابة فائقة مدعومة بـ Gemini",
          desc: "فهم عميق للغة العربية الفصحى واللهجات، مع قدرات متقدمة في البرمجة، والتحليل، والإبداع.",
          badge: "سرعة ودقة",
        },
        {
          icon: ShieldCheck,
          title: "تحكم كامل وخصوصية",
          desc: "إمكانية إدارة وتعديل الذاكرة المخزنة، حفظ أرشيف المحادثات، والبحث السريع في أي وقت.",
          badge: "أمان ومرونة",
        },
      ]
    : [
        {
          icon: Brain,
          title: "Persistent Smart Memory",
          desc: "M7 remembers your preferences, project details, and background across conversations.",
          badge: "Context Aware",
        },
        {
          icon: Mic,
          title: "Interactive Voice & Speech",
          desc: "Speak naturally using voice-to-text and listen to responses with fluid audio synthesis.",
          badge: "Voice Enabled",
        },
        {
          icon: Zap,
          title: "Powered by Advanced AI",
          desc: "Instant, deep analytical reasoning, multilingual comprehension, and code generation.",
          badge: "Ultra Fast",
        },
        {
          icon: ShieldCheck,
          title: "Full Privacy & Control",
          desc: "Easily inspect and edit stored memory facts, organize chat threads, and manage data.",
          badge: "Secure",
        },
      ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0b0d10] text-[#f8fafc] light:bg-[#f8fafc] light:text-[#0f172a] overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-200" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── Top Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 light:border-slate-200 bg-[#0b0d10]/80 light:bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20">
          {/* Logo badge */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <span className="font-extrabold text-black text-sm tracking-wider">M7</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white light:text-slate-900">M7 AI</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 light:text-amber-700 border border-amber-500/30 rounded-md">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 light:text-slate-500 font-medium">
                {isRtl ? "المساعد الذكي المتكامل" : "Smart AI Companion"}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle showLabel={false} isRtl={isRtl} />

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 rounded-xl transition-all"
              title="تغيير اللغة / Switch language"
            >
              <Languages className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
              <span>{isRtl ? "English" : "العربية"}</span>
            </button>

            {user ? (
              <>
                {/* Profile / Account button */}
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 rounded-xl transition-all"
                >
                  <UserCircle className="w-4 h-4 text-amber-400 light:text-amber-600" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user?.displayName || (isRtl ? "الملف الشخصي" : "Profile")}
                  </span>
                </button>

                {/* Enter Chat button */}
                <Button
                  onClick={() => handleStartChat()}
                  className="gap-2 font-bold px-4 py-2 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 rounded-xl transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isRtl ? "فتح المحادثة" : "Open Chat"}</span>
                </Button>
              </>
            ) : (
              <>
                {/* Login button */}
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="gap-1.5 text-xs font-bold border-white/10 light:border-slate-300 text-slate-200 light:text-slate-800 hover:bg-white/10 light:hover:bg-slate-100 rounded-xl px-3 py-2"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                  <span>{isRtl ? "تسجيل الدخول" : "Login"}</span>
                </Button>

                {/* Start Chat button */}
                <Button
                  onClick={() => handleStartChat()}
                  className="gap-2 font-bold px-4 py-2 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 rounded-xl transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isRtl ? "بدء الشات" : "Start Chat"}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center justify-center">
        {/* Glow ambient background accents */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[35rem] h-[20rem] bg-amber-500/10 blur-[120px] pointer-events-none -z-10 rounded-full" />
        <div className="absolute top-64 left-1/4 w-[25rem] h-[20rem] bg-sky-500/5 blur-[100px] pointer-events-none -z-10 rounded-full" />

        {/* Hero Header */}
        <div className="text-center max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 light:text-amber-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{isRtl ? "تجربة ذكاء اصطناعي تفاعلية وسريعة" : "Next-Gen Conversational Intelligence"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.2] text-white light:text-slate-900">
            {isRtl ? (
              <>
                المساعد الذكي <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 light:from-amber-600 light:via-amber-500 light:to-amber-700">M7 AI</span>
                <br />
                لإنجاز أفكارك وأعمالك
              </>
            ) : (
              <>
                Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 light:from-amber-600 light:via-amber-500 light:to-amber-700">M7 AI</span>
                <br />
                Your Smartest Companion
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 light:text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {isRtl
              ? "رفيقك الذكي المتقدم في المحادثة، البرمجة، والكتابة الإبداعية. يدعم الإدخال الصوتي، النطق الآلي، والذاكرة المستمرة لتجربة مخصصة لك بالكامل."
              : "An intelligent conversational assistant with persistent memory, voice recognition, real-time speech synthesis, and deep reasoning."}
          </p>
        </div>

        {/* ── Interactive Launch Box ────────────────────────────────────── */}
        <div className="w-full max-w-2xl mt-8 sm:mt-12 bg-white/[0.03] light:bg-white backdrop-blur-2xl border border-white/10 light:border-slate-200 p-2.5 sm:p-3.5 rounded-2xl shadow-2xl shadow-black/40 light:shadow-slate-200/50 relative group focus-within:border-amber-500/50 transition-all">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartChat();
            }}
            className="flex flex-col sm:flex-row gap-2.5 items-stretch"
          >
            <div className="relative flex-1">
              <Bot className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
              <Input
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder={
                  isRtl
                    ? "اسأل M7 عن أي شيء، كود برمجي، خطة عمل، أو فكرة..."
                    : "Ask M7 anything, code, plan, essay, or ideas..."
                }
                className="pr-12 pl-4 h-13 bg-black/40 light:bg-slate-50 border-0 focus-visible:ring-0 text-white light:text-slate-900 placeholder:text-slate-500 text-sm sm:text-base rounded-xl"
              />
            </div>
            <Button
              type="submit"
              className="h-13 px-6 gap-2 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 rounded-xl"
            >
              <span>{isRtl ? "بدء المحادثة" : "Start Chat"}</span>
              {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="mt-4 pt-3 border-t border-white/5 light:border-slate-200 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-medium text-slate-400 light:text-slate-500 px-1">
              {isRtl ? "اقتراحات سريعة:" : "Quick Ideas:"}
            </span>
            {PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleStartChat(chip.text)}
                className="text-xs bg-white/5 light:bg-slate-100 hover:bg-amber-500/10 hover:border-amber-500/30 border border-white/10 light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-amber-300 light:hover:text-amber-700 px-3 py-1.5 rounded-lg transition-all text-right"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Feature Cards Grid ────────────────────────────────────────── */}
        <div className="w-full max-w-6xl mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="group relative p-6 rounded-2xl bg-white/[0.02] light:bg-white hover:bg-white/[0.05] light:hover:bg-slate-50 border border-white/10 light:border-slate-200 hover:border-amber-500/30 transition-all duration-300 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 light:bg-amber-100 text-amber-400 light:text-amber-700 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-white/5 light:bg-slate-100 text-slate-300 light:text-slate-700 border border-white/10 light:border-slate-200">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white light:text-slate-900 mb-2 group-hover:text-amber-400 light:group-hover:text-amber-600 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Live Interactive Preview Card ─────────────────────────────── */}
        <div className="w-full max-w-4xl mt-16 sm:mt-20 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent light:from-white light:to-slate-50 border border-white/10 light:border-slate-200 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-500/10 text-green-400 light:text-green-700 text-xs font-semibold border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-400 light:bg-green-600 animate-pulse" />
                {isRtl ? "جاهز للرد فوراً" : "Online & Ready"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white light:text-slate-900">
                {isRtl ? "محادثات ذكية وسلسة في متناول يدك" : "Fluid Conversations at Your Fingertips"}
              </h2>
              <p className="text-sm text-slate-300 light:text-slate-600 max-w-lg">
                {isRtl
                  ? "سواء كنت بحاجة إلى كتابة مقالات، حل مسائل برمجية، تدقيق لغوي، أو محادثة صوتية فورية، M7 AI جاهز لخدمتك."
                  : "From coding and creative writing to instant voice dialogue, M7 AI is tailored to accelerate your everyday workflow."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button
                onClick={() => navigate("/chat")}
                className="h-12 px-6 font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 rounded-xl"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isRtl ? "دخول إلى الشات" : "Enter Chat"}</span>
              </Button>
              {user ? (
                <Button
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="h-12 px-5 font-semibold text-slate-200 light:text-slate-800 border-white/10 light:border-slate-300 hover:bg-white/10 light:hover:bg-slate-100 rounded-xl"
                >
                  <UserCircle className="w-4 h-4 text-amber-400 light:text-amber-600" />
                  <span>{isRtl ? "إعدادات الحساب" : "Account Settings"}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="h-12 px-5 font-semibold text-slate-200 light:text-slate-800 border-white/10 light:border-slate-300 hover:bg-white/10 light:hover:bg-slate-100 rounded-xl"
                >
                  <LogIn className="w-4 h-4 text-amber-400 light:text-amber-600" />
                  <span>{isRtl ? "تسجيل الدخول" : "Login"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-white/5 light:border-slate-200 py-6 px-4 sm:px-6 mt-12 bg-[#0b0d10] light:bg-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 light:text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400 light:text-amber-600">M7 AI</span>
            <span>—</span>
            <span>{isRtl ? "المساعد الذكي العربي المتقدم" : "Advanced AI Assistant"}</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/chat")} className="hover:text-white light:hover:text-black transition-colors">
              {isRtl ? "المحادثة" : "Chat"}
            </button>
            <button onClick={() => navigate("/profile")} className="hover:text-white light:hover:text-black transition-colors">
              {isRtl ? "الملف الشخصي" : "Profile"}
            </button>
            <button onClick={() => navigate("/login")} className="hover:text-white light:hover:text-black transition-colors">
              {isRtl ? "تسجيل الدخول" : "Login"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
