import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-main)] px-4 py-8 relative transition-colors duration-200" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors mb-6 p-1 rounded-lg"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isRtl ? "العودة لتسجيل الدخول" : "Back to Login"}</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-main)]">
            {isRtl ? "استعادة كلمة المرور" : "Reset Password"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {isRtl
              ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور"
              : "Enter your registered email address to receive reset instructions"}
          </p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <p className="text-xs text-green-600 dark:text-green-300 font-medium leading-relaxed">
              {isRtl
                ? `تم إرسال تعليمات إعادة التعيين إلى ${email}. يُرجى مراجعة صندوق الوارد.`
                : `Password reset link has been dispatched to ${email}.`}
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full h-10 text-xs font-bold bg-amber-500 hover:bg-amber-400 !text-black rounded-xl"
            >
              <span className="!text-black">{isRtl ? "العودة لتسجيل الدخول" : "Return to Sign In"}</span>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-main)]">
                {isRtl ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pr-10 bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-main)] h-11 text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-bold text-sm bg-amber-500 hover:bg-amber-400 !text-black rounded-xl shadow-lg shadow-amber-500/20"
            >
              <span className="!text-black">{isRtl ? "إرسال رابط الاستعادة" : "Send Reset Link"}</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
