import { useLocation } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles, Zap, Shield, Globe, Loader2 } from "lucide-react";
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
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="container px-4 md:px-6 flex flex-col items-center text-center z-10 max-w-4xl mx-auto space-y-16">

        {/* Hero Section */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-primary/20 text-primary text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            الإصدار الجديد متاح الآن
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
            أهلاً بك في عالم<br />
            <span className="text-primary mt-2 inline-block">M7 AI</span>
          </h1>
          <p className="mx-auto max-w-[600px] text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
            مساعدك الذكي الشخصي. صُمم ليفهمك بعمق، ويجيب بذكاء، ويرتقي بإنتاجيتك إلى آفاق جديدة.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 fill-mode-both">
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-primary" />}
            title="سرعة فائقة"
            description="إجابات فورية ودقيقة في أجزاء من الثانية."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-primary" />}
            title="خصوصية تامة"
            description="بياناتك مشفرة ومحمية بأعلى معايير الأمان."
          />
          <FeatureCard
            icon={<Globe className="w-6 h-6 text-primary" />}
            title="فهم عميق"
            description="مصمم خصيصاً للتفاعل اللغوي الطبيعي والسلس."
          />
        </div>

        {/* CTA */}
        <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 fill-mode-both">
          <button
            onClick={handleStart}
            disabled={createConversation.isPending}
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-12 group gap-2")}
          >
            {createConversation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
            )}
            ابدأ المحادثة
          </button>
        </div>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass p-8 rounded-2xl flex flex-col items-center text-center space-y-4 hover:border-primary/30 transition-colors group">
      <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
