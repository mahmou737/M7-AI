import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Check,
  Zap,
  Image as ImageIcon,
  Brain,
  Globe,
  Mic,
  X,
  Crown,
  ShieldCheck,
  Flame,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  Ban,
  Paperclip,
  Infinity,
  Search,
  FolderArchive,
  FileCode,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KashierPaymentModal } from "@/components/KashierPaymentModal";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightPro?: boolean;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { user, upgradeToPro, downgradeToFree, getDailyImageUsage, getImageLimitInfo } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [isKashierModalOpen, setIsKashierModalOpen] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);

  if (!isOpen) return null;

  const currentPlan = user?.plan || "free";
  const isPro = currentPlan === "pro";
  const imageUsageToday = getDailyImageUsage();
  const imageLimitInfo = getImageLimitInfo();

  const handleUpgrade = () => {
    // Open Kashier Payment Gateway Checkout
    setIsKashierModalOpen(true);
  };

  const handleKashierSuccess = () => {
    upgradeToPro();
    setShowSuccessCelebration(true);
    setTimeout(() => {
      setShowSuccessCelebration(false);
      onClose();
    }, 2400);
  };

  const handleDowngrade = () => {
    downgradeToFree();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      dir={isRtl ? "rtl" : "ltr"}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[var(--text-main)] transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            <span>{isRtl ? "باقات واشتراكات M7 AI" : "M7 AI Pricing & Plans"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
            {isRtl ? "اختر الباقة المناسبة لإبداعك" : "Choose the Plan That Fits Your Vision"}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {isRtl
              ? "استمتع بالذكاء الاصطناعي مع إمكانية الترقية لباقة PRO لفتح الذاكرة الممتدة، استجابة فائقة السرعة، وميزات بلا حدود."
              : "Experience cutting-edge AI with instant upgrade to PRO for extended long-term memory, turbo responses, and zero limits."}
          </p>
        </div>

        {/* Celebration Overlay if upgraded */}
        {showSuccessCelebration && (
          <div className="p-6 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-center space-y-3 animate-in zoom-in-90 duration-300">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-amber-500">
              {isRtl ? "مرحباً بك في باقة PRO! 🎉👑" : "Welcome to M7 AI PRO! 🎉👑"}
            </h3>
            <p className="text-xs text-[var(--text-main)] max-w-md mx-auto leading-relaxed">
              {isRtl
                ? "تم فتح جميع الحدود بنجاح! لديك الآن ذاكرة ذكية ممتدة تتذكر تفاصيلك عبر كل المحادثات، صور وملفات بلا حدود، استجابة فائقة السرعة Turbo Speed، والوصول للنماذج المتقدمة."
                : "All tier limits unlocked! You now have smart long-term memory, unlimited images & files, turbo response speed, and advanced AI models."}
            </p>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Free Plan Card */}
          <div
            className={`relative rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all ${
              !isPro
                ? "border-amber-500/40 bg-black/5 dark:bg-white/[0.03] shadow-lg"
                : "border-[var(--border-color)] bg-black/[0.02] dark:bg-white/[0.01] opacity-90"
            }`}
          >
            {!isPro && (
              <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-black/10 dark:bg-white/10 border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-main)]">
                {isRtl ? "باقتك الحالية" : "Current Plan"}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">
                    {isRtl ? "الباقة المجانية" : "Free Plan"}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isRtl ? "للاستخدام اليومي والاستكشاف" : "For daily casual use"}
                  </p>
                </div>
                <div className="text-end">
                  <div className="text-2xl font-black text-[var(--text-main)]">$0</div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase">
                    {isRtl ? "مجاناً دائماً" : "Forever Free"}
                  </div>
                </div>
              </div>

              <div className="h-px bg-[var(--border-color)] my-4" />

              {/* Free Feature List */}
              <ul className="space-y-3 text-xs text-[var(--text-main)]">
                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-3 h-3 text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <span className="font-semibold block">{isRtl ? "سرعة استجابة عادية" : "Standard response speed"}</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "معالجة قياسية للأسئلة والمحادثات" : "Balanced standard processing speed"}
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ImageIcon className="w-3 h-3 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-semibold block">
                      {isRtl ? "إرفاق 5 صور يومياً" : "Attach 5 images daily"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {imageLimitInfo.isExhausted
                        ? isRtl
                          ? `تم استهلاك 5 من 5 صور — يتجدد تلقائياً بعد ${imageLimitInfo.formattedRemainingTimeAr}`
                          : `5/5 images consumed — Auto-renews in ${imageLimitInfo.formattedRemainingTimeEn}`
                        : isRtl
                        ? `(تم استهلاك ${imageUsageToday} من 5 صور — تجديد تلقائي كل 24 ساعة)`
                        : `(${imageUsageToday} of 5 used — 24h auto-renewal)`}
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-3 h-3 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-semibold block">
                      {isRtl ? "ذاكرة أساسية حتى 100 معلومة" : "Basic Memory up to 100 facts"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "تخزين معلومات واهتمامات المستخدم الأساسية" : "Stores basic user preferences and context"}
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div>
                    <span className="font-semibold block">
                      {isRtl ? "البحث المباشر في الويب (متوفر)" : "Live Web Search (Included)"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "الوصول لأحدث الأخبار والبيانات الحية" : "Real-time Google search grounding"}
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mic className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div>
                    <span className="font-semibold block">
                      {isRtl ? "الدعم الصوتي والتفريغ الذكي (متوفر)" : "Voice Audio & Speech-to-Text"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "التعرف الصوتي بجميع اللغات" : "Multi-language voice recognition"}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4">
              {!isPro ? (
                <Button
                  disabled
                  variant="outline"
                  className="w-full h-11 rounded-2xl border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] bg-transparent"
                >
                  {isRtl ? "أنت في الباقة المجانية حالياً" : "Active Plan"}
                </Button>
              ) : (
                <Button
                  onClick={handleDowngrade}
                  variant="outline"
                  className="w-full h-11 rounded-2xl border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/30 transition-all"
                >
                  {isRtl ? "الرجوع للباقة المجانية" : "Switch to Free"}
                </Button>
              )}
            </div>
          </div>

          {/* PRO Plan Card */}
          <div
            className={`relative rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all bg-gradient-to-b from-amber-500/[0.08] to-transparent ${
              isPro
                ? "border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50"
                : "border-amber-500/50 shadow-xl hover:border-amber-500"
            }`}
          >
            {/* Top Badge */}
            <div className="absolute -top-3.5 left-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-black text-[11px] font-black shadow-md flex items-center gap-1">
              <Crown className="w-3 h-3 text-black" />
              <span>{isRtl ? "الأقوى والأكثر شعبية" : "Most Popular & Powerful"}</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-amber-500">
                      {isRtl ? "باقة M7 PRO" : "M7 AI PRO"}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold">
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isRtl ? "للمحترفين والمبدعين بلا أي قيود" : "For power users & creators"}
                  </p>
                </div>
                <div className="text-end">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl font-black text-[var(--text-main)]">$5</span>
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">
                      {isRtl ? "/شهرياً" : "/mo"}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-500 font-bold">
                    {isRtl ? "وصول كامل وفوري" : "Instant Full Access"}
                  </div>
                </div>
              </div>

              <div className="h-px bg-amber-500/20 my-4" />

              {/* PRO Feature List */}
              <ul className="space-y-3.5 text-xs text-[var(--text-main)]">
                {/* 1. Long-Term Memory */}
                <li className="flex items-start gap-2.5 p-2 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/25 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <Brain className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-black text-amber-500 block leading-tight">
                      {isRtl
                        ? "🧠 ذاكرة ذكية ممتدة (Long-Term Memory)"
                        : "🧠 Smart Long-Term Memory"}
                    </span>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {isRtl
                        ? "يتذكر M7 AI تفاصيلك وتفضيلاتك في كل المحادثات لتقديم إجابات مخصصة لك دائماً."
                        : "M7 AI remembers your details, preferences, and context across all chats to deliver tailored answers every time."}
                    </p>
                  </div>
                </li>

                {/* 2. Turbo Speed */}
                <li className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-main)] block flex items-center gap-1">
                      {isRtl ? "⚡ استجابة فائقة السرعة (Turbo Speed)" : "⚡ Turbo Speed Response"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "أولوية معالجة قصوى وسرعة توليد فائقة بدون أي فترات انتظار" : "Priority queue with instant, lightning-fast response generation"}
                    </span>
                  </div>
                </li>

                {/* 3. Unlimited Images & Files */}
                <li className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-main)] block flex items-center gap-1.5">
                      {isRtl ? "🖼️ إرفاق صور وملفات بلا حدود" : "🖼️ Unlimited Images & File Attachments"}
                      <Flame className="w-3.5 h-3.5 text-amber-500 inline" />
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "توليد وإرفاق وتحليل الصور والمستندات والملفات بلا أي حدود يومية" : "Generate, attach, and analyze HD images and files with zero daily caps"}
                    </span>
                  </div>
                </li>

                {/* 4. Exclusive AI Personas & Models */}
                <li className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-main)] block">
                      {isRtl
                        ? "🎭 شخصيات وموديلات حصرية: خبير برمجة، كاتب محتوى إبداعي، ومساعد شخصي محترف"
                        : "🎭 Exclusive AI Personas: Code Architect, Creative Writer, and Executive Assistant"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl
                        ? "تغيير نظام التفكير والأسلوب بالكامل وفق خبرة تخصصية عميقة واحترافية فائقة"
                        : "Transform the AI system prompts, reasoning, and depth for specialized industry-grade outputs"}
                    </span>
                  </div>
                </li>

                {/* 5. Advanced Tools (Image Generator & ZIP / PDF / Code Analyzer) */}
                <li className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Search className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-main)] block">
                      {isRtl
                        ? "🔍 أدوات متقدمة: صانع صور حصري، ومحلل ملفات PDF و ZIP والأكواد الطويلة"
                        : "🔍 Advanced Tools: Exclusive Image Maker, ZIP & PDF/Code Analyzer"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl
                        ? "فك وضغط المشاريع البرمجية وقراءة ملفات PDF والمستندات بذكاء اصطناعي فائق"
                        : "Extract & analyze ZIP repos, codebases, and long PDFs natively with AI"}
                    </span>
                  </div>
                </li>

                {/* 6. 100% Ad-Free & Zero Daily Limits */}
                <li className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Ban className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-500 block">
                      {isRtl ? "🚫 تجربة كاملة بدون أي إعلانات أو حدود يومية" : "🚫 100% Ad-Free & Zero Daily Limits"}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isRtl ? "استخدام حر، مستمر، وبلا انقطاع مع شارة PRO الحصرية" : "Seamless, unrestricted access with exclusive PRO badge"}
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-4">
              {isPro ? (
                <div className="w-full h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center font-bold text-xs gap-2">
                  <Check className="w-4 h-4 text-amber-500" />
                  <span>{isRtl ? "أنت مشترك في PRO حالياً" : "PRO Plan Active"}</span>
                </div>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 !text-black font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-black" />
                  <span className="!text-black font-bold">
                    {isRtl ? "اشترك الآن بـ $5 / شهرياً" : "Subscribe Now for $5 / mo"}
                  </span>
                  {isRtl ? <ArrowLeft className="w-3.5 h-3.5 text-black" /> : <ArrowRight className="w-3.5 h-3.5 text-black" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{isRtl ? "دفع آمن ومشفر عبر Kashier" : "Secure Payment via Kashier"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{isRtl ? "تفعيل فوري لكافة المزايا والسرعة" : "Instant Activation of All Perks"}</span>
          </div>
        </div>
      </div>

      {/* Kashier Payment Gateway Modal */}
      <KashierPaymentModal
        isOpen={isKashierModalOpen}
        onClose={() => setIsKashierModalOpen(false)}
        onSuccess={handleKashierSuccess}
      />
    </div>
  );
}
