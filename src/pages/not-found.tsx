import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0b0d10] text-[#f8fafc] px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <span className="font-extrabold text-2xl text-amber-400">404</span>
      </div>
      <h1 className="text-2xl font-bold mb-2">الصفحة غير موجودة</h1>
      <p className="text-sm text-slate-400 max-w-sm mb-6">
        عذراً، الرابط الذي تحاول الوصول إليه غير متوفر أو تم نقله.
      </p>
      <Button
        onClick={() => navigate("/")}
        className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl"
      >
        <Home className="w-4 h-4" />
        <span>العودة للرئيسية</span>
      </Button>
    </div>
  );
}
