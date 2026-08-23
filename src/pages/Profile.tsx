import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  useListMemory,
  useDeleteMemory,
  useListConversations,
  getListMemoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserCircle,
  Brain,
  MessageSquare,
  Trash2,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Languages,
  Check,
  Loader2,
  Save,
  Home,
} from "lucide-react";

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, updateProfile, logout } = useAuth();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  const isRtl = i18n.language === "ar";

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const memoryQuery = useListMemory();
  const convsQuery = useListConversations();
  const deleteMemoryMutation = useDeleteMemory();

  const memories = memoryQuery.data || [];
  const conversations = convsQuery.data || [];

  const toggleLanguage = () => {
    const next = isRtl ? "en" : "ar";
    i18n.changeLanguage(next);
    document.dir = next === "ar" ? "rtl" : "ltr";
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    updateProfile({ displayName: displayName.trim() });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteMemory = (key: string) => {
    setDeletingKey(key);
    deleteMemoryMutation.mutate(
      { key },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() });
          setDeletingKey(null);
        },
        onError: () => setDeletingKey(null),
      }
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b0d10] text-[#f8fafc] light:bg-[#f8fafc] light:text-[#0f172a] flex flex-col transition-colors duration-200" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 light:border-slate-200 bg-[#0b0d10]/80 light:bg-white/80 backdrop-blur-xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/chat")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black transition-colors p-2 rounded-xl hover:bg-white/5 light:hover:bg-slate-100"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isRtl ? "العودة للمحادثة" : "Back to Chat"}</span>
          </button>

          <button
            onClick={() => navigate("/")}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition-colors p-2 rounded-xl hover:bg-white/5 light:hover:bg-slate-100"
          >
            <Home className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>{isRtl ? "الرئيسية" : "Home"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle showLabel={false} isRtl={isRtl} />

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-black bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 rounded-xl transition-all"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>{isRtl ? "English" : "العربية"}</span>
          </button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-xs gap-1.5 h-9 border-white/10 light:border-slate-300 hover:bg-red-500/10 hover:text-red-400 light:hover:text-red-600 hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Profile Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card/70 light:bg-white border border-white/10 light:border-slate-200 backdrop-blur-xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-white/5 light:border-slate-200">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black text-2xl shadow-xl shadow-amber-500/20">
              {displayName.charAt(0).toUpperCase() || "M"}
            </div>
            <div className="text-center sm:text-right flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white light:text-slate-900">
                  {user?.displayName || "مستخدم M7"}
                </h1>
                {user?.isGuest && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 light:text-amber-700 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                    {isRtl ? "حساب ضيف" : "Guest Account"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 light:text-slate-600 mt-1">{user?.email || "guest@m7.ai"}</p>
              <p className="text-[11px] text-slate-500 light:text-slate-400 font-mono mt-0.5">ID: {user?.id}</p>
            </div>
          </div>

          {/* Edit Display Name */}
          <form onSubmit={handleSaveName} className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 light:text-slate-700 block">
              {isRtl ? "تعديل الاسم المعروض" : "Display Name"}
            </label>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isRtl ? "اسمك..." : "Your name..."}
                className="max-w-md bg-black/40 light:bg-slate-50 border-white/10 light:border-slate-200 text-white light:text-slate-900"
              />
              <Button type="submit" className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs">
                {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{savedSuccess ? (isRtl ? "تم الحفظ!" : "Saved!") : (isRtl ? "حفظ التغييرات" : "Save")}</span>
              </Button>
            </div>
          </form>

          {/* Quick Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] light:bg-slate-50 border border-white/5 light:border-slate-200 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 light:text-amber-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-white light:text-slate-900">{conversations.length}</div>
                <div className="text-xs text-slate-400 light:text-slate-600">{isRtl ? "إجمالي المحادثات" : "Conversations"}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] light:bg-slate-50 border border-white/5 light:border-slate-200 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 light:text-amber-600 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-white light:text-slate-900">{memories.length}</div>
                <div className="text-xs text-slate-400 light:text-slate-600">{isRtl ? "معلومات محفوظة بالذاكرة" : "Memory Facts"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Memory Management Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card/70 light:bg-white border border-white/10 light:border-slate-200 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/5 light:border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 light:text-amber-600 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white light:text-slate-900">
                  {isRtl ? "الذاكرة الذكية المستمرة لـ M7" : "Persistent AI Memory"}
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600">
                  {isRtl
                    ? "المعلومات والسياق التي استنتجها المساعد عنك أثناء الحديث لتخصيص الردود"
                    : "Facts M7 learned to personalize your conversations"}
                </p>
              </div>
            </div>
          </div>

          {memoryQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-8 text-slate-400 light:text-slate-500 space-y-2">
              <Brain className="w-8 h-8 mx-auto opacity-40 text-amber-400 light:text-amber-600" />
              <p className="text-xs">
                {isRtl ? "لا توجد معلومات محفوظة في الذاكرة بعد." : "No memory entries stored yet."}
              </p>
              <p className="text-[11px] text-slate-500 light:text-slate-400">
                {isRtl
                  ? "أثناء المحادثة، أخبر M7 بأمور مثل «اسمي محمود» أو «أنا أعمل مهندس برمجيات» وسيتذكرها تلقائياً!"
                  : "Tell M7 things like 'My name is John' in chat, and it will remember!"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {memories.map((m) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] light:bg-slate-50 hover:bg-white/[0.04] light:hover:bg-slate-100 border border-white/5 light:border-slate-200 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[11px] font-semibold text-amber-400 light:text-amber-600 block">{m.label}</span>
                    <span className="text-xs text-slate-200 light:text-slate-800 block truncate">{m.value}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(m.key)}
                    disabled={deletingKey === m.key}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 light:text-slate-500 hover:text-red-400 light:hover:text-red-600 transition-all flex-shrink-0"
                    title={isRtl ? "حذف من الذاكرة" : "Delete fact"}
                  >
                    {deletingKey === m.key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
