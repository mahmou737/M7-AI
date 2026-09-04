import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Loader2,
  Square,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  Brain,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Mic,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Search,
  Home,
  Globe,
  Link2,
  ExternalLink,
  RotateCcw,
  ImagePlus,
  Paperclip,
  Camera,
  Sparkles,
  ArrowUpRight,
  Download,
  Maximize2,
  Paintbrush,
  Edit2,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  Clock,
  Calendar,
  Crown,
  Zap,
  FolderArchive,
  FileCode,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSendMessage,
  useListConversations,
  useGetConversationMessages,
  useCreateConversation,
  useDeleteConversation,
  useListMemory,
  useDeleteMemory,
  getListConversationsQueryKey,
  getListMemoryQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PricingModal } from "@/components/PricingModal";
import { PersonaSelector } from "@/components/PersonaSelector";
import { PersonaId } from "@/types/personas";
import {
  checkAndEnforceSessionLifecycle,
  recordUserActivity,
  performFullAppCacheClean,
} from "@/lib/sessionManager";
import {
  getStoredChats,
  getStoredChatById,
  saveStoredChat,
  deleteStoredChatById,
  updateStoredChatTitle,
  ChatMessageItem,
  StoredChat,
} from "@/lib/chatStore";

// ChatMessageItem imported from chatStore

interface AttachedImage {
  data: string;
  mimeType: string;
  name: string;
  preview: string;
}

interface AttachedFile {
  name: string;
  type: "zip" | "document" | "code";
  summary: string;
  fullContent: string;
  fileCount?: number;
  sizeStr?: string;
}

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEvent = {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

/**
 * كاشف ذكي للغة النص المولد (عربي، إنجليزي، فرنسي، إسباني، ألماني، إلخ) لتحويل النص إلى صوت ديناميكياً
 */
function detectSpokenLanguage(text: string): string {
  if (!text) return "ar-SA";

  const clean = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, "")
    .trim();

  // فحص الأحرف العربية
  const arabicMatches = clean.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  // فحص الأحرف الإنجليزية / اللاتينية
  const latinMatches = clean.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // لغات أخرى شائعة
  const frenchMatches = clean.match(/[éèêëàâçîïôûùüœæ]/gi);
  const germanMatches = clean.match(/[äöüß]/gi);
  const spanishMatches = clean.match(/[ñáéíóú¿¡]/gi);
  const cyrillicMatches = clean.match(/[\u0400-\u04FF]/g);

  if (arabicCount >= 3 && (latinCount === 0 || arabicCount >= latinCount * 0.35)) {
    return "ar-SA";
  }

  if (cyrillicMatches && cyrillicMatches.length > 5 && cyrillicMatches.length > latinCount) {
    return "ru-RU";
  }

  if (frenchMatches && frenchMatches.length >= 3) {
    return "fr-FR";
  }

  if (germanMatches && germanMatches.length >= 3) {
    return "de-DE";
  }

  if (spanishMatches && spanishMatches.length >= 3) {
    return "es-ES";
  }

  if (latinCount > 0) {
    return "en-US";
  }

  return "ar-SA";
}

/**
 * تنظيف النص من علامات الماركداون والرموز البرمجية قبل القراءة الصوتية لضمان نطق فصيح وطبيعي
 */
function cleanTextForSpeech(rawText: string): string {
  return rawText
    .replace(/```[\s\S]*?```/g, " كود برمجي ")
    .replace(/`[^`]*`/g, "")
    .replace(/<M7[^>]*>[\s\S]*?<\/M7[^>]*>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/[#*`_~>\-•[\]()]/g, " ")
    .replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRelativeTime(dateStr: string, isRtl: boolean): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return isRtl ? "الآن" : "Just now";
    if (diffMins < 60) return isRtl ? `منذ ${diffMins} د` : `${diffMins}m ago`;
    if (diffHours < 24) return isRtl ? `منذ ${diffHours} س` : `${diffHours}h ago`;
    if (diffDays === 1) return isRtl ? "أمس" : "Yesterday";
    if (diffDays < 7) return isRtl ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;
    return date.toLocaleDateString(isRtl ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function CodeBlock({ children, className, ...props }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!match && !codeString.includes("\n")) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[#121316] text-[#f4f4f5] text-xs shadow-md" dir="ltr">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1a1b1e] border-b border-[var(--border-color)] text-[11px] text-zinc-400">
        <span className="font-mono uppercase font-bold text-amber-500">{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/10"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono text-[13px] leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/**
 * تنظيف محتوى الرسائل المعروضة من أي وسوم أو أكواد استدعاء أدوات توليد الصور (dalle.text2im)
 */
function cleanDisplayContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/<(?:M7IMAGE_ACTION|IMAGE_ACTION|image_generation)>[\s\S]*?<\/(?:M7IMAGE_ACTION|IMAGE_ACTION|image_generation)>/gi, "")
    .replace(/```(?:json)?\s*\{[\s\S]*?(?:dalle\.text2im|text2im|image_generation|generate_image)[\s\S]*?\}\s*```/gi, "")
    .replace(/\{[\s\r\n]*"(?:action|tool|name)"[\s\r\n]*:[\s\r\n]*"(?:dalle\.text2im|text2im|image_generation|generate_image)"[\s\S]*?\}(?:\s*\}|\s*\))/gi, "")
    .replace(/(?:dalle\.text2im|text2im|generate_image)\s*\([\s\S]*?\)/gi, "")
    .replace(/^[^\n\r]*dalle\.text2im[^\n\r]*/gmi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const StreamableContent = memo(function StreamableContent({
  content,
  isLatestAssistant,
  isGenerating,
  isRtl,
}: {
  content: string;
  isLatestAssistant: boolean;
  isGenerating: boolean;
  isRtl: boolean;
}) {
  const sanitizedContent = cleanDisplayContent(content);
  const [displayedLength, setDisplayedLength] = useState(() => (isLatestAssistant && isGenerating ? Math.min(20, sanitizedContent.length) : sanitizedContent.length));

  useEffect(() => {
    if (!isLatestAssistant || !isGenerating) {
      setDisplayedLength(sanitizedContent.length);
      return;
    }

    if (displayedLength < sanitizedContent.length) {
      const remaining = sanitizedContent.length - displayedLength;
      const step = Math.max(2, Math.min(15, Math.ceil(remaining / 6)));
      const timer = setTimeout(() => {
        setDisplayedLength((prev) => Math.min(sanitizedContent.length, prev + step));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [sanitizedContent.length, displayedLength, isLatestAssistant, isGenerating]);

  const visibleText = isLatestAssistant && isGenerating ? sanitizedContent.slice(0, displayedLength) : sanitizedContent;
  const isStreaming = isLatestAssistant && isGenerating && displayedLength < sanitizedContent.length;

  return (
    <div className="ai-response-container text-start" dir={isRtl ? "rtl" : "ltr"}>
      <Markdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
        {visibleText}
      </Markdown>
      {isStreaming && <span className="animate-streaming-cursor" />}
    </div>
  );
});

/**
 * مكون لعرض رسالة المحادثة بنمط ChatGPT / Gemini (بدون فقاعة للمساعد، وأنيميشن ناعم، ودعم كامل للغتين)
 */
const ChatMessageCard = memo(function ChatMessageCard({
  msg,
  idx,
  isRtl,
  isCopied,
  copiedSourceUri,
  isLatestAssistant,
  isGenerating,
  isPro,
  onCopyText,
  onSpeak,
  onSelectSuggestion,
  onRetry,
  onOpenImageModal,
  onCopySource,
}: {
  msg: ChatMessageItem;
  idx: number;
  isRtl: boolean;
  isCopied: boolean;
  copiedSourceUri: string | null;
  isLatestAssistant: boolean;
  isGenerating: boolean;
  isPro?: boolean;
  onCopyText: (text: string, idx: number) => void;
  onSpeak: (text: string) => void;
  onSelectSuggestion?: (suggestion: string) => void;
  onRetry?: () => void;
  onOpenImageModal: (url: string) => void;
  onCopySource: (uri: string, e: React.MouseEvent) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex w-full justify-end animate-message-fade-in" dir={isRtl ? "rtl" : "ltr"}>
        <div className="user-msg-bubble shadow-sm flex flex-col gap-2">
          {/* User Attached Image */}
          {msg.imageUrl && (
            <div className="overflow-hidden rounded-xl border border-white/10 max-w-xs mb-1">
              <img
                src={msg.imageUrl}
                alt="User upload"
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-60 object-cover cursor-pointer hover:scale-[1.02] transition-transform rounded-xl"
                onClick={() => onOpenImageModal(msg.imageUrl!)}
              />
            </div>
          )}
          {/* User Attached ZIP/Code/Document Badge */}
          {msg.attachedFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/25 border border-white/20 text-xs text-white max-w-sm mb-1">
              <div className="w-6 h-6 rounded-lg bg-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-300">
                {msg.attachedFile.type === "zip" ? (
                  <FolderArchive className="w-3.5 h-3.5" />
                ) : msg.attachedFile.type === "code" ? (
                  <FileCode className="w-3.5 h-3.5" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold truncate block">{msg.attachedFile.name}</span>
                {msg.attachedFile.sizeStr && (
                  <span className="text-[10px] opacity-75 font-mono">{msg.attachedFile.sizeStr}</span>
                )}
              </div>
            </div>
          )}
          <div className="whitespace-pre-wrap text-start text-sm sm:text-[15px] font-medium leading-relaxed">
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  // كشف دقيق للغة نص الرسالة لضمان مطابقة الاقتراحات السريعة للغة الرد 100%
  const isMsgEnglish =
    /[a-zA-Z]{4,}/.test(msg.content) &&
    ((msg.content.match(/[\u0600-\u06FF]/g) || []).length <
      (msg.content.match(/[a-zA-Z]/g) || []).length * 0.3);

  // تصفية الاقتراحات لمنع أي تضارب لغوي مع نص الرسالة
  let displaySuggestions: string[] | undefined = undefined;
  if (msg.suggestions && msg.suggestions.length > 0) {
    if (isMsgEnglish) {
      const enOnly = msg.suggestions.filter((s) => !/[\u0600-\u06FF]/.test(s));
      displaySuggestions =
        enOnly.length > 0
          ? enOnly
          : [
              "What are your technical capabilities? 🚀",
              "How can you help with coding? 💡",
              "Explain in more detail 📋",
            ];
    } else {
      const arOnly = msg.suggestions.filter((s) => /[\u0600-\u06FF]/.test(s));
      displaySuggestions =
        arOnly.length > 0
          ? arOnly
          : [
              "ما هي قدراتك التقنية؟ 🚀",
              "كيف يمكنك مساعدتي في البرمجة؟ 💡",
              "اشرح بمزيد من التفصيل 📋",
            ];
    }
  }

  // Assistant Message (ChatGPT / Gemini Style - No Message Bubble)
  return (
    <div className="flex flex-col w-full animate-message-fade-in py-2" dir={isMsgEnglish ? "ltr" : isRtl ? "rtl" : "ltr"}>
      {/* Header / Avatar indicator */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/20 flex-shrink-0">
          M7
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-xs sm:text-sm text-[var(--text-main)]">
            M7 AI
          </span>

          {/* Turbo Speed Badge for PRO accounts */}
          {isPro && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-[12px] shadow-[0_0_8px_rgba(245,158,11,0.15)]"
              title="⚡ Turbo Speed Active"
            >
              <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>Turbo Speed</span>
            </span>
          )}

          {/* Web search badge */}
          {msg.isWebSearch && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Globe className="w-3 h-3 text-amber-500" />
              <span>{isRtl ? "بحث ويب حي 🌐" : "Live Search 🌐"}</span>
            </span>
          )}

          {/* Generated Image badge */}
          {(msg.isImageGeneration || msg.imageUrl) && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Paintbrush className="w-3 h-3 text-amber-500" />
              <span>{isRtl ? "توليد صورة فنية 🎨" : "AI Artwork 🎨"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Generated Image if any */}
      {msg.imageUrl && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--border-color)] relative group/img max-w-md shadow-lg">
          <img
            src={msg.imageUrl}
            alt="AI Generated"
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-80 object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300 rounded-2xl"
            onClick={() => onOpenImageModal(msg.imageUrl!)}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => onOpenImageModal(msg.imageUrl!)}
              className="p-2.5 rounded-xl bg-black/70 hover:bg-amber-500 hover:text-black text-white transition-all shadow-md"
              title={isRtl ? "عرض بحجم كامل" : "View Fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={msg.imageUrl}
              download={`m7-image-${Date.now()}.png`}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-black/70 hover:bg-amber-500 hover:text-black text-white transition-all shadow-md"
              title={isRtl ? "تحميل الصورة" : "Download Image"}
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Main Text Content without any Bubble Container */}
      <div className="w-full">
        <StreamableContent
          content={msg.content}
          isLatestAssistant={isLatestAssistant}
          isGenerating={isGenerating}
          isRtl={!isMsgEnglish && isRtl}
        />
      </div>

      {/* Interactive Quick Reply Suggestion Chips */}
      {displaySuggestions && displaySuggestions.length > 0 && !isGenerating && (
        <div
          className="mt-3.5 pt-2 flex flex-col gap-2 text-start animate-in fade-in slide-in-from-bottom-1 duration-300"
          dir={isMsgEnglish ? "ltr" : "rtl"}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>{isMsgEnglish ? "Quick Follow-up Suggestions:" : "اقتراحات سريعة للمتابعة:"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {displaySuggestions.map((suggestion, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => onSelectSuggestion?.(suggestion)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-card)] hover:bg-amber-500/15 text-[var(--text-main)] hover:text-amber-600 dark:hover:text-amber-400 border border-[var(--border-color)] hover:border-amber-500/50 shadow-sm transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] group text-start"
              >
                <span className="leading-snug">{suggestion}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500/70 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5 transition-transform flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Web Search Sources */}
      {msg.searchSources && msg.searchSources.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] text-start" dir={isRtl ? "rtl" : "ltr"}>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <Globe className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{isRtl ? "المصادر والمراجع الأصلية الموثقة من الويب:" : "Verified Original Web Sources & Links:"}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {msg.searchSources.length} {isRtl ? "مصادر" : "sources"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {msg.searchSources.map((src, sIdx) => {
              const isSrcCopied = copiedSourceUri === src.uri;
              return (
                <div
                  key={sIdx}
                  className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-amber-500/5 border border-[var(--border-color)] hover:border-amber-500/40 transition-all text-xs group/src flex flex-col gap-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5 text-amber-500" />
                        {(src as any).domain || "web"}
                      </span>
                      <span className="font-semibold text-[var(--text-main)] truncate text-[11px]">
                        {src.title || (src as any).domain || (isRtl ? "مصدر الويب" : "Web Source")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => onCopySource(src.uri, e)}
                        className={cn(
                          "p-1 rounded-md border transition-all flex items-center gap-1 text-[9px] font-medium",
                          isSrcCopied
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40"
                            : "bg-[var(--bg-primary)] hover:bg-amber-500/20 text-[var(--text-secondary)] hover:text-amber-500 border-[var(--border-color)]"
                        )}
                        title={isRtl ? "نسخ الرابط" : "Copy Link"}
                      >
                        {isSrcCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>{isRtl ? "تم" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isRtl ? "نسخ" : "Copy"}</span>
                          </>
                        )}
                      </button>

                      <a
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-black border border-amber-500/30 transition-all flex items-center gap-1 text-[9px] font-semibold"
                        title={isRtl ? "فتح المصدر في نافذة جديدة" : "Open Source Link"}
                      >
                        <span>{isRtl ? "زيارة" : "Visit"}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <a
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-black/5 dark:bg-black/40 border border-[var(--border-color)] text-amber-600 dark:text-amber-300 font-mono text-[10px] truncate dir-ltr transition-colors"
                    title={src.uri}
                  >
                    <Link2 className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="truncate flex-1">{src.uri}</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assistant Action Buttons (ChatGPT/Gemini Style below the text) */}
      <div className="flex items-center gap-1.5 mt-3 pt-1 text-start" dir={isRtl ? "rtl" : "ltr"}>
        {msg.content.startsWith("⚠️") && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black transition-all shadow-sm"
            title={isRtl ? "إعادة المحاولة فوراً" : "Retry now"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px]">{isRtl ? "إعادة المحاولة" : "Retry"}</span>
          </button>
        )}

        <button
          onClick={() => onCopyText(cleanDisplayContent(msg.content), idx)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-color)] transition-all"
          title={isRtl ? "نسخ الرد" : "Copy response"}
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] text-emerald-500 font-semibold">{isRtl ? "تم النسخ" : "Copied"}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">{isRtl ? "نسخ" : "Copy"}</span>
            </>
          )}
        </button>

        <button
          onClick={() => onSpeak(cleanDisplayContent(msg.content))}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-color)] transition-all"
          title={isRtl ? "قراءة صوتية" : "Listen audio"}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">{isRtl ? "استماع" : "Listen"}</span>
        </button>
      </div>
    </div>
  );
});

