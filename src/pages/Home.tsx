import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  Brain,
  MessageSquareCode,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Zap,
  ShieldCheck,
  Languages,
  UserCircle,
  LogIn,
  LogOut,
  Settings,
  Users,
  Sun,
  Moon,
  Bot,
  BookOpen,
  Code2,
  Cpu,
  Feather,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { PricingModal } from "@/components/PricingModal";

export default function Home() {
  const [, navigate] = useLocation();
  const { user, plan, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();
  const [quickPrompt, setQuickPrompt] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isRtl = i18n.language === "ar";
  const isDark = theme === "dark";
  const isPro = plan === "pro";

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleLanguage = () => {
    const next = isRtl ? "en" : "ar";
    i18n.changeLanguage(next);
    document.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
    localStorage.setItem("i18nextLng", next);
    localStorage.setItem("m7_lang", next);
  };

  const handleStartChat = (initialText?: string) => {
    const textToSend = initialText ?? quickPrompt;
    if (textToSend.trim()) {
      sessionStorage.setItem("m7_initial_prompt", textToSend.trim());
    }
    navigate("/chat");
  };

  // 2x2 Feature Cards per user specification
  // Card 1 (Top Right): Book & Quill -> "توليد أفكار ومحتوى"
  // Card 2 (Top Left): Chat with speed -> "استجابة فائقة السرعة"
  // Card 3 (Bottom Right): Brain network -> "تعلم وفهم سياقي"
  // Card 4 (Bottom Left): Code </> & key -> "كتابة شفرات برمجية"

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-[var(--bg-primary)] text-[var(--text-main)] overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-300"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ── 1. شريط العنونة العلوي (Header) ────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-xl">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          {/* الجانب الأيمن (Right side in RTL): أيقونة دائرية رمادية داخلها رمز البروفايل باللون البرتقالي */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              type="button"
              className="w-10 h-10 rounded-full bg-[var(--bg-card)] hover:opacity-80 border border-[var(--border-color)] flex items-center justify-center text-[#F59E0B] shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={isRtl ? "الملف الشخصي والإعدادات" : "Profile & Settings"}
              aria-label="Profile Menu"
              aria-expanded={isProfileMenuOpen}
            >
              {user?.displayName ? (
                <span className="font-bold text-xs text-[#F59E0B]">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </span>
              ) : (
                <UserCircle className="w-5 h-5 text-[#F59E0B]" />
              )}
            </button>

            {/* القائمة المنسدلة للإعدادات والحسابات */}
            {isProfileMenuOpen && (
              <div
                className={`absolute ${
                  isRtl ? "right-0 sm:right-0" : "left-0 sm:left-0"
                } top-12 w-64 sm:w-72 rounded-[20px] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
              >
                {/* معلومات المستخدم */}
                <div className="px-3 py-2 mb-1 border-b border-[var(--border-color)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center font-bold text-xs">
                    {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "M7"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">
                      {user?.displayName || (isRtl ? "مستخدم M7 AI" : "M7 AI User")}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {user?.email || "m7@ai.user"}
                    </p>
                  </div>
                </div>

                {/* خيارات القائمة */}
                <div className="space-y-1">
                  {/* تغيير اللغة */}
                  <button
                    onClick={() => {
                      toggleLanguage();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Languages className="w-4 h-4 text-[#F59E0B]" />
                      <span>{isRtl ? "تغيير اللغة" : "Change Language"}</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#F59E0B]">
                      {isRtl ? "English" : "العربية"}
                    </span>
                  </button>

                  {/* تغيير الثيم */}
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDark ? (
                        <Sun className="w-4 h-4 text-[#F59E0B]" />
                      ) : (
                        <Moon className="w-4 h-4 text-amber-600" />
                      )}
                      <span>{isRtl ? "تغيير اللون / الثيم" : "Theme Mode"}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
                      {isDark ? (isRtl ? "فاتح" : "Light") : (isRtl ? "داكن" : "Dark")}
                    </span>
                  </button>

                  {/* الحسابات */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-[#F59E0B]" />
                      <span>{isRtl ? "الحسابات" : "Accounts"}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {user ? (isRtl ? "تبديل" : "Switch") : (isRtl ? "دخول" : "Login")}
                    </span>
                  </button>

                  {/* باقات الاشتراك */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsPricingOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Crown className="w-4 h-4 text-[#F59E0B]" />
                      <span>{isRtl ? "باقات الاشتراك والترقية" : "Subscription & Pricing"}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300">
                      {isPro ? "PRO" : "$5/mo"}
                    </span>
                  </button>

                  {/* إعدادات الحساب */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#F59E0B]" />
                    <span>{isRtl ? "إعدادات الحساب" : "Account Settings"}</span>
                  </button>
                </div>

                {/* تسجيل الخروج / الدخول */}
                <div className="mt-1 pt-1 border-t border-[var(--border-color)]">
                  {user ? (
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate("/login");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-xl transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isRtl ? "تسجيل الدخول" : "Sign In"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* المنتصف: نص عنوان الواجهة وبخط عريض: M7-AI */}
          <div
            className="flex items-center justify-center cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[var(--text-main)]">
              M7-AI
            </span>
          </div>

          {/* الجانب الأيسر (Left side in RTL): مربع صغير بحواف دائرية، خلفية كارت مع أيقونة المخ باللون البرتقالي */}
          <div
            className="w-10 h-10 rounded-[14px] bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shadow-md cursor-pointer hover:border-[#F59E0B]/40 transition-colors"
            onClick={() => navigate("/")}
            title="M7 Brain"
          >
            <Brain className="w-5 h-5 text-[#F59E0B]" />
          </div>
        </div>
      </header>

      {/* ── 2. منطقة الترحيب والنص الرئيسي (Hero Section) ──────────────────── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-7 flex flex-col items-center justify-center">
        {/* Glow ambient background accent */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[28rem] h-[14rem] bg-[#F59E0B]/10 blur-[90px] pointer-events-none -z-10 rounded-full" />

        {/* Hero Title & Status Badge */}
        <div className="text-center space-y-2.5 max-w-xl">
          {/* العنوان الرئيسي */}
          <h1 className="text-2xl sm:text-3xl md:text-[34px] font-black tracking-tight leading-snug">
            {isRtl ? (
              <>
                <span className="text-[var(--text-main)]">المساعد الذكي </span>
                <span className="text-[#F59E0B]">:M7 AI</span>
                <br />
                <span className="text-[var(--text-main)]">أفكارك، مُنجزة.</span>
              </>
            ) : (
              <>
                <span className="text-[var(--text-main)]">Smart Assistant </span>
                <span className="text-[#F59E0B]">:M7 AI</span>
                <br />
                <span className="text-[var(--text-main)]">Your thoughts, done.</span>
              </>
            )}
          </h1>

          {/* شارة الحالة (Status Badge) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isRtl ? "جاهز للرد فوراً" : "Ready to Respond Instantly"}</span>
          </div>
        </div>

        {/* ── 3. شبكة الميزات (2x2 Grid Layout) ────────────────────────────── */}
        <div className="w-full max-w-xl mt-5 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* الكارت الأول (أعلى اليمين في العربية): توليد أفكار ومحتوى */}
          <div
            onClick={() =>
              handleStartChat(
                isRtl
                  ? "اكتب لي محتوى إبداعي وأفكار ملهمة"
                  : "Write creative content and inspiring ideas for me"
              )
            }
            className="group p-3.5 sm:p-4 rounded-[18px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] hover:border-[#F59E0B]/40 transition-all duration-200 flex flex-col items-center text-center shadow-md cursor-pointer"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] mb-1 group-hover:text-[#F59E0B] transition-colors">
              {isRtl ? "توليد أفكار ومحتوى" : "Idea & Content Creation"}
            </h3>
            <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-tight">
              {isRtl ? "منشورات، مقالات، وأفكار إبداعية." : "Posts, essays, and creative ideas."}
            </p>
          </div>

          {/* الكارت الثاني (أعلى اليسار في العربية): استجابة فائقة السرعة */}
          <div
            onClick={() =>
              handleStartChat(
                isRtl
                  ? "ما هي أسرع طريقة لتحليل البيانات؟"
                  : "What is the fastest way to analyze large datasets?"
              )
            }
            className="group p-3.5 sm:p-4 rounded-[18px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] hover:border-[#F59E0B]/40 transition-all duration-200 flex flex-col items-center text-center shadow-md cursor-pointer"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mb-2 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] mb-1 group-hover:text-[#F59E0B] transition-colors">
              {isRtl ? "استجابة فائقة السرعة" : "Ultra-Fast Response"}
            </h3>
            <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-tight">
              {isRtl ? "تحليل ذكي فوري لاستفساراتك." : "Instant smart analysis for queries."}
            </p>
          </div>

          {/* الكارت الثالث (أسفل اليمين في العربية): تعلم وفهم سياقي */}
          <div
            onClick={() =>
              handleStartChat(
                isRtl
                  ? "تذكر هذا السياق لمشروعي الجديد"
                  : "Remember this context for my upcoming project"
              )
            }
            className="group p-3.5 sm:p-4 rounded-[18px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] hover:border-[#F59E0B]/40 transition-all duration-200 flex flex-col items-center text-center shadow-md cursor-pointer"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mb-2 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] mb-1 group-hover:text-[#F59E0B] transition-colors">
              {isRtl ? "تعلم وفهم سياقي" : "Contextual Understanding"}
            </h3>
            <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-tight">
              {isRtl ? "يتذكر سياق محادثاتك لإجابات أدق." : "Remembers context for precise answers."}
            </p>
          </div>

          {/* الكارت الرابع (أسفل اليسار في العربية): كتابة شفرات برمجية */}
          <div
            onClick={() =>
              handleStartChat(
                isRtl
                  ? "ساعدني في كتابة كود برمجي بلغة TypeScript"
                  : "Help me write high-performance TypeScript code"
              )
            }
            className="group p-3.5 sm:p-4 rounded-[18px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] hover:border-[#F59E0B]/40 transition-all duration-200 flex flex-col items-center text-center shadow-md cursor-pointer"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mb-2 group-hover:scale-110 transition-transform">
              <Code2 className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] mb-1 group-hover:text-[#F59E0B] transition-colors">
              {isRtl ? "كتابة شفرات برمجية" : "Code Generation"}
            </h3>
            <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-tight">
              {isRtl ? "مساعدك الشخصي للبرمجة بلغات متعددة." : "Your assistant for multi-language code."}
            </p>
          </div>
        </div>

        {/* ── 4. منطقة العمليات والتفاعل (Action Section) ────────────────────── */}
        <div className="w-full max-w-xl mt-5 sm:mt-6 space-y-2.5">
          {/* زر الإجراء الرئيسي (Primary CTA): زر عريض برتقالي كامل #F59E0B مع نص أسود عريض: اضغط لتبدأ الآن */}
          <Button
            onClick={() => handleStartChat()}
            type="button"
            className="w-full h-12 sm:h-13 bg-[#F59E0B] hover:bg-[#f59e0bd0] !text-black font-extrabold text-sm sm:text-base rounded-[18px] shadow-lg shadow-[#F59E0B]/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border-0"
          >
            <span className="!text-black">{isRtl ? "اضغط لتبدأ الآن" : "Click to Start Now"}</span>
            {isRtl ? <ArrowLeft className="w-4 h-4 stroke-[2.5] text-black" /> : <ArrowRight className="w-4 h-4 stroke-[2.5] text-black" />}
          </Button>

          {/* حقل الإدخال (Input Box): حقل رمادي داكن بحواف دائرية أسفل الزر البرتقالي */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartChat();
            }}
            className="relative w-full"
          >
            <div className="relative flex items-center">
              <Bot className="w-4 h-4 absolute right-4 text-[var(--text-secondary)] pointer-events-none" />
              <Input
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder={isRtl ? "اسأل M7 عن أي شيء" : "Ask M7 anything"}
                className="w-full pr-11 pl-4 h-11 bg-[var(--bg-card)] border border-[var(--border-color)] focus-visible:ring-1 focus-visible:ring-[#F59E0B] text-[var(--text-main)] placeholder:text-[var(--text-secondary)] text-xs sm:text-sm rounded-[18px]"
              />
            </div>
          </form>
        </div>
      </main>

      {/* ── Minimal Footer ──────────────────────────────────────────────── */}
      <footer className="w-full border-t border-[var(--border-color)] py-3 px-4 sm:px-6 bg-[var(--bg-primary)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F59E0B]">M7-AI</span>
            <span>—</span>
            <span>{isRtl ? "الذكاء الاصطناعي الفائق" : "Advanced AI"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/chat")}
              className="hover:text-[#F59E0B] transition-colors"
            >
              {isRtl ? "المحادثة" : "Chat"}
            </button>
            <span>•</span>
            <button
              onClick={() => navigate("/profile")}
              className="hover:text-[#F59E0B] transition-colors"
            >
              {isRtl ? "الملف الشخصي" : "Profile"}
            </button>
          </div>
        </div>
      </footer>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />
    </div>
  );
}


