import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  ShieldCheck,
  Crown,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Sparkles,
  Zap,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface KashierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface KashierOrderData {
  orderId: string;
  merchantId: string;
  amount: number;
  currency: string;
  hash: string;
  mode: string;
  checkoutUrl: string;
  redirectUrl: string;
}

export function KashierPaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: KashierPaymentModalProps) {
  const { user, upgradeToPro } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<KashierOrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"ready" | "processing" | "success">("ready");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State for Card details
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardHolder, setCardHolder] = useState(user?.displayName || "M7 PRO Subscriber");

  // Create Kashier Order on open
  useEffect(() => {
    if (!isOpen) {
      setPaymentStep("ready");
      setError(null);
      return;
    }

    async function initKashierOrder() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/kashier/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id || "guest",
            userEmail: user?.email || "subscriber@m7.ai",
            amount: 5,
            currency: "USD",
          }),
        });

        const data = await res.json();
        if (data.success) {
          setOrderData(data);
        } else {
          setError(data.error || "فشل الاتصال بخادم Kashier");
        }
      } catch (err: any) {
        console.error("Kashier Order Init Error:", err);
        setError("تعذر تهيئة جلسة الدفع عبر Kashier");
      } finally {
        setLoading(false);
      }
    }

    initKashierOrder();
  }, [isOpen, user?.id, user?.email]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFillTestCard = () => {
    setCardNumber("4111 1111 1111 1111");
    setCardExpiry("12/28");
    setCardCvv("123");
    setCardHolder(user?.displayName || "M7 Test Subscriber");
  };

  // Submit test payment via Kashier verification
  const handleProcessPayment = async () => {
    if (!orderData) return;
    setIsProcessingPayment(true);
    setError(null);
    setPaymentStep("processing");

    try {
      // Simulate gateway verification with Kashier backend
      const res = await fetch("/api/kashier/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          paymentStatus: "SUCCESS",
          signature: orderData.hash,
          userId: user?.id,
        }),
      });

      const result = await res.json();

      if (result.success) {
        // Upgrade user account instantly to PRO
        upgradeToPro();
        setPaymentStep("success");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setError(result.error || "فشلت عملية الدفع");
        setPaymentStep("ready");
      }
    } catch (err: any) {
      console.error("Payment submission error:", err);
      setError("حدث خطأ أثناء الاتصال ببوابة الدفع");
      setPaymentStep("ready");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-in fade-in duration-200"
      dir={isRtl ? "rtl" : "ltr"}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-[var(--text-main)] transition-all animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with Kashier Badge */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
              <CreditCard className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-[var(--text-main)]">
                  {isRtl ? "بوابة الدفع الإلكتروني Kashier" : "Kashier Payment Gateway"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 text-[10px] font-black border border-blue-500/30">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {isRtl ? "معالجة مشفرة وآمنة لاشتراك M7 PRO" : "Secure encrypted checkout for M7 PRO"}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              {isRtl ? "جارٍ تجهيز طلب الدفع الآمن مع Kashier..." : "Connecting to Kashier Gateway..."}
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Step */}
        {paymentStep === "success" && (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h4 className="text-lg font-black text-emerald-500">
              {isRtl ? "تمت عملية الدفع بنجاح! 🎉👑" : "Payment Successful! 🎉👑"}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              {isRtl
                ? "تم ترقية حسابك إلى باقة M7 PRO وتفعيل جميع المزايا الحصرية والسرعة الفائقة فوراً!"
                : "Your account is upgraded to M7 PRO with all perks and Turbo speed activated!"}
            </p>
          </div>
        )}

        {/* Payment Form (Ready or Processing) */}
        {!loading && paymentStep !== "success" && orderData && (
          <div className="space-y-4">
            {/* Order Summary Pill */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{isRtl ? "اشتراك M7 PRO الشهري" : "M7 AI PRO Monthly"}</span>
                </div>
                <div className="text-[10.5px] text-[var(--text-secondary)] font-mono mt-0.5 truncate max-w-[190px] sm:max-w-xs">
                  ID: {orderData.orderId}
                </div>
              </div>
              <div className="text-end">
                <div className="text-xl font-black text-amber-500">$5.00</div>
                <div className="text-[10px] text-[var(--text-secondary)]">USD / {isRtl ? "شهرياً" : "mo"}</div>
              </div>
            </div>

            {/* Merchant Details Box */}
            <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>{isRtl ? "معرف التاجر (Merchant ID):" : "Merchant ID:"}</span>
                <span className="font-mono font-semibold text-[var(--text-main)] truncate max-w-[180px]">
                  {orderData.merchantId}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span>{isRtl ? "الوضع (Mode):" : "Gateway Mode:"}</span>
                <span className="font-bold text-emerald-500">Kashier Sandbox (Test)</span>
              </div>
            </div>

            {/* Test Card Quick Fill Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-500">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">
                  {isRtl ? "بيانات بطاقة كاشير التجريبية جاهزة" : "Kashier Test Card Ready"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleFillTestCard}
                className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 rounded-lg bg-blue-500/15"
              >
                {isRtl ? "تعبئة تلقائية" : "Auto Fill"}
              </button>
            </div>

            {/* Card Inputs Form */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                  {isRtl ? "اسم حامل البطاقة" : "Cardholder Name"}
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="M7 Subscriber"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                  {isRtl ? "رقم البطاقة التجريبية (Test Card Number)" : "Card Number"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="4111 1111 1111 1111"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-500/15 px-1.5 py-0.5 rounded">VISA</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    {isRtl ? "تاريخ الانتهاء" : "Expiry Date"}
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors text-center"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    {isRtl ? "رمز الأمان (CVV)" : "CVV"}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors text-center"
                    placeholder="123"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* Primary Pay Button */}
              <Button
                type="button"
                onClick={handleProcessPayment}
                disabled={isProcessingPayment}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 !text-black font-black text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span className="!text-black">
                      {isRtl ? "جارٍ معالجة الدفع عبر Kashier..." : "Processing with Kashier..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-black" />
                    <span className="!text-black">
                      {isRtl ? "إتمام الدفع وتفعيل باقة PRO ($5.00)" : "Pay $5.00 USD & Activate PRO"}
                    </span>
                  </>
                )}
              </Button>

              {/* Optional: Open Kashier Hosted Checkout in new tab */}
              {orderData.checkoutUrl && (
                <a
                  href={orderData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 rounded-xl border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {isRtl ? "فتح صفحة دفع Kashier الخارجية" : "Open Hosted Kashier Page"}
                  </span>
                </a>
              )}
            </div>

            {/* Security Footer */}
            <div className="flex items-center justify-center gap-2 text-[10.5px] text-[var(--text-secondary)] pt-1 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {isRtl
                  ? "معاملة تجريبية آمنة 100% ومشفرة عبر بوابات كاشير"
                  : "100% Encrypted & Verified Sandbox Transaction"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
