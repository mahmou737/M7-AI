import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { sendReset } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("يرجى إدخال البريد الإلكتروني"); return; }
    setLoading(true);
    setError("");
    try {
      await sendReset(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير مسجل أو غير صحيح");
      } else {
        setError("حدث خطأ، حاول مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      dir="rtl"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/6 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.18)]">
            <span className="text-2xl font-black text-primary">M7</span>
          </div>
          <h1 className="text-xl font-bold">استعادة كلمة المرور</h1>
          <p className="text-sm text-muted-foreground text-center">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </p>
        </div>

        {sent ? (
          <div className="glass rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="font-semibold">تم الإرسال!</p>
            <p className="text-sm text-muted-foreground">
              تحقق من بريدك الإلكتروني واتبع التعليمات لإعادة تعيين كلمة المرور.
            </p>
            <Button
              variant="outline"
              className="mt-2 rounded-xl"
              onClick={() => navigate("/login")}
            >
              العودة لتسجيل الدخول
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pr-10 text-right"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              إرسال رابط الاستعادة
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