/**
 * مكون Loading State التفاعلي والمتطور (حل البطء والتعليق وإظهار خطوات المعالجة والوقت الحي)
 */
const LoadingStateCard = memo(function LoadingStateCard({
  isPendingWebSearch,
  imageGenMode,
  isRtl,
  isPro,
  onStop,
}: {
  isPendingWebSearch: boolean;
  imageGenMode: boolean;
  isRtl: boolean;
  isPro?: boolean;
  onStop: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex w-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      {isPendingWebSearch ? (
        <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl rounded-tl-sm flex flex-col gap-3 border border-amber-500/40 shadow-xl shadow-amber-500/10 max-w-md w-full text-right">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center flex-shrink-0 animate-pulse shadow-md shadow-amber-500/20">
              <Globe className="w-5 h-5 animate-spin duration-1000" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-500 light:text-amber-700 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-amber-500" />
                  {isRtl ? "جاري البحث الحي المباشر في الويب" : "Live Web Grounding Search"}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 light:bg-amber-100 light:text-amber-800">
                  {elapsed}s
                </span>
              </div>

              {/* Dynamic Step Status */}
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-main)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                  <span>
                    {elapsed < 1.8
                      ? isRtl
                        ? "1. الاتصال المباشر بمحرك البحث وتدقيق الاستعلام..."
                        : "1. Connecting to live search engine..."
                      : elapsed < 3.8
                      ? isRtl
                        ? "2. استخراج المصادر الموثقة وفحص أحدث المقالات..."
                        : "2. Extracting verified sources and recent articles..."
                      : isRtl
                      ? "3. صياغة وتنسيق الخلاصة الذكية..."
                      : "3. Synthesizing articulate factual summary..."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-between justify-between pt-2 border-t border-[var(--border-color)] text-[11px]">
            <span className="text-[var(--text-secondary)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {isRtl ? "محرك M7 للبحث الحي المباشر" : "M7 Real-time Grounding"}
            </span>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-500 dark:text-red-400 font-bold transition-colors cursor-pointer text-[11px]"
              title={isRtl ? "إيقاف البحث والرد" : "Stop search"}
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>{isRtl ? "إيقاف ⏹️" : "Stop ⏹️"}</span>
            </button>
          </div>
        </div>
      ) : imageGenMode ? (
        <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl rounded-tl-sm flex flex-col gap-3 border border-amber-500/40 shadow-xl shadow-amber-500/10 max-w-md w-full text-right">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center flex-shrink-0 animate-bounce shadow-md shadow-amber-500/20">
              <Paintbrush className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-500 light:text-amber-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {isRtl ? "توليد صورة فنية فائقة الدقة" : "Generating 8K AI Artwork"}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 light:bg-amber-100 light:text-amber-800">
                  {elapsed}s
                </span>
              </div>

              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-main)]">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                  <span>
                    {elapsed < 2.0
                      ? isRtl
                        ? "1. تحسين وصياغة تفاصيل الصورة..."
                        : "1. Engineering high-detail visual prompt..."
                      : elapsed < 4.5
                      ? isRtl
                        ? "2. معالجة وتوليد الصورة بدقة 1024x1024..."
                        : "2. Rendering with FLUX diffusion engine..."
                      : isRtl
                      ? "3. تطبيق الإضاءة والتفاصيل الواقعية..."
                      : "3. Applying photorealistic lighting & 8K details..."}
                  </span>
                </div>
              </div>

              {/* Quality Badges */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-300 light:text-amber-700">
                  FLUX.1 Diffusion
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-300 light:text-amber-700">
                  8K Ultra HD
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-300 light:text-amber-700">
                  Photorealistic
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-500 dark:text-red-400 font-bold transition-colors cursor-pointer text-[11px]"
              title={isRtl ? "إيقاف توليد الصورة" : "Stop generating"}
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>{isRtl ? "إيقاف التوليد ⏹️" : "Stop ⏹️"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-2xl rounded-tl-sm flex flex-col gap-2.5 border border-[var(--border-color)] shadow-xl max-w-sm w-full text-right">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center animate-pulse">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {isRtl ? "M7 AI يفكر ويصيغ الرد الذكي 🧠..." : "M7 AI is thinking and formulating..."}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
              {elapsed}s
            </span>
          </div>

          {/* Skeleton Pulse Lines */}
          <div className="space-y-2 py-1">
            <div className="h-2 bg-gradient-to-r from-amber-500/20 via-amber-400/40 to-amber-500/10 rounded-full animate-pulse w-5/6 mr-auto" />
            <div className="h-2 bg-gradient-to-r from-amber-500/10 via-amber-400/30 to-amber-500/20 rounded-full animate-pulse w-full" />
            <div className="h-2 bg-gradient-to-r from-amber-500/20 via-amber-400/40 to-amber-500/10 rounded-full animate-pulse w-3/4 mr-auto" />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)] text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              <span className="text-[var(--text-secondary)]">
                {isPro ? (
                  <span className="text-amber-500 font-bold flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-amber-500" />
                    ⚡ Turbo Speed
                  </span>
                ) : isRtl ? (
                  "عربية فصحى معاصرة"
                ) : (
                  "Standard AI Engine"
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-500 dark:text-red-400 font-semibold transition-colors cursor-pointer text-[10px]"
              title={isRtl ? "إيقاف توليد الرد" : "Stop"}
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>{isRtl ? "إيقاف" : "Stop"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// Using chatStore functions ({ id, title, messages }) directly

export default function Chat() {
  const { id: conversationId } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user, plan, getDailyImageUsage, recordImageUsage } = useAuth();
  const { i18n } = useTranslation();

  const isRtl = i18n.language === "ar";
  const isPro = plan === "pro";
  const dailyImages = getDailyImageUsage();

  const toggleLanguage = () => {
    const newLang = isRtl ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
    localStorage.setItem("i18nextLng", newLang);
    localStorage.setItem("m7_lang", newLang);
  };

  useEffect(() => {
    document.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = isRtl ? "ar" : "en";
  }, [isRtl]);

  const [chats, setChats] = useState<StoredChat[]>(() => getStoredChats());
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    const all = getStoredChats();
    if (all.length > 0) return all[0].id;
    const newId = "chat_" + Date.now();
    saveStoredChat(newId, [], isRtl ? "محادثة جديدة" : "New Chat");
    return newId;
  });

  useEffect(() => {
    if (conversationId) {
      setActiveChatId(conversationId);
      if (!getStoredChatById(conversationId)) {
        saveStoredChat(conversationId, [], isRtl ? "محادثة جديدة" : "New Chat");
        setChats(getStoredChats());
      }
    } else {
      const newId = "chat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      saveStoredChat(newId, [], isRtl ? "محادثة جديدة" : "New Chat");
      setChats(getStoredChats());
      setActiveChatId(newId);
      navigate(`/chat/${newId}`, { replace: true });
    }
  }, [conversationId, navigate, isRtl]);

  const activeChat = getStoredChatById(activeChatId) || chats.find((c) => c.id === activeChatId) || {
    id: activeChatId,
    title: isRtl ? "محادثة جديدة" : "New Chat",
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  const messages = activeChat.messages;

  const setMessages = (action: ChatMessageItem[] | ((prev: ChatMessageItem[]) => ChatMessageItem[])) => {
    const currentMessages = activeChat.messages || [];
    const nextMessages = typeof action === "function" ? action(currentMessages) : action;
    const title = nextMessages.length > 0 ? (nextMessages[0].content.slice(0, 30) || (isRtl ? "محادثة جديدة" : "New Chat")) : activeChat.title;
    const updated = saveStoredChat(activeChatId, nextMessages, title);
    setChats(updated);
  };

  const conversations = chats.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.updatedAt,
    updatedAt: c.updatedAt,
  }));
  const [inputValue, setInputValue] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>(() => {
    try {
      const saved = localStorage.getItem("m7_active_persona");
      if (saved && ["general", "coder", "writer", "assistant"].includes(saved)) {
        return saved as PersonaId;
      }
    } catch {}
    return "general";
  });
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [imageGenMode, setImageGenMode] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPendingWebSearch, setIsPendingWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [memoryExpanded, setMemoryExpanded] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [deletingMemKey, setDeletingMemKey] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSourceUri, setCopiedSourceUri] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close Action Menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    if (actionMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [actionMenuOpen]);

  const handleCopySource = (uri: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(uri);
    setCopiedSourceUri(uri);
    setTimeout(() => {
      setCopiedSourceUri(null);
    }, 2000);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const voiceTranscriptRef = useRef("");
  const initialPromptHandledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const inputFieldRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const SUGGESTIONS = isRtl
    ? [
        "اصنع صورة لغروب شمس سينمائي فوق الأهرامات 🌅🎨",
        "أنشئ لوحة مستقبلية لمدينة ذكية بتقنيات الذكاء الاصطناعي 🚀🏙️",
        "ما هي آخر أخبار وتطورات الذكاء الاصطناعي اليوم؟ 🌐🔍",
        "من الفائز بجائزة الكرة الذهبية 2024؟ 🏆🔍",
      ]
    : [
        "Generate a cinematic sunset photo over the pyramids 🌅🎨",
        "Create a futuristic digital artwork of an AI city 🚀🏙️",
        "What are the latest tech & AI breakthroughs today? 🌐🔍",
        "Who won the 2024 Ballon d'Or award? 🏆🔍",
      ];

  // ── Queries ──────────────────────────────────────────────────────────────
  const convs = useListConversations();
  const activeConvId = conversationId || "";
  const history = useGetConversationMessages(activeConvId, {
    query: { enabled: Boolean(conversationId) } as any,
  });

  const memoryQuery = useListMemory();
  const sendMessageMutation = useSendMessage();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const deleteMemoryMutation = useDeleteMemory();

  // ── Smart Session & Lifecycle Management (التعامل مع التبديل السريع ومهلة الخمول وتنظيف الذاكرة) ──
  useEffect(() => {
    // 1. فحص مهلة الخمول وانتهاء الجلسة عند فتح التطبيق
    const { hasReset } = checkAndEnforceSessionLifecycle();
    if (hasReset && !conversationId) {
      setMessages([]);
    }

    // 2. تتبع نشاط المستخدم للحفاظ على الشات الحالي أثناء الاستخدام
    const onUserActive = () => {
      recordUserActivity();
    };

    window.addEventListener("pointerdown", onUserActive);
    window.addEventListener("keydown", onUserActive);
    window.addEventListener("touchstart", onUserActive);

    // 3. التعامل مع التبديل السريع والتنقل بين التطبيقات (App Switching / Visibility Change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // عند عودة المستخدم للتطبيق: التحقق مما إذا كانت فترة الغياب تجاوزت مهلة الخمول (Timeout)
        const { hasReset: expired } = checkAndEnforceSessionLifecycle();
        if (expired) {
          setMessages([]);
          if (conversationId) {
            navigate("/chat");
          }
        } else {
          // غياب قصير (تبديل تطبيقات أو قفل مؤقت): تسجيل استمرار النشاط للحفاظ على الشات كاملاً
          recordUserActivity();
        }
      } else {
        // خروج مؤقت للخلفية: تسجيل وقت الخروج بدقة
        recordUserActivity();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointerdown", onUserActive);
      window.removeEventListener("keydown", onUserActive);
      window.removeEventListener("touchstart", onUserActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, navigate]);

  // ── LocalStorage caching for fast offline/instant load ───────────────────
  useEffect(() => {
    if (convs.data && convs.data.length > 0) {
      try {
        localStorage.setItem("m7_cached_conversations", JSON.stringify(convs.data));
      } catch {}
    }
  }, [convs.data]);

  // ── Auto-save messages to independent chat store ─────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && conversationId && activeChatId === conversationId) {
      saveStoredChat(conversationId, messages);
      try {
        localStorage.setItem(`m7_cached_messages_${conversationId}`, JSON.stringify(messages));
      } catch (err) {
        console.warn("Failed to auto-save chat messages:", err);
      }
    }
  }, [messages, conversationId, activeChatId]);

  // ── Load history with <M7IMAGE> parsing + chatStore fallback ───────────────
  useEffect(() => {
    if (conversationId) {
      // 1. Fast optimistic load from stored chats array
      const stored = getStoredChatById(conversationId);
      const cached = localStorage.getItem(`m7_cached_messages_${conversationId}`);
      if (stored && stored.messages && stored.messages.length > 0 && (!history.data || history.data.length === 0)) {
        setMessages(stored.messages);
      } else if (cached && (!history.data || history.data.length === 0)) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch {}
      }

      // 2. Hydrate from server database history if loaded
      if (history.data) {
        const loaded: ChatMessageItem[] = history.data.map((m) => {
          let content = m.content;
          let imageUrl: string | null = null;
          let searchSources: Array<{ title: string; uri: string; domain?: string }> | undefined = undefined;
          let suggestions: string[] | undefined = undefined;
          let isWebSearch = false;

          const matchSuggestions = content.match(/<M7SUGGESTIONS>([\s\S]*?)<\/M7SUGGESTIONS>/);
          if (matchSuggestions) {
            try {
              const parsed = JSON.parse(matchSuggestions[1]);
              if (Array.isArray(parsed) && parsed.length > 0) {
                suggestions = parsed;
                content = content.replace(/<M7SUGGESTIONS>[\s\S]*?<\/M7SUGGESTIONS>/g, "").trim();
              }
            } catch {}
          }

          const matchImg = content.match(/<M7IMAGE>([\s\S]*?)<\/M7IMAGE>/);
          if (matchImg) {
            try {
              const parsed = JSON.parse(matchImg[1]);
              if (parsed.url) {
                imageUrl = parsed.url;
                content = content.replace(/<M7IMAGE>[\s\S]*?<\/M7IMAGE>/g, "").trim();
              }
            } catch {}
          }

          const matchSources = content.match(/<M7SOURCES>([\s\S]*?)<\/M7SOURCES>/);
          if (matchSources) {
            try {
              const parsed = JSON.parse(matchSources[1]);
              if (Array.isArray(parsed) && parsed.length > 0) {
                searchSources = parsed;
                isWebSearch = true;
                content = content.replace(/<M7SOURCES>[\s\S]*?<\/M7SOURCES>/g, "").trim();
              }
            } catch {}
          }

          return {
            role: m.role as "user" | "assistant",
            content,
            imageUrl,
            searchSources,
            isWebSearch,
            suggestions,
          };
        });

        if (loaded.length > 0) {
          const stored = getStoredChatById(conversationId);
          if (!stored || loaded.length >= (stored.messages?.length || 0)) {
            setMessages(loaded);
            saveStoredChat(conversationId, loaded);
            try {
              localStorage.setItem(`m7_cached_messages_${conversationId}`, JSON.stringify(loaded));
            } catch {}
          }
        } else if (!isGenerating && (!cached || cached === "[]") && (!stored || stored.messages.length === 0)) {
          setMessages([]);
        }
      }
    } else {
      // In clean /chat route: Always provide a fresh clean state
      setMessages([]);
    }
  }, [history.data, conversationId, isGenerating]);

  // ── File Selection & Analysis Handlers ─────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.replace(/^data:[^;]+;base64,/, "");
      setAttachedImage({
        data: base64Data,
        mimeType: file.type || "image/jpeg",
        name: file.name,
        preview: result,
      });
      setAttachedFile(null);
      setImageGenMode(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleZipSelect = useCallback(
    async (file: File) => {
      if (!file) return;
      if (file.size > 60 * 1024 * 1024) {
        toast.error(
          isRtl
            ? "حجم ملف الـ ZIP كبير جداً (الحد الأقصى 60 ميجابايت)"
            : "ZIP archive is too large (max 60MB)"
        );
        return;
      }
      setIsExtractingZip(true);
      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);

        const fileEntries: string[] = [];
        const filesData: Array<{ path: string; content: string }> = [];

        const textExtensions = [
          ".ts", ".tsx", ".js", ".jsx", ".json", ".py", ".html", ".css", ".scss",
          ".md", ".txt", ".csv", ".c", ".cpp", ".h", ".hpp", ".java", ".rs", ".go",
          ".php", ".sql", ".sh", ".bash", ".yml", ".yaml", ".xml", ".env.example", ".toml"
        ];

        let totalChars = 0;
        const maxTotalChars = 40000;

        const keys = Object.keys(loadedZip.files);
        for (const relativePath of keys) {
          const zipEntry = loadedZip.files[relativePath];
          if (zipEntry.dir) {
            fileEntries.push(`📁 ${relativePath}`);
            continue;
          }
          fileEntries.push(`📄 ${relativePath}`);

          const lowerPath = relativePath.toLowerCase();
          const isIgnored =
            lowerPath.includes("node_modules/") ||
            lowerPath.includes(".git/") ||
            lowerPath.includes("dist/") ||
            lowerPath.includes("build/") ||
            lowerPath.includes(".next/") ||
            lowerPath.includes(".cache/");
          const isText = textExtensions.some((ext) => lowerPath.endsWith(ext));

          if (isText && !isIgnored && totalChars < maxTotalChars) {
            try {
              const content = await zipEntry.async("string");
              if (content && content.trim().length > 0) {
                const snippet =
                  content.length > 5000
                    ? content.slice(0, 5000) + "\n... [تم اقتطاع باقي الملف]"
                    : content;
                filesData.push({ path: relativePath, content: snippet });
                totalChars += snippet.length;
              }
            } catch (e) {
              console.warn("Could not read file from zip:", relativePath, e);
            }
          }
        }

        const tree =
          fileEntries.slice(0, 75).join("\n") +
          (fileEntries.length > 75 ? `\n... و ${fileEntries.length - 75} ملف/مجلد إضافي` : "");

        let formattedPrompt =
          `[📦 تحليل أرشيف مشروع مضغوط: "${file.name}" | إجمالي العناصر: ${fileEntries.length} | الحجم: ${(file.size / 1024).toFixed(1)} KB]\n\n` +
          `### 🌳 هيكل وشجرة مجلدات وملفات المشروع:\n\`\`\`text\n${tree}\n\`\`\`\n\n`;

        if (filesData.length > 0) {
          formattedPrompt += `### 💻 محتويات الملفات البرمجية الأساسية المستخرجة (${filesData.length} ملف):\n`;
          for (const f of filesData) {
            formattedPrompt += `\n📄 **ملف:** \`${f.path}\`\n\`\`\`\n${f.content}\n\`\`\`\n`;
          }
        }

        setAttachedFile({
          name: file.name,
          type: "zip",
          summary: isRtl
            ? `أرشيف مضغوط جاهز للتحليل (${fileEntries.length} عنصر، ${filesData.length} ملف كود)`
            : `ZIP repository archive ready (${fileEntries.length} items, ${filesData.length} code files)`,
          fullContent: formattedPrompt,
          fileCount: fileEntries.length,
          sizeStr: (file.size / 1024).toFixed(1) + " KB",
        });
        setAttachedImage(null);
        setImageGenMode(false);
        toast.success(
          isRtl
            ? `تم فك واستخراج "${file.name}" بنجاح (${fileEntries.length} عنصر)`
            : `Extracted "${file.name}" successfully (${fileEntries.length} items)`
        );
      } catch (err) {
        console.error("Error reading ZIP file:", err);
        toast.error(isRtl ? "تعذر فك وقراءة ملف ZIP المضغوط" : "Failed to extract ZIP archive");
      } finally {
        setIsExtractingZip(false);
      }
    },
    [isRtl]
  );

  const handleDocSelect = useCallback(
    (file: File) => {
      if (!file) return;
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const reader = new FileReader();
      reader.onload = () => {
        const rawContent = (reader.result as string) || "";
        const isCode = !isPdf;
        const formattedPrompt = isPdf
          ? `[📄 مستند PDF مرفق للتحليل والتلخيص: "${file.name}" | الحجم: ${(file.size / 1024).toFixed(1)} KB]\n\`\`\`text\n${rawContent.slice(0, 30000)}\n\`\`\``
          : `[💻 ملف برمجي مرفق للمراجعة والتدقيق: "${file.name}" | الحجم: ${(file.size / 1024).toFixed(1)} KB]\n\`\`\`\n${rawContent.slice(0, 35000)}\n\`\`\``;

        setAttachedFile({
          name: file.name,
          type: isCode ? "code" : "document",
          summary: isCode
            ? (isRtl ? `ملف كود جاهز للمراجعة والتدقيق 💻` : `Code file ready for review 💻`)
            : (isRtl ? `مستند جاهز للتحليل والتلخيص 📄` : `Document ready for analysis 📄`),
          fullContent: formattedPrompt,
          sizeStr: (file.size / 1024).toFixed(1) + " KB",
        });
        setAttachedImage(null);
        setImageGenMode(false);
        toast.success(
          isRtl ? `تم إرفاق "${file.name}" بنجاح` : `Attached "${file.name}" successfully`
        );
      };
      reader.onerror = () => {
        toast.error(isRtl ? "تعذر قراءة محتوى الملف" : "Failed to read file content");
      };
      reader.readAsText(file);
    },
    [isRtl]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            e.preventDefault();
            break;
          }
        }
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const lower = file.name.toLowerCase();
        if (file.type.startsWith("image/")) {
          handleFileSelect(file);
        } else if (lower.endsWith(".zip") || file.type.includes("zip")) {
          if (!isPro) {
            setIsPricingModalOpen(true);
          } else {
            handleZipSelect(file);
          }
        } else {
          if (!isPro) {
            setIsPricingModalOpen(true);
          } else {
            handleDocSelect(file);
          }
        }
      }
    },
    [handleFileSelect, handleZipSelect, handleDocSelect, isPro]
  );

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // ── Stop Generation Handler ───────────────────────────────────────────────
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsPendingWebSearch(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // ── Voice cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── Text to speech with Dynamic Language Detection & Natural Voice Selection ─
  const speakResponse = useCallback(
    (text: string) => {
      try {
        if (
          typeof window === "undefined" ||
          !("speechSynthesis" in window) ||
          typeof SpeechSynthesisUtterance === "undefined"
        ) {
          console.error("Text to speech not supported in this environment");
          return;
        }

        window.speechSynthesis.cancel();
        const textToSpeak = cleanTextForSpeech(text);
        if (!textToSpeak) return;

        const detectedLang = detectSpokenLanguage(textToSpeak);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = detectedLang;
        utterance.rate = detectedLang.startsWith("ar") ? 0.95 : 1.0;
        utterance.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const targetPrefix = detectedLang.split("-")[0].toLowerCase();

        let matchedVoice = voices.find((v) => v.lang.toLowerCase() === detectedLang.toLowerCase());
        if (!matchedVoice) {
          matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
        }

        // Prefer high-quality/natural voice models
        if (targetPrefix === "ar") {
          const naturalAr = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith("ar") &&
              /(google|maged|tarik|laila|hoda|salma|shakir|zeina|naayf|youssef)/i.test(v.name)
          );
          if (naturalAr) matchedVoice = naturalAr;
        } else if (targetPrefix === "en") {
          const naturalEn = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith("en") &&
              /(google|samantha|daniel|zira|natural|premium|jenny)/i.test(v.name)
          );
          if (naturalEn) matchedVoice = naturalEn;
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        utterance.onerror = (event) => {
          setIsSpeaking(false);
          // "interrupted" and "canceled" are standard lifecycle events when playback is stopped/restarted
          if (event.error !== "canceled" && event.error !== "interrupted") {
            console.warn("SpeechSynthesis notice:", event.error || event);
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setIsSpeaking(false);
        console.error("Audio player / TTS API error:", err);
      }
    },
    []
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (
      text: string,
      targetConvId?: string,
      forceSearch?: boolean,
      forceImageGen?: boolean
    ) => {
      const cleanText = text.trim();
      const currentImage = attachedImage;
      const currentFile = attachedFile;
      if ((!cleanText && !currentImage && !currentFile) || isGenerating) return;

      const isSearch = forceSearch !== undefined ? forceSearch : webSearchMode;
      const isImgGen = forceImageGen !== undefined ? forceImageGen : imageGenMode;
      setIsPendingWebSearch(isSearch);
      setIsGenerating(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 1. تثبيت الـ ID المعتمد للشات الحالي حصراً وتجميده لمنع التداخل
      const currentChatId = targetConvId || conversationId || activeChatId;

      let userMessageContent = cleanText;
      if (!userMessageContent) {
        if (currentImage) {
          userMessageContent = isRtl ? "حلل هذه الصورة 🖼️" : "Analyze this image 🖼️";
        } else if (currentFile) {
          if (currentFile.type === "zip") {
            userMessageContent = isRtl
              ? `📦 تحليل وشرح تفصيلي لمشروع (${currentFile.name}) وهيكل ملفاته وشفراته البرمجية.`
              : `📦 Comprehensive analysis and code review of repository (${currentFile.name}).`;
          } else if (currentFile.type === "code") {
            userMessageContent = isRtl
              ? `💻 مراجعة وتدقيق وشرح هذا الكود البرمجي (${currentFile.name}).`
              : `💻 Review, analyze, and explain this code file (${currentFile.name}).`;
          } else {
            userMessageContent = isRtl
              ? `📄 قراءة وتحليل وتلخيص هذا المستند (${currentFile.name}).`
              : `📄 Read, analyze, and summarize this document (${currentFile.name}).`;
          }
        }
      }

      // 2. جلب رسائل الشات الحالي فقط لحظة الإرسال (Fresh Fetch)
      const freshChatObj = getStoredChatById(currentChatId) || chats.find((c) => c.id === currentChatId);
      const baseMessages = freshChatObj && Array.isArray(freshChatObj.messages) ? freshChatObj.messages : [];

      const newUserMsg: ChatMessageItem = {
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        role: "user" as const,
        content: userMessageContent,
        imageUrl: currentImage?.preview || null,
        attachedFile: currentFile
          ? {
              name: currentFile.name,
              type: currentFile.type,
              sizeStr: currentFile.sizeStr,
            }
          : null,
      };

      // 3. حفظ رسالة المستخدم فوراً وتحديث الـ State باستخدام functional update
      setMessages((prev) => {
        const combined = [...prev, newUserMsg];
        saveStoredChat(currentChatId, combined);
        return combined;
      });
      setInputValue("");
      setAttachedImage(null);
      setAttachedFile(null);

      const freshChatForApi = getStoredChatById(currentChatId) || chats.find((c) => c.id === currentChatId);
      const apiMessages = freshChatForApi && Array.isArray(freshChatForApi.messages) ? freshChatForApi.messages : [];
      const botMessageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

      try {
        // 4. إرسال الطلب للـ API مع البث المباشر (Streaming Responses) لتقليل زمن الاستجابة إلى أدنى حد
        const payloadMessages = apiMessages.map((m, idx) => {
          const isLatest = idx === apiMessages.length - 1;
          let contentToSend = m.content;
          if (isLatest && currentFile) {
            contentToSend = `${contentToSend}\n\n${currentFile.fullContent}`;
          }
          return {
            role: m.role,
            content: contentToSend,
            // Strip giant base64 data URLs from past history messages to keep payload small
            imageUrl: m.imageUrl && !m.imageUrl.startsWith("data:") ? m.imageUrl : undefined,
          };
        });

        const userPlan = plan === "pro" ? "pro" : "free";
        const authUserId = user?.id || "anonymous";
        const authHeader = `Bearer ${encodeURIComponent(`${authUserId}:${userPlan}`)}`;

        const responseStream = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
            Authorization: authHeader,
            "x-user-plan": userPlan,
          },
          body: JSON.stringify({
            messages: payloadMessages,
            conversationId: currentChatId,
            personaId: selectedPersona,
            useWebSearch: isSearch,
            generateImage: isImgGen,
            userPlan,
            stream: true,
            image: currentImage
              ? {
                  data: currentImage.data,
                  mimeType: currentImage.mimeType,
                }
              : undefined,
          }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const isSse = responseStream.headers.get("content-type")?.includes("text/event-stream");

        let streamAccumulatedText = "";
        let finalImageUrl: string | null = null;
        let finalSources: Array<{ title: string; uri: string; domain?: string }> | undefined = undefined;
        let finalSuggestions: string[] | undefined = undefined;
        let responseWebSearch = isSearch;
        let responseImageGen = isImgGen;
        let limitReached = false;

        if (isSse && responseStream.body) {
          const reader = responseStream.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let sseBuffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const sseLines = sseBuffer.split("\n");
            sseBuffer = sseLines.pop() || "";

            for (const line of sseLines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const jsonStr = trimmed.replace(/^data:\s*/, "");
              if (!jsonStr) continue;

              try {
                const sseData = JSON.parse(jsonStr);

                if (sseData.type === "chunk" && sseData.text) {
                  streamAccumulatedText += sseData.text;
                  setMessages((prev) => {
                    const existingIdx = prev.findIndex((m) => m.id === botMessageId);
                    if (existingIdx !== -1) {
                      const updated = [...prev];
                      updated[existingIdx] = {
                        ...updated[existingIdx],
                        content: streamAccumulatedText,
                        searchSources: finalSources,
                        isWebSearch: responseWebSearch,
                        isImageGeneration: responseImageGen,
                      };
                      return updated;
                    } else {
                      return [
                        ...prev,
                        {
                          id: botMessageId,
                          role: "assistant",
                          content: streamAccumulatedText,
                          imageUrl: null,
                          isWebSearch: responseWebSearch,
                          isImageGeneration: responseImageGen,
                          searchSources: finalSources,
                        },
                      ];
                    }
                  });
                } else if (sseData.type === "sources") {
                  finalSources = sseData.sources;
                  responseWebSearch = true;
                  setMessages((prev) => {
                    const existingIdx = prev.findIndex((m) => m.id === botMessageId);
                    if (existingIdx !== -1) {
                      const updated = [...prev];
                      updated[existingIdx] = {
                        ...updated[existingIdx],
                        searchSources: finalSources,
                        isWebSearch: true,
                      };
                      return updated;
                    }
                    return prev;
                  });
                } else if (sseData.type === "image" && sseData.imageUrl) {
                  finalImageUrl = sseData.imageUrl;
                  responseImageGen = true;
                  setMessages((prev) => {
                    const existingIdx = prev.findIndex((m) => m.id === botMessageId);
                    if (existingIdx !== -1) {
                      const updated = [...prev];
                      updated[existingIdx] = {
                        ...updated[existingIdx],
                        imageUrl: sseData.imageUrl,
                        isImageGeneration: true,
                      };
                      return updated;
                    }
                    return prev;
                  });
                } else if (sseData.type === "done") {
                  if (sseData.message) streamAccumulatedText = sseData.message;
                  if (sseData.imageUrl) finalImageUrl = sseData.imageUrl;
                  if (sseData.suggestions) finalSuggestions = sseData.suggestions;
                  if (sseData.searchSources) finalSources = sseData.searchSources;
                  if (sseData.isWebSearch !== undefined) responseWebSearch = sseData.isWebSearch;
                  if (sseData.isImageGeneration !== undefined) responseImageGen = sseData.isImageGeneration;
                  if (sseData.limitReached) limitReached = true;
                } else if (sseData.type === "error") {
                  throw new Error(sseData.error || "خطأ أثناء معالجة الرد");
                }
              } catch (e: any) {
                if (e.message && e.message !== "Unexpected end of JSON input" && !e.message.includes("JSON")) {
                  throw e;
                }
              }
            }
          }
        } else {
          // Fallback if not streaming or if error occurred
          if (!responseStream.ok) {
            let errorJson: any = {};
            try {
              errorJson = await responseStream.json();
            } catch {}
            throw new Error(errorJson.error || `خطأ في الخادم (${responseStream.status})`);
          }
          const response = await responseStream.json();
          streamAccumulatedText = response.message;
          finalImageUrl = response.imageUrl || null;
          finalSources = response.searchSources;
          finalSuggestions = response.suggestions;
          responseWebSearch = response.isWebSearch ?? isSearch;
          responseImageGen = response.isImageGeneration ?? isImgGen;
          limitReached = Boolean(response.limitReached);
        }

        if (abortController.signal.aborted) return;

        // 5. حفظ رد الـ AI باستخدام functional update لضمان عدم مسح الرسائل السابقة
        const botMessage: ChatMessageItem = {
          id: botMessageId,
          role: "assistant",
          content: streamAccumulatedText,
          imageUrl: finalImageUrl,
          isWebSearch: responseWebSearch,
          isImageGeneration: responseImageGen,
          searchSources: finalSources,
          suggestions: finalSuggestions,
        };

        if ((currentImage || finalImageUrl || responseImageGen) && !limitReached) {
          recordImageUsage();
        }

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== botMessageId);
          const combined = [...filtered, botMessage];
          saveStoredChat(currentChatId, combined);
          return combined;
        });
        setIsPendingWebSearch(false);
        setIsGenerating(false);
        abortControllerRef.current = null;
        speakResponse(streamAccumulatedText);

        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() });

      } catch (err: any) {
        setIsPendingWebSearch(false);
        setIsGenerating(false);
        abortControllerRef.current = null;

        if (abortController.signal.aborted || err?.name === "AbortError") {
          const currentChatData = getStoredChatById(currentChatId);
          const currentMsgs = currentChatData?.messages || [];
          const partialMsg = currentMsgs.find((m) => m.id === botMessageId && m.content.length > 0);
          const stoppedMessages: ChatMessageItem[] = partialMsg
            ? currentMsgs.map((m) =>
                m.id === botMessageId
                  ? {
                      ...m,
                      content: `${m.content}\n\n${isRtl ? "⏹️ [تم إيقاف توليد الرد]" : "⏹️ [Generation stopped]"}`,
                    }
                  : m
              )
            : [
                ...currentMsgs,
                {
                  role: "assistant",
                  content: isRtl ? "⏹️ تم إيقاف توليد الرد." : "⏹️ Generation stopped.",
                },
              ];
          saveStoredChat(currentChatId, stoppedMessages);
          setChats(getStoredChats());
          return;
        }

        console.error("Error sending message:", err);
        const serverError = err?.data?.error || err?.response?.data?.error;
        const errorText =
          serverError ||
          (err?.message && err.message !== "Failed to fetch" && err.message !== "Load failed" ? err.message : null) ||
          (isRtl
            ? "تعذر الاتصال بالخادم الذكي، يرجى التحقق من اتصال الشبكة وإعادة المحاولة."
            : "Failed to connect to the AI server. Please check your network connection and try again.");
        const currentChatData = getStoredChatById(currentChatId);
        const currentMsgs = currentChatData?.messages || [];
        const errorMessages: ChatMessageItem[] = [
          ...currentMsgs.filter((m) => m.id !== botMessageId),
          {
            role: "assistant",
            content: `⚠️ ${errorText}`,
          },
        ];
        saveStoredChat(currentChatId, errorMessages);
        setChats(getStoredChats());
      }
    },
    [
      attachedImage,
      isGenerating,
      webSearchMode,
      imageGenMode,
      conversationId,
      activeChatId,
      chats,
      sendMessageMutation,
      isRtl,
      speakResponse,
      queryClient,
      user,
      plan,
      recordImageUsage,
      selectedPersona,
    ]
  );

  // ── Check Initial Prompt from Home ────────────────────────────────────────
  useEffect(() => {
    if (!initialPromptHandledRef.current) {
      const initialPrompt = sessionStorage.getItem("m7_initial_prompt");
      if (initialPrompt) {
        initialPromptHandledRef.current = true;
        sessionStorage.removeItem("m7_initial_prompt");
        handleSend(initialPrompt);
      }
    }
  }, [handleSend]);

  // ── Speech to text ─────────────────────────────────────────────────────────
  const handleVoiceToggle = useCallback(() => {
    if (isGenerating) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSpeechError(isRtl ? "الإملاء الصوتي غير مدعوم في هذا المتصفح" : "Speech recognition not supported");
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = isRtl ? "ar-SA" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    voiceTranscriptRef.current = "";
    setInputValue("");
    setSpeechError("");

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      voiceTranscriptRef.current = finalTranscript.trim();
      setInputValue([finalTranscript, interimTranscript].filter(Boolean).join(" ").trim());
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;

      const errorMessage =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? isRtl
            ? "اسمح للمتصفح باستخدام الميكروفون لبدء المحادثة الصوتية"
            : "Please allow microphone access"
          : isRtl
            ? "تعذر التقاط الصوت، حاول مرة أخرى"
            : "Voice input error, please try again";
      setSpeechError(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      const transcript = voiceTranscriptRef.current.trim();
      voiceTranscriptRef.current = "";
      if (transcript) {
        handleSend(transcript);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setSpeechError(isRtl ? "تعذر تشغيل الميكروفون، حاول مرة أخرى" : "Could not start microphone");
    }
  }, [handleSend, isListening, sendMessageMutation.isPending, isRtl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => {
      setCopiedIdx(null);
    }, 2000);
  };

  // Helper to generate fresh unique session ID
  const createNewSessionId = useCallback(() => {
    return "chat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  }, []);

  // ── New conversation handler ──────────────────────────────────────────────
  const handleNewConversation = useCallback(() => {
    // 1. Cut connection / abort any active request from previous session
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setSidebarOpen(false);
    
    // 2. Create new session ID
    const newSessionId = createNewSessionId();
    
    // 3. Initialize clean empty conversation in storage
    const updatedChats = saveStoredChat(newSessionId, [], isRtl ? "محادثة جديدة" : "New Chat");
    
    // 4. Override state directly: clear messages, set new active session ID
    setChats(updatedChats);
    setActiveChatId(newSessionId);
    setInputValue("");
    setAttachedImage(null);
    setImageGenMode(false);
    setWebSearchMode(false);
    setActionMenuOpen(false);
    setIsGenerating(false);
    setIsPendingWebSearch(false);
    
    // 5. Navigate directly to the new empty chat route
    navigate('/chat/' + newSessionId, { replace: true });
    
    setTimeout(() => {
      inputFieldRef.current?.focus();
    }, 50);
  }, [createNewSessionId, isRtl, navigate]);

  // ── Rename conversation ───────────────────────────────────────────────────
  const handleStartRename = (conv: { id: string; title: string }) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    try {
      updateStoredChatTitle(id, editingTitle.trim());
      setChats(getStoredChats());
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    } catch (e) {
      console.warn("Failed to rename conversation:", e);
    } finally {
      setEditingConvId(null);
    }
  };

  // ── Delete single conversation ────────────────────────────────────────────
  const handleDeleteConversation = (id: string) => {
    setDeletingConvId(id);
    const remaining = deleteStoredChatById(id);
    setChats(remaining);
    setDeletingConvId(null);

    // Also sync with server if needed
    fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => {});

    if (id === activeChatId || id === conversationId) {
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id);
        navigate(`/chat/${remaining[0].id}`);
      } else {
        const newId = "chat_" + Date.now();
        saveStoredChat(newId, [], isRtl ? "محادثة جديدة" : "New Chat");
        const fresh = getStoredChats();
        setChats(fresh);
        setActiveChatId(newId);
        navigate(`/chat/${newId}`);
      }
    }
  };

  // ── Clear all conversations ───────────────────────────────────────────────
  const handleClearAllConversations = async () => {
    setIsClearingAll(true);
    try {
      await fetch("/api/conversations", { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      try {
        localStorage.removeItem("m7_cached_conversations");
      } catch {}
      setShowClearConfirm(false);
      setMessages([]);
      navigate("/chat");
    } catch (e) {
      console.error("Failed to clear all conversations:", e);
    } finally {
      setIsClearingAll(false);
    }
  };

  // ── Clear App Cache & Reset Session State ─────────────────────────────────
  const handleClearAppCache = () => {
    setIsCleaningCache(true);
    try {
      performFullAppCacheClean();
      queryClient.clear();
      setMessages([]);
      setAttachedImage(null);
      setInputValue("");
      navigate("/chat");
    } catch (e) {
      console.error("Failed to clean app cache:", e);
    } finally {
      setIsCleaningCache(false);
      setSidebarOpen(false);
    }
  };

  // ── Delete memory fact ────────────────────────────────────────────────────
  const handleDeleteMemory = (key: string) => {
    setDeletingMemKey(key);
    deleteMemoryMutation.mutate(
      { key },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() });
          setDeletingMemKey(null);
        },
        onError: () => setDeletingMemKey(null),
      }
    );
  };

  const memoryFacts = memoryQuery.data ?? [];

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Group conversations by time category (اليوم، الأسبوع الماضي، الشهور السابقة)
  const groupedConversations = useMemo(() => {
    const today: typeof conversations = [];
    const lastWeek: typeof conversations = [];
    const older: typeof conversations = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 86400000;

    for (const c of filteredConversations) {
      const time = new Date(c.updatedAt || c.createdAt || Date.now()).getTime();
      if (time >= todayStart) {
        today.push(c);
      } else if (time >= weekStart) {
        lastWeek.push(c);
      } else {
        older.push(c);
      }
    }

    return [
      { key: "today", label: isRtl ? "اليوم" : "Today", icon: Clock, items: today },
      { key: "week", label: isRtl ? "الأسبوع الماضي" : "Last Week", icon: Calendar, items: lastWeek },
      { key: "older", label: isRtl ? "الشهور السابقة" : "Previous Months", icon: History, items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredConversations, isRtl]);

  // ── Sidebar Inner Body Component ──────────────────────────────────────────
  const renderSidebarBody = () => (
    <div className="flex flex-col h-full select-none bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] flex-shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/")}
          title={isRtl ? "الصفحة الرئيسية" : "Home"}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform flex-shrink-0">
            <span className="font-extrabold text-black text-xs">M7</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[var(--text-main)] text-sm">M7 AI</span>
              <span className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] font-black px-2 py-0.5 rounded-full border border-[#F59E0B]/30 tracking-wider shadow-sm">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)] block -mt-0.5">
              {isRtl ? "سجل المحادثات الذكي" : "Smart Chat History"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse sidebar on desktop */}
          <button
            onClick={() => setDesktopSidebarOpen(false)}
            className="hidden md:flex w-8 h-8 rounded-full bg-[var(--bg-card)] hover:opacity-80 text-[var(--text-secondary)] hover:text-amber-500 items-center justify-center transition-colors border border-[var(--border-color)]"
            title={isRtl ? "إخفاء القائمة الجانبية" : "Hide Sidebar"}
          >
            <PanelLeftClose className="w-4 h-4 rtl:rotate-180" />
          </button>

          {/* Close drawer on mobile */}
          <button
            className="md:hidden w-8 h-8 rounded-full bg-[var(--bg-card)] hover:opacity-80 text-[var(--text-secondary)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border-color)]"
            onClick={() => setSidebarOpen(false)}
            title={isRtl ? "إغلاق" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions & Search Section */}
      <div className="p-3.5 space-y-2.5 flex-shrink-0">
        {/* New conversation button */}
        <Button
          className="w-full gap-2 rounded-[16px] h-12 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-black font-extrabold text-sm shadow-lg shadow-[#F59E0B]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center border-0"
          onClick={handleNewConversation}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isRtl ? "محادثة جديدة" : "New Chat"}</span>
        </Button>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute right-3 rtl:right-3 rtl:left-auto text-[var(--text-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder={isRtl ? "البحث في سجل المحادثات..." : "Search chat history..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-8 rtl:pr-9 rtl:pl-8 py-2.5 text-xs rounded-[14px] bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[#F59E0B]/60 focus:ring-1 focus:ring-[#F59E0B]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 rtl:left-2.5 rtl:right-auto text-[var(--text-secondary)] hover:text-[var(--text-main)] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation list with time categorization */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-3 min-h-0 custom-scrollbar">
        {convs.isLoading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--text-secondary)] text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-[#F59E0B]" />
            <span>{isRtl ? "جارٍ جلب السجل..." : "Loading chats..."}</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 rounded-[18px] bg-[var(--bg-card)] border border-[var(--border-color)] text-center shadow-lg my-6 mx-1 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mx-auto mb-3.5 shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-[var(--text-main)] mb-1.5">
              {searchQuery
                ? isRtl
                  ? "لا توجد نتائج مطابقة لبحثك"
                  : "No matching conversations"
                : isRtl
                  ? "لا توجد محادثات سابقة بعد."
                  : "No previous chats yet."}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {searchQuery
                ? isRtl
                  ? "جرب كلمة بحث أخرى"
                  : "Try another search term"
                : isRtl
                  ? "ابدأ محادثتك الأولى الآن مع M7 AI واستكشف إمكانيات الذكاء الاصطناعي."
                  : "Start your first conversation with M7 AI and explore intelligent AI capabilities."}
            </p>
          </div>
        ) : (
          groupedConversations.map((group) => (
            <div key={group.key} className="space-y-1.5">
              {/* Group Category Header */}
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                <group.icon className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{group.label}</span>
                <span className="text-[9px] bg-black/5 dark:bg-white/5 px-1.5 py-0.2 rounded-full text-[var(--text-secondary)]">
                  {group.items.length}
                </span>
              </div>

              {/* Group Items */}
              {group.items.map((conv) => {
                const isActive = conv.id === conversationId;
                const isEditing = editingConvId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-[14px] p-2.5 cursor-pointer transition-all border text-right",
                      isActive
                        ? "bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B] shadow-sm"
                        : "bg-[var(--bg-card)] hover:opacity-90 border-[var(--border-color)] hover:border-[#F59E0B]/40 text-[var(--text-main)]"
                    )}
                    onClick={() => {
                      if (isEditing) return;
                      setSidebarOpen(false);
                      if (conv.id !== conversationId) {
                        navigate(`/chat/${conv.id}`);
                      }
                    }}
                  >
                    {/* Active Indicator & Icon */}
                    <div className="relative flex-shrink-0">
                      <MessageSquare
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-[#F59E0B]" : "text-[var(--text-secondary)] group-hover:text-[#F59E0B]"
                        )}
                      />
                      {isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                      )}
                    </div>

                    {/* Title and Time / Edit mode */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(conv.id);
                              if (e.key === "Escape") setEditingConvId(null);
                            }}
                            autoFocus
                            className="w-full text-xs bg-[var(--bg-primary)] border border-[#F59E0B]/50 rounded-lg px-2 py-1 text-[var(--text-main)] focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveRename(conv.id)}
                            className="p-1 rounded bg-[#F59E0B] text-black hover:bg-[#F59E0B]/80 font-bold"
                            title={isRtl ? "حفظ" : "Save"}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingConvId(null)}
                            className="p-1 rounded bg-black/10 dark:bg-white/10 text-[var(--text-main)] hover:opacity-80"
                            title={isRtl ? "إلغاء" : "Cancel"}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p
                            className={cn(
                              "text-xs font-semibold truncate leading-snug",
                              isActive ? "text-[#F59E0B]" : "text-[var(--text-main)]"
                            )}
                          >
                            {conv.title || (isRtl ? "محادثة بدون عنوان" : "Untitled Chat")}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                            <span>{parseRelativeTime(conv.updatedAt || (conv as any).createdAt, isRtl)}</span>
                          </p>
                        </>
                      )}
                    </div>

                    {/* Actions (Rename & Delete) */}
                    {!isEditing && (
                      <div
                        className={cn(
                          "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
                          (isActive || deletingConvId === conv.id) && "opacity-100"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#F59E0B] transition-all"
                          onClick={() => handleStartRename(conv)}
                          title={isRtl ? "إعادة تسمية المحادثة" : "Rename chat"}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-500 transition-all"
                          onClick={() => handleDeleteConversation(conv.id)}
                          title={isRtl ? "حذف المحادثة" : "Delete chat"}
                        >
                          {deletingConvId === conv.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </nav>

      {/* Clear All Chats action button */}
      {conversations.length > 0 && (
        <div className="px-3.5 py-1.5 border-t border-[var(--border-color)] flex-shrink-0">
          {showClearConfirm ? (
            <div className="p-2.5 rounded-[14px] bg-red-500/10 border border-red-500/30 text-xs space-y-2 animate-in fade-in">
              <p className="text-[11px] text-red-500 dark:text-red-300 font-semibold text-center">
                {isRtl ? "هل أنت متأكد من مسح كافة المحادثات؟" : "Clear all chat history?"}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-3 font-bold rounded-lg"
                  onClick={handleClearAllConversations}
                  disabled={isClearingAll}
                >
                  {isClearingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : isRtl ? "نعم، احذف الكل" : "Yes, delete"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-3 rounded-lg"
                  onClick={() => setShowClearConfirm(false)}
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:text-red-500 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.04]"
            >
              <Trash2 className="w-3 h-3" />
              <span>{isRtl ? "مسح سجل المحادثات بالكامل" : "Clear all chat history"}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Smart Memory Panel & Footer Navigation ─────────────────────────── */}
      <div className="border-t border-[var(--border-color)] flex-shrink-0 bg-[var(--bg-primary)] p-3 space-y-2">
        {/* Smart Memory quick row */}
        <button
          className="w-full flex items-center justify-between p-2.5 rounded-[14px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] text-xs text-[var(--text-main)] transition-colors cursor-pointer"
          onClick={() => setMemoryExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#F59E0B]" />
            <span className="font-bold">{isRtl ? "الذاكرة الذكية" : "Smart Memory"}</span>
            {memoryFacts.length > 0 && (
              <span className="text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] font-bold px-1.5 py-0.2 rounded-full">
                {memoryFacts.length}
              </span>
            )}
          </div>
          {memoryExpanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </button>

        {memoryExpanded && (
          <div className="px-1 pb-1 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
            {memoryQuery.isLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" />
              </div>
            ) : memoryFacts.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] text-[11px] py-2">
                {isRtl ? "لا توجد معلومات محفوظة بعد." : "No memory facts stored yet."}
                <br />
                <span className="text-[10px] text-[var(--text-secondary)] opacity-80">
                  {isRtl ? "جرّب: «اسمي محمود»" : "Try: 'My name is Alex'"}
                </span>
              </p>
            ) : (
              memoryFacts.map((fact) => (
                <div
                  key={fact.key}
                  className="group flex items-center justify-between rounded-[12px] px-2.5 py-1.5 bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] transition-colors"
                >
                  <div className="min-w-0 pr-1 text-right">
                    <span className="text-[10px] text-[#F59E0B] font-semibold block">
                      {fact.label}
                    </span>
                    <span className="text-xs text-[var(--text-main)] truncate block">
                      {fact.value}
                    </span>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-500 transition-all flex-shrink-0"
                    onClick={() => handleDeleteMemory(fact.key)}
                  >
                    {deletingMemKey === fact.key ? (
                      <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Subscription Plan Card in Sidebar */}
        <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-[var(--border-color)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs font-black text-[var(--text-main)] truncate">
                {isPro ? "M7 PRO" : isRtl ? "الباقة المجانية" : "Free Plan"}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPro
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40"
                  : "bg-black/10 dark:bg-white/10 text-[var(--text-secondary)] border border-[var(--border-color)]"
              }`}
            >
              {isPro ? (isRtl ? "نشط" : "Active") : `${dailyImages}/5 ${isRtl ? "صور" : "imgs"}`}
            </span>
          </div>

          <button
            onClick={() => setIsPricingModalOpen(true)}
            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              isPro
                ? "bg-black/10 dark:bg-white/10 hover:bg-black/15 text-[var(--text-main)] border border-[var(--border-color)]"
                : "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black shadow-amber-500/20"
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-current" />
            <span>
              {isPro
                ? isRtl
                  ? "تفاصيل الباقة"
                  : "Plan Details"
                : isRtl
                ? "ترقية إلى PRO (5$)"
                : "Upgrade PRO ($5)"}
            </span>
          </button>
        </div>

        {/* Shortcuts footer */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] transition-colors flex-1 justify-center"
            title={isRtl ? "الصفحة الرئيسية" : "Home Page"}
          >
            <Home className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{isRtl ? "الرئيسية" : "Home"}</span>
          </button>

          <button
            onClick={handleClearAppCache}
            disabled={isCleaningCache}
            className="p-2 rounded-[12px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-500 transition-colors"
            title={isRtl ? "تفريغ الذاكرة المؤقتة وبدء جلسة جديدة (Clear Cache)" : "Clear Cache & Fresh Session"}
          >
            {isCleaningCache ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </button>

          <ThemeToggle showLabel={false} isRtl={isRtl} className="p-2 rounded-[12px] bg-[var(--bg-card)] hover:opacity-90 text-[var(--text-main)] border border-[var(--border-color)]" />

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-[12px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:text-[#F59E0B] transition-colors"
            title="Switch Language"
          >
            {isRtl ? "EN" : "عربي"}
          </button>

          <button
            onClick={() => navigate("/profile")}
            title={user?.displayName || (isRtl ? "الملف الشخصي" : "Profile")}
            className="p-2 rounded-[12px] bg-[var(--bg-card)] hover:opacity-90 border border-[var(--border-color)] text-[var(--text-main)] hover:text-[#F59E0B] transition-colors"
          >
            <UserCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-main)] overflow-hidden transition-colors duration-300"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Desktop Sidebar (Fixed Column) */}
      {desktopSidebarOpen && (
        <aside className="hidden md:flex w-80 h-full border-s md:border-s-0 md:border-e border-[var(--border-color)] flex-shrink-0 z-20 overflow-hidden">
          {renderSidebarBody()}
        </aside>
      )}

      {/* Mobile Drawer (80% - 85% width with Glassmorphism backdrop & rounded edge) */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Glassmorphism Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer Panel */}
          <div
            className={cn(
              "relative z-50 h-full w-[82%] sm:w-80 max-w-[360px] bg-[var(--bg-primary)] border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col animate-in duration-300",
              isRtl
                ? "mr-auto rounded-l-[20px] border-l slide-in-from-right"
                : "ml-auto rounded-r-[20px] border-r slide-in-from-left"
            )}
            style={{
              borderRadius: isRtl ? "20px 0 0 20px" : "0 20px 20px 0",
            }}
          >
            {renderSidebarBody()}
          </div>
        </div>
      )}

      {/* Main chat view */}
      <div
        className="flex flex-col flex-1 min-w-0 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />

        {/* Hidden file input for ZIP repository extraction (Pro) */}
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,multipart/x-zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleZipSelect(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />

        {/* Hidden file input for PDF / Code documents (Pro) */}
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.txt,.py,.js,.jsx,.ts,.tsx,.json,.md,.csv,.html,.css,.scss,.c,.cpp,.h,.java,.go,.rs,.sql,.sh,.yml,.yaml,.xml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleDocSelect(e.target.files[0]);
              e.target.value = "";
            }
          }}
        />

        {/* Drag and drop visual overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-amber-500 m-4 rounded-3xl animate-in fade-in duration-200 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mb-3 border border-amber-500/40">
              <ImagePlus className="w-8 h-8 animate-bounce" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              {isRtl ? "أفلت الملف أو الصورة هنا للتحليل فوراً 📦🖼️✨" : "Drop your file or image here to analyze 📦🖼️✨"}
            </p>
            <p className="text-xs text-amber-400/80">
              {isRtl ? "يدعم الصور، ملفات ZIP المضغوطة، مستندات PDF والأكواد البرمجية" : "Supports images, ZIP repositories, PDF documents & source code"}
            </p>
          </div>
        )}

        {/* Top Header */}
        <header className="glass flex-none flex items-center justify-between px-3 sm:px-5 h-16 border-b border-[var(--border-color)] z-10 gap-2">
          {/* Start Section (Left in LTR / Right in RTL): Logo & Title & Badges */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Open Sidebar */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
              title={isRtl ? "فتح سجل المحادثات" : "Open Chat History"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Toggle Sidebar */}
            {!desktopSidebarOpen && (
              <button
                className="hidden md:flex p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-amber-500 transition-colors flex-shrink-0"
                onClick={() => setDesktopSidebarOpen(true)}
                title={isRtl ? "إظهار سجل المحادثات" : "Show Chat History"}
              >
                <PanelLeftOpen className="w-5 h-5 rtl:rotate-180 text-amber-500" />
              </button>
            )}

            {/* Logo */}
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
              onClick={() => navigate("/")}
            >
              <span className="font-extrabold text-black text-xs">M7</span>
            </div>

            {/* Title & Status */}
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 flex-nowrap">
                <h1 className="font-bold text-sm text-[var(--text-main)] leading-tight flex items-center gap-1.5 truncate">
                  <span className="flex-shrink-0">M7 AI</span>
                  {conversationId && (
                    <span className="text-[11px] text-[var(--text-secondary)] font-normal truncate max-w-[100px] sm:max-w-[160px]">
                      • {conversations.find((c) => c.id === conversationId)?.title || ""}
                    </span>
                  )}
                </h1>

                {/* Turbo Speed Badge (Inline with title, no absolute positioning) */}
                {isPro && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-[12px] whitespace-nowrap flex-shrink-0"
                    title={isRtl ? "الاستجابة الخارقة مفعلة مع أولوية معالجة قصوى" : "Turbo Speed Active with Priority Queue"}
                  >
                    <Zap className="w-3 h-3 fill-amber-500 text-amber-500 animate-pulse flex-shrink-0" />
                    <span>Turbo Speed</span>
                  </span>
                )}
              </div>

              {/* Status / Sub-indicator */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)] truncate">
                  {isRtl ? "متصل بالذكاء الاصطناعي 🤖🎨" : "Multimodal AI Ready 🤖🎨"}
                </span>

                {/* Turbo Badge on mobile screens below the title */}
                {isPro && (
                  <span
                    className="inline-flex sm:hidden items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-[10px] whitespace-nowrap flex-shrink-0"
                  >
                    <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500 flex-shrink-0" />
                    <span>Turbo</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* End Section (Right in LTR / Left in RTL): Single-row aligned action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Persona Selector Dropdown */}
            <PersonaSelector
              selectedPersona={selectedPersona}
              onSelectPersona={(pId) => {
                setSelectedPersona(pId);
                try {
                  localStorage.setItem("m7_active_persona", pId);
                } catch {}
              }}
              onOpenPaywall={() => setIsPricingModalOpen(true)}
            />

            {/* Subscription Plan Pill / Button */}
            {isPro ? (
              <button
                onClick={() => setIsPricingModalOpen(true)}
                className="h-8 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition-all flex-shrink-0"
                title={isRtl ? "باقة M7 PRO مفعلة" : "M7 PRO Active"}
              >
                <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="hidden sm:inline">PRO</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPricingModalOpen(true)}
                className="h-8 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-black flex items-center gap-1.5 shadow-sm shadow-amber-500/20 transition-all hover:scale-102 flex-shrink-0"
                title={isRtl ? "ترقية إلى باقة PRO (5$ شهرياً)" : "Upgrade to PRO ($5/mo)"}
              >
                <Crown className="w-3.5 h-3.5 text-black flex-shrink-0" />
                <span className="hidden sm:inline">{isRtl ? "ترقية PRO" : "Upgrade PRO"}</span>
              </button>
            )}

            {/* Quick New Chat Button in Header */}
            <Button
              size="sm"
              onClick={handleNewConversation}
              className="h-8 px-2.5 sm:px-3 gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-600 dark:text-amber-300 hover:text-black border border-amber-500/40 text-xs font-bold transition-all flex-shrink-0"
              title={isRtl ? "محادثة جديدة" : "New Chat"}
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden md:inline">{isRtl ? "محادثة جديدة" : "New Chat"}</span>
            </Button>

            <ThemeToggle showLabel={false} isRtl={isRtl} />

            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-amber-500 transition-colors flex-shrink-0"
              title={isRtl ? "الصفحة الرئيسية" : "Home"}
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-amber-500 transition-colors flex-shrink-0"
              title={isRtl ? "الملف الشخصي" : "Profile"}
            >
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto flex flex-col space-y-6">
            {history.isLoading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
                <p className="text-xs text-[var(--text-secondary)]">
                  {isRtl ? "جارٍ تحميل المحادثة..." : "Loading conversation..."}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 pt-6 pb-4 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-transparent flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <span className="text-3xl font-black text-[#F59E0B]">M7</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)]">
                    {isRtl
                      ? "أهلاً بك! أنا M7 AI، كيف يمكنني مساعدتك اليوم؟ 🤖✨"
                      : "Welcome! I'm M7 AI, how can I assist you today? 🤖✨"}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isRtl
                      ? "يدعم المحادثة الفورية، توليد الصور 🎨، تحليل الصور 🖼️، والبحث الحي في الويب 🌐"
                      : "Supports instant chat, AI image generation 🎨, image vision analysis 🖼️, & web search 🌐"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="p-4 rounded-2xl bg-[var(--bg-card)] hover:opacity-95 border border-[var(--border-color)] hover:border-amber-500/40 transition-all text-start group shadow-md"
                    >
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-main)] group-hover:text-amber-500 transition-colors">
                        {s}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessageCard
                    key={msg.id || idx + "_" + (msg.content?.slice(0, 15) || "")}
                    msg={msg}
                    idx={idx}
                    isRtl={isRtl}
                    isCopied={copiedIdx === idx}
                    copiedSourceUri={copiedSourceUri}
                    isLatestAssistant={idx === messages.length - 1 && msg.role === "assistant"}
                    isGenerating={isGenerating}
                    isPro={isPro}
                    onCopyText={handleCopy}
                    onSpeak={speakResponse}
                    onSelectSuggestion={(suggestion) => {
                      if (
                        suggestion.includes("ترقية") ||
                        suggestion.toLowerCase().includes("upgrade") ||
                        suggestion.toLowerCase().includes("باقة pro") ||
                        suggestion.toLowerCase().includes("pro plan")
                      ) {
                        setIsPricingModalOpen(true);
                        return;
                      }
                      handleSend(suggestion);
                    }}
                    onRetry={() => {
                      const prevUserMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
                      if (prevUserMsg) {
                        handleSend(prevUserMsg.content, undefined, msg.isWebSearch, msg.isImageGeneration);
                      }
                    }}
                    onOpenImageModal={setImageModalUrl}
                    onCopySource={handleCopySource}
                  />
                ))}

                {isGenerating && (
                  <LoadingStateCard
                    isPendingWebSearch={isPendingWebSearch}
                    imageGenMode={imageGenMode}
                    isRtl={isRtl}
                    isPro={isPro}
                    onStop={handleStopGeneration}
                  />
                )}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Bottom Input Section */}
        <footer className="glass flex-none p-3 sm:p-4 border-t border-[var(--border-color)]">
          {/* Active Mode / Attachment Badges */}
          {attachedFile ? (
            <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 border border-amber-500/40">
                  {attachedFile.type === "zip" ? (
                    <FolderArchive className="w-5 h-5 text-amber-500" />
                  ) : attachedFile.type === "code" ? (
                    <FileCode className="w-5 h-5 text-amber-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-amber-500 text-xs flex items-center gap-1.5">
                    <span>
                      {attachedFile.type === "zip"
                        ? (isRtl ? "أرشيف ZIP مضغوط للتحليل الذكي 📦👑" : "ZIP Repository for AI Analysis 📦👑")
                        : attachedFile.type === "code"
                        ? (isRtl ? "ملف برمجي للمراجعة والفحص 💻👑" : "Code File for AI Code Review 💻👑")
                        : (isRtl ? "مستند للتحليل والتلخيص 📄👑" : "Document for AI Analysis 📄👑")}
                    </span>
                    {attachedFile.sizeStr && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono">
                        {attachedFile.sizeStr}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[220px] sm:max-w-md">
                    {attachedFile.name} {attachedFile.fileCount ? `(${attachedFile.fileCount} عنصر)` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors flex-shrink-0"
                title={isRtl ? "إلغاء إرفاق الملف" : "Remove attached file"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : isExtractingZip ? (
            <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-600 dark:text-amber-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block">
                  {isRtl
                    ? "جارٍ فك وقراءة شجرة ملفات وأكواد الـ ZIP برمجياً..."
                    : "Extracting and parsing ZIP files & codebase..."}
                </span>
                <span className="text-[10px] opacity-80">
                  {isRtl ? "يتم استخراج الهيكل والأكواد لتحليل فوري" : "Extracting tree & code snippets for AI reasoning"}
                </span>
              </div>
            </div>
          ) : attachedImage ? (
            <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={attachedImage.preview}
                  alt="Attached preview"
                  className="w-10 h-10 object-cover rounded-xl border border-amber-500/40 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-amber-500 text-xs flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isRtl ? "صورة مرفقة للتحليل الذكي 🖼️" : "Attached for AI Vision Analysis 🖼️"}</span>
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px] sm:max-w-md">
                    {attachedImage.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors flex-shrink-0"
                title={isRtl ? "إلغاء إرفاق الصورة" : "Remove attached image"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : imageGenMode ? (
            <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-600 dark:text-amber-300 animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-2 font-medium">
                <Paintbrush className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="font-bold">{isRtl ? "🎨 وضع توليد الصور مفعّل (Pro)" : "🎨 AI Image Gen Active (Pro)"}</span>
                <span className="opacity-80 hidden sm:inline">
                  {isRtl ? "— اكتب وصف الصورة واضغط إرسال" : "— Describe image to create"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setImageGenMode(false)}
                className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 transition-colors"
                title={isRtl ? "إلغاء وضع توليد الصور" : "Cancel image mode"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : webSearchMode ? (
            <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/40 text-xs text-blue-600 dark:text-blue-300 animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-2 font-medium">
                <Globe className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="font-bold">{isRtl ? "🌐 وضع البحث الحي في الويب مفعّل" : "🌐 Live Web Search Active"}</span>
                <span className="opacity-80 hidden sm:inline">
                  {isRtl ? "— سيتم البحث عبر Google وتوثيق المصادر" : "— Real-time search with grounded links"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWebSearchMode(false)}
                className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 transition-colors"
                title={isRtl ? "إلغاء وضع البحث في الويب" : "Cancel web search"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              if (isGenerating) {
                e.preventDefault();
                handleStopGeneration();
                return;
              }
              handleSubmit(e);
            }}
            className={cn(
              "max-w-3xl mx-auto relative flex items-center gap-1.5 sm:gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 sm:p-2 rounded-[28px] shadow-lg transition-all focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-[#F59E0B]/60",
              (webSearchMode || imageGenMode || attachedImage || attachedFile) && "border-[#F59E0B]/60 ring-2 ring-[#F59E0B]/30 bg-amber-500/[0.03]",
              isGenerating && "border-red-500/40 ring-1 ring-red-500/30"
            )}
            dir={isRtl ? "rtl" : "ltr"}
          >
            {/* Popover Action Sheet (+ Menu) */}
            <div ref={actionMenuRef} className="relative flex-shrink-0 flex items-center">
              {actionMenuOpen && (
                <div
                  className={cn(
                    "absolute bottom-13 z-50 min-w-[280px] sm:min-w-[320px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150",
                    isRtl ? "right-0" : "left-0"
                  )}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between border-b border-[var(--border-color)] mb-1.5">
                    <span>{isRtl ? "إضافات وأدوات M7 AI" : "M7 AI Tools & Actions"}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  </div>

                  <div className="space-y-1">
                    {/* Option 1: Standard Image Upload (Available for all) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)] transition-all text-start group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 group-hover:bg-emerald-500/25 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-main)]">
                            {isRtl ? "📷 إرفاق صورة عادية" : "📷 Standard Image"}
                          </span>
                          {!isPro && (
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              {5 - dailyImages}/5
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {isRtl ? "رفع صورة أو التقاط بالكاميرا (متاح للجميع)" : "Upload image or snap photo (Free & Pro)"}
                        </p>
                      </div>
                    </button>

                    {/* Option 2: 👑 Advanced Image Generator (Pro) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPro) {
                          setActionMenuOpen(false);
                          setIsPricingModalOpen(true);
                          return;
                        }
                        setImageGenMode((prev) => !prev);
                        if (!imageGenMode) setWebSearchMode(false);
                        setActionMenuOpen(false);
                        setTimeout(() => inputFieldRef.current?.focus(), 50);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-start group cursor-pointer",
                        imageGenMode
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40"
                          : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                          imageGenMode ? "bg-[#F59E0B] text-black shadow-sm" : "bg-amber-500/15 text-[#F59E0B] group-hover:bg-amber-500/25"
                        )}
                      >
                        <Paintbrush className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                            <span>{isRtl ? "صانع الصور المتقدم" : "AI Image Generator"}</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">
                            <Crown className="w-2.5 h-2.5 fill-black" /> PRO
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {isRtl ? "توليد وتصميم صور فوتوغرافية وفنية فائقة الدقة" : "High-fidelity photorealistic & artistic images"}
                        </p>
                      </div>
                    </button>

                    {/* Option 3: 👑 ZIP Archive Analyzer (Pro) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPro) {
                          setActionMenuOpen(false);
                          setIsPricingModalOpen(true);
                          return;
                        }
                        setActionMenuOpen(false);
                        zipInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)] transition-all text-start group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 group-hover:bg-amber-500/25 flex items-center justify-center flex-shrink-0 transition-colors">
                        <FolderArchive className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                            <span>{isRtl ? "تحليل ملف مضغوط (ZIP)" : "ZIP File Analyzer"}</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">
                            <Crown className="w-2.5 h-2.5 fill-black" /> PRO
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {isRtl ? "فك وضغط المشاريع البرمجية وقراءة هيكلها وأكوادها" : "Extract & analyze repo architecture & code"}
                        </p>
                      </div>
                    </button>

                    {/* Option 4: 👑 PDF & Code Document Analyzer (Pro) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isPro) {
                          setActionMenuOpen(false);
                          setIsPricingModalOpen(true);
                          return;
                        }
                        setActionMenuOpen(false);
                        docInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)] transition-all text-start group cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-500 group-hover:bg-cyan-500/25 flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1">
                            <span>{isRtl ? "تحليل مستند PDF / كود" : "PDF & Code Analyzer"}</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">
                            <Crown className="w-2.5 h-2.5 fill-black" /> PRO
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {isRtl ? "تحليل ملفات PDF والأكواد البرمجية والمستندات الطويلة" : "Deep analysis of PDF docs, papers & code files"}
                        </p>
                      </div>
                    </button>

                    {/* Option 5: Live Web Search */}
                    <button
                      type="button"
                      onClick={() => {
                        setWebSearchMode((prev) => !prev);
                        if (!webSearchMode) setImageGenMode(false);
                        setActionMenuOpen(false);
                        setTimeout(() => inputFieldRef.current?.focus(), 50);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-start group cursor-pointer",
                        webSearchMode
                          ? "bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/40"
                          : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                          webSearchMode ? "bg-blue-500 text-white shadow-sm" : "bg-blue-500/15 text-blue-500 group-hover:bg-blue-500/25"
                        )}
                      >
                        <Globe className={cn("w-4 h-4", webSearchMode && "animate-spin")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-main)]">
                            {isRtl ? "🌐 بحث حي في الويب" : "🌐 Live Web Search"}
                          </span>
                          {webSearchMode && (
                            <span className="text-[10px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                              {isRtl ? "مفعّل" : "Active"}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {isRtl ? "جلب أحدث المعلومات الحية من Google" : "Real-time Google search grounding"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* The Enhanced (+) Button */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setActionMenuOpen((prev) => !prev)}
                disabled={isGenerating}
                aria-label={isRtl ? "قائمة الإضافات والخيارات (+)" : "Action menu (+)"}
                title={isRtl ? "خيارات وإضافات الذكاء الاصطناعي (+)" : "AI Actions & Tools (+)"}
                className={cn(
                  "h-9 w-9 min-w-[36px] flex-shrink-0 rounded-full transition-all duration-200 flex items-center justify-center font-bold text-amber-500 hover:text-black hover:bg-[#F59E0B] bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 active:scale-95 shadow-sm cursor-pointer",
                  actionMenuOpen && "bg-[#F59E0B] text-black rotate-45 border-[#F59E0B] shadow-md shadow-amber-500/20",
                  (imageGenMode || webSearchMode || attachedImage || attachedFile) && !actionMenuOpen && "ring-2 ring-amber-400/50 bg-amber-500/20 text-amber-600 dark:text-amber-300"
                )}
              >
                <Plus className="w-5 h-5 transition-transform duration-200 stroke-[2.5]" />
              </Button>
            </div>

            {/* Flexible Input Text Field */}
            <input
              ref={inputFieldRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isGenerating
                  ? (isRtl
                      ? "⏹️ جاري توليد الرد... اضغط زر الإيقاف للإلغاء فوراً"
                      : "⏹️ Generating response... Click stop to abort")
                  : attachedImage
                    ? (isRtl
                        ? "🖼️ اكتب سؤالك حول هذه الصورة (أو اضغط إرسال للتحليل)..."
                        : "🖼️ Ask about this image (or press send for analysis)...")
                    : imageGenMode
                      ? (isRtl
                          ? "🎨 صف الصورة التي تريد توليدها بدقة..."
                          : "🎨 Describe image to generate...")
                      : webSearchMode
                        ? (isRtl
                            ? "🌐 اكتب ما تريد البحث عنه في الويب مباشرة..."
                            : "🌐 Type what to search on live web...")
                        : (isRtl
                            ? "اكتب رسالتك، أو اضغط (+) لأدوات وتوليد الصور..."
                            : "Type a message, or click (+) for tools & images...")
              }
              className={cn(
                "flex-1 min-w-0 h-10 px-2 sm:px-3 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm sm:text-base text-[var(--text-main)] placeholder:text-[var(--text-secondary)] transition-all",
                isRtl ? "text-right" : "text-left"
              )}
              disabled={isGenerating}
            />

            {/* Voice Dictation Button */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleVoiceToggle}
              disabled={isGenerating}
              aria-label={isListening ? "إيقاف الاستماع" : "بدء المحادثة الصوتية"}
              title={isListening ? (isRtl ? "إيقاف الاستماع" : "Stop listening") : (isRtl ? "تحدث صوتياً" : "Speak")}
              className={cn(
                "h-9 w-9 min-w-[36px] flex-shrink-0 rounded-full transition-all duration-200 flex items-center justify-center",
                isListening
                  ? "bg-red-500/20 text-red-500 ring-2 ring-red-400/30 animate-pulse hover:bg-red-500/30"
                  : "text-[var(--text-secondary)] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/10",
                "disabled:opacity-50"
              )}
            >
              <Mic className="w-4 h-4" />
            </Button>

            {/* Submit / Stop Button */}
            {isGenerating ? (
              <Button
                type="button"
                size="icon"
                onClick={handleStopGeneration}
                className="h-10 w-10 min-w-[40px] flex-shrink-0 rounded-full text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/40 ring-2 ring-red-400/50 transition-all active:scale-95 animate-pulse cursor-pointer flex items-center justify-center border-0"
                title={isRtl ? "إيقاف توليد الرد ⏹️ (Stop)" : "Stop generating response ⏹️"}
                aria-label={isRtl ? "إيقاف التوليد" : "Stop generation"}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() && !attachedImage}
                className={cn(
                  "h-10 w-10 min-w-[40px] flex-shrink-0 rounded-full !text-black shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center border-0",
                  imageGenMode
                    ? "bg-[#F59E0B] hover:bg-[#F59E0B]/90 shadow-amber-400/30"
                    : webSearchMode
                      ? "bg-[#F59E0B] hover:bg-[#F59E0B]/90 shadow-amber-400/30"
                      : "bg-[#F59E0B] hover:bg-[#F59E0B]/90 shadow-amber-500/20"
                )}
                title={isRtl ? (imageGenMode ? "توليد الصورة 🎨" : webSearchMode ? "إرسال والبحث في الويب" : "إرسال الرسالة") : (imageGenMode ? "Generate Image 🎨" : webSearchMode ? "Send & Search Web" : "Send message")}
              >
                {imageGenMode ? (
                  <Paintbrush className="w-4 h-4 text-black" />
                ) : webSearchMode ? (
                  <Globe className="w-4 h-4 animate-pulse text-black" />
                ) : (
                  <Send className="w-4 h-4 rtl:-scale-x-100 text-black" />
                )}
              </Button>
            )}
          </form>

          {(isListening || isSpeaking || speechError) && (
            <div
              className={cn(
                "mt-2 flex items-center justify-center gap-1.5 text-xs",
                speechError
                  ? "text-red-500"
                  : isListening
                    ? "text-red-500"
                    : "text-amber-500"
              )}
              aria-live="polite"
            >
              {speechError ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : isListening ? (
                <Mic className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              )}
              <span>
                {speechError ||
                  (isListening
                    ? isRtl
                      ? "جارٍ الاستماع... تحدث الآن"
                      : "Listening... speak now"
                    : isRtl
                      ? "M7 يتحدث..."
                      : "M7 is speaking...")}
              </span>
            </div>
          )}

          <div className="text-center mt-2">
            <p className="text-[10px] text-[var(--text-secondary)]">
              {isRtl
                ? "قد يخطئ M7 AI أحياناً. يُرجى التحقق من المعلومات الهامة."
                : "M7 AI may make mistakes. Verify important info."}
            </p>
          </div>
        </footer>

        {/* Fullscreen Image Lightbox Modal */}
        {imageModalUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setImageModalUrl(null)}
          >
            <div className="absolute top-4 right-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <a
                href={imageModalUrl}
                download={`m7-image-${Date.now()}.png`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-black text-white transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <Download className="w-4 h-4" />
                <span>{isRtl ? "تحميل الصورة" : "Download"}</span>
              </a>
              <button
                type="button"
                onClick={() => setImageModalUrl(null)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500 text-white transition-all"
                title={isRtl ? "إغلاق" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-w-4xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
              <img
                src={imageModalUrl}
                alt="Enlarged preview"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              />
            </div>
          </div>
        )}

        {/* Pricing & Subscription Modal */}
        <PricingModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
        />
      </div>
    </div>
  );
}
