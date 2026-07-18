import { useLocation } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Brain, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateConversation } from "@workspace/api-client-react";

export default function Home() {
  const [, navigate] = useLocation();
  const createConversation = useCreateConversation();

  const handleStart = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => {
        navigate(`/chat/${conv.id}`);
      },
    });
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-between relative overflow-hidden"
      dir="rtl"
    >
      {/* ── Background layers ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* radial glow top-right */}
        <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-primary/10 blur-[140px]" />
        {/* radial glow bottom-left */}
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/6 blur-[120px]" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-6 pt-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)]">
            <span className="text-xs font-bold text-black">M7</span>
          </div>
          <span className="font-bold text-sm tracking-wide">M7 AI</span>
        </div>
        {/* live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          متاح الآن
        </div>
      </header>

      {/* ── Main hero ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 max-w-4xl mx-auto w-full py-12 space-y-14">

        {/* Logo + title */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Hexagonal logo mark */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shadow-[0_0_60px_rgba(245,158,11,0.18)]">
                <span className="text-4xl font-black text-primary tracking-tighter">M7</span>
              </div>
              {/* orbiting dot */}
              <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full border-2 border-primary/50 bg-primary/20 animate-pulse" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-3">
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                M7 AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-primary font-semibold tracking-wide">
              مساعدك الذكي الشخصي
            </p>
            <p className="mx-auto max-w-lg text-muted-foreground leading-relaxed">
              صُمم ليفهمك بعمق، يتذكر تفضيلاتك، ويجيب بذكاء —
              بالعربية الفصحى الواضحة.
            </p>
          </div>
        </div>

        {/* Features */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full animate-in fade-in slide-in-from-bottom-10 duration-700"
          style={{ animationDelay: "150ms", animationFillMode: "both" }}
        >
          <FeatureCard icon={<Zap className="w-5 h-5" />} title="سرعة فائقة" desc="ردود فورية في ثوانٍ" />
          <FeatureCard icon={<Brain className="w-5 h-5" />} title="ذاكرة دائمة" desc="يتذكر معلوماتك" />
          <FeatureCard icon={<Shield className="w-5 h-5" />} title="خصوصية تامة" desc="بياناتك محمية" />
          <FeatureCard icon={<MessageCircle className="w-5 h-5" />} title="محادثات محفوظة" desc="سجل كامل لشاتاتك" />
        </div>

        {/* CTA */}
        <div
          className="animate-in fade-in slide-in-from-bottom-10 duration-700"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <button
            onClick={handleStart}
            disabled={createConversation.isPending}
            className={cn(
              buttonVariants({ size: "lg" }),
              "rounded-full px-14 py-6 text-base font-bold gap-3 shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] transition-shadow"
            )}
          >
            {createConversation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            ابدأ المحادثة
          </button>
        </div>
      </main>

      {/* ── Footer — creator credit ───────────────────────────────────────── */}
      <footer className="w-full z-10 pb-6 pt-4 flex flex-col items-center gap-1 border-t border-white/5">
        <div className="flex items-center gap-3">
          {/* decorative lines */}
          <span className="block w-12 h-px bg-gradient-to-r from-transparent to-primary/40" />
          <p className="text-xs text-muted-foreground text-center tracking-wide">
            <span className="text-primary/70 font-semibold">الصانع: </span>
            محمود صبري عبد العزيز محمد سالم الدالي
          </p>
          <span className="block w-12 h-px bg-gradient-to-l from-transparent to-primary/40" />
        </div>
        <p className="text-[10px] text-muted-foreground/40">M7 AI · جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col items-center text-center gap-3 hover:border-primary/30 hover:bg-white/5 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
