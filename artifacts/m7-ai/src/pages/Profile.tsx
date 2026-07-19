import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, updateUserProfile } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Save, LogOut, User, Mail, Calendar } from "lucide-react";

interface Profile {
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: { seconds: number } | null;
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    getUserProfile(user.uid).then((p) => {
      if (p) {
        setProfile(p as Profile);
        setDisplayName(p.displayName ?? "");
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("فشل الحفظ، حاول مجدداً");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const createdAt = profile?.createdAt?.seconds
    ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const initials = (displayName || user?.email || "M").slice(0, 2).toUpperCase();

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden px-4 py-8"
      dir="rtl"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/6 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <span className="text-2xl font-bold text-primary">{initials}</span>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{displayName || "—"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4" />} label="البريد الإلكتروني" value={user?.email ?? "—"} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="تاريخ الإنشاء" value={createdAt} />
        </div>

        {/* Edit name */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            تعديل الاسم
          </p>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="اسمك الكامل"
              className="pr-10 text-right"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <Button
            onClick={handleSave}
            className="w-full rounded-xl gap-2"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              "✓ تم الحفظ"
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full rounded-xl gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
