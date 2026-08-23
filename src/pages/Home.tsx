import { useLocation } from "wouter";
import {
  Sparkles,
  Brain,
  Mic,
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "ذاكرة ذكية",
    desc: "يتذكّر M7 تفاصيلك وتفضيلاتك عبر المحادثات ليمنحك ردوداً أكثر دقة وشخصية.",
  },
  {
    icon: Mic,
    title: "محادثة صوتية",
    desc: "تحدّث واستمع للردود بالعربية مباشرة، بدعم كامل للإملاء والقراءة الصوتية.",
  },
  {
    icon: MessageSquare,
    title: "عربي أصيل",
    desc: "مصمّم للغة العربية أولاً، بفهم عميق للسياق واللهجات وأسلوب كتابة طبيعي.",
  },
  {
    icon: ShieldCheck,
    title: "خصوصية وأمان",
    desc: "محادثاتك محفوظة بأمان وتحت سيطرتك الكاملة، يمكنك حذفها في أي وقت.",
  },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] bg-background text-foreground font-sans"
    >
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">M7 AI</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          تسجيل الدخول
        </button>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center md:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          مساعدك الذكي باللغة العربية
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          تحدّث مع <span className="text-primary">M7</span> — ذكاء اصطناعي
          يفهمك ويتذكّرك
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          اطرح أسئلتك، احصل على إجابات فورية، وتحدّث صوتياً بالعربية. مساعد ذكي
          يتعلّم منك ويصبح أكثر فائدة مع كل محادثة.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/chat")}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 sm:w-auto"
          >
            ابدأ المحادثة الآن
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl border border-border bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
          >
            إنشاء حساب
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} M7 AI — جميع الحقوق محفوظة</span>
          <span>صُنع بعناية للمستخدم العربي</span>
        </div>
      </footer>
    </main>
  );
}
