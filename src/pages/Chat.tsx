import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
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
  Sparkles,
  Home,
  Bot,
  Globe,
  ExternalLink,
  RotateCcw,
  Image as ImageIcon,
  ImagePlus,
  Paperclip,
  Download,
  Maximize2,
  Paintbrush,
} from "lucide-react";
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

interface ChatMessageItem {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  isWebSearch?: boolean;
  isImageGeneration?: boolean;
  searchSources?: Array<{ title: string; uri: string; domain?: string }>;
}

interface AttachedImage {
  data: string;
  mimeType: string;
  name: string;
  preview: string;
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

function formatDate(dateStr: string, isRtl: boolean) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return isRtl ? "اليوم" : "Today";
  if (diffDays === 1) return isRtl ? "أمس" : "Yesterday";
  return date.toLocaleDateString(isRtl ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
}

export default function Chat() {
  const { id: conversationId } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { i18n } = useTranslation();

  const isRtl = i18n.language === "ar";

  const toggleLanguage = () => {
    const newLang = isRtl ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  useEffect(() => {
    document.dir = isRtl ? "rtl" : "ltr";
  }, [isRtl]);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [imageGenMode, setImageGenMode] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPendingWebSearch, setIsPendingWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [memoryExpanded, setMemoryExpanded] = useState(true);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deletingMemKey, setDeletingMemKey] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const voiceTranscriptRef = useRef("");
  const initialPromptHandledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Load history with <M7IMAGE> parsing ─────────────────────────────────
  useEffect(() => {
    if (history.data && conversationId) {
      setMessages(
        history.data.map((m) => {
          let content = m.content;
          let imageUrl: string | null = null;
          const match = content.match(/<M7IMAGE>([\s\S]*?)<\/M7IMAGE>/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              if (parsed.url) {
                imageUrl = parsed.url;
                content = content.replace(/<M7IMAGE>[\s\S]*?<\/M7IMAGE>/g, "").trim();
              }
            } catch {}
          }
          return {
            role: m.role as "user" | "assistant",
            content,
            imageUrl,
          };
        })
      );
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [history.data, conversationId]);

  // ── File Selection & Paste Handlers ───────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
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
      // When attaching an image, disable image gen mode to prioritize image analysis
      setImageGenMode(false);
    };
    reader.readAsDataURL(file);
  }, []);

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
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  // ── Voice cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── Text to speech ─────────────────────────────────────────────────────────
  const speakResponse = useCallback(
    (text: string) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        setSpeechError(isRtl ? "القراءة الصوتية غير مدعومة في هذا المتصفح" : "Text to speech not supported");
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isRtl ? "ar-SA" : "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(isRtl ? "ar" : "en")
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setSpeechError("");
        setIsSpeaking(true);
      };
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        if (event.error !== "canceled") {
          setSpeechError(isRtl ? "تعذرت قراءة الرد صوتياً" : "Failed to play voice output");
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [isRtl]
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
      if ((!cleanText && !currentImage) || sendMessageMutation.isPending) return;

      const isSearch = forceSearch !== undefined ? forceSearch : webSearchMode;
      const isImgGen = forceImageGen !== undefined ? forceImageGen : imageGenMode;
      setIsPendingWebSearch(isSearch);

      let effectiveConvId = targetConvId !== undefined ? targetConvId : conversationId;

      // If no conversation exists yet, automatically create one first
      if (!effectiveConvId) {
        try {
          const newConv = await createConversation.mutateAsync(undefined);
          effectiveConvId = newConv.id;
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          navigate(`/chat/${newConv.id}`);
        } catch (e) {
          console.warn("Could not create conversation upfront, sending without id", e);
        }
      }

      const userMessageContent = cleanText || (currentImage ? (isRtl ? "حلل هذه الصورة 🖼️" : "Analyze this image 🖼️") : "");
      const newMessages: ChatMessageItem[] = [
        ...messages,
        {
          role: "user",
          content: userMessageContent,
          imageUrl: currentImage?.preview || null,
        },
      ];
      setMessages(newMessages);
      setInputValue("");
      setAttachedImage(null);

      sendMessageMutation.mutate(
        {
          data: {
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
              imageUrl: m.imageUrl,
            })),
            conversationId: effectiveConvId,
            useWebSearch: isSearch,
            generateImage: isImgGen,
            image: currentImage
              ? {
                  data: currentImage.data,
                  mimeType: currentImage.mimeType,
                }
              : undefined,
          } as any,
        },
        {
          onSuccess: (response: any) => {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: response.message,
                imageUrl: response.imageUrl || null,
                isWebSearch: response.isWebSearch ?? isSearch,
                isImageGeneration: response.isImageGeneration ?? isImgGen,
                searchSources: response.searchSources,
              },
            ]);
            setIsPendingWebSearch(false);
            speakResponse(response.message);
            queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() });
          },
          onError: (err: any) => {
            setIsPendingWebSearch(false);
            const errorText =
              err?.response?.data?.error ||
              err?.message ||
              (isRtl
                ? "تعذر الحصول على رد من المساعد الذكي، يرجى المحاولة مرة أخرى."
                : "Failed to receive response from assistant. Please try again.");
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `⚠️ ${errorText}`,
              },
            ]);
          },
        }
      );
    },
    [
      messages,
      conversationId,
      sendMessageMutation,
      createConversation,
      queryClient,
      speakResponse,
      navigate,
      isRtl,
      webSearchMode,
      imageGenMode,
      attachedImage,
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
    if (sendMessageMutation.isPending) return;

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

  // ── New conversation ──────────────────────────────────────────────────────
  const handleNewConversation = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setSidebarOpen(false);
        setMessages([]);
        navigate(`/chat/${conv.id}`);
      },
    });
  };

  // ── Delete conversation ───────────────────────────────────────────────────
  const handleDeleteConversation = (id: string) => {
    setDeletingConvId(id);
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setDeletingConvId(null);
          if (id === conversationId) navigate("/chat");
        },
        onError: () => setDeletingConvId(null),
      }
    );
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

  const conversations = convs.data ?? [];
  const memoryFacts = memoryQuery.data ?? [];

  const filteredConversations = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = (
    <aside
      className={cn(
        "relative z-20 flex flex-col h-full w-72 sm:w-80 bg-card/90 backdrop-blur-2xl border-l border-white/5 flex-shrink-0 transition-all",
        sidebarOpen ? "flex" : "hidden md:flex"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <span className="font-extrabold text-black text-xs">M7</span>
          </div>
          <div>
            <span className="font-bold text-white text-sm">M7 AI</span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              {isRtl ? "المحادثات والذاكرة" : "Chats & Memory"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <ThemeToggle showLabel={false} isRtl={isRtl} className="p-1.5" />

          {/* Profile button */}
          <button
            onClick={() => navigate("/profile")}
            title={user?.displayName || (isRtl ? "الملف الشخصي" : "Profile")}
            className="text-slate-400 hover:text-amber-400 light:text-slate-600 light:hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-white/5 light:hover:bg-slate-100"
          >
            <UserCircle className="w-5 h-5" />
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="text-xs font-bold text-slate-300 hover:text-amber-400 light:text-slate-700 light:hover:text-amber-600 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 light:hover:bg-slate-100"
            title="Switch Language"
          >
            {isRtl ? "EN" : "عربي"}
          </button>

          <button
            className="md:hidden text-slate-400 hover:text-white light:text-slate-600 light:hover:text-black p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New conversation button */}
      <div className="p-3">
        <Button
          className="w-full gap-2 rounded-xl h-11 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/10"
          onClick={handleNewConversation}
          disabled={createConversation.isPending}
        >
          {createConversation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{isRtl ? "محادثة جديدة" : "New Chat"}</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="px-3 mb-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute right-3 text-slate-500" />
          <input
            type="text"
            placeholder={isRtl ? "بحث في المحادثات..." : "Search chats..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
          />
        </div>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1 min-h-0">
        {convs.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-8">
            {isRtl ? "لا توجد محادثات سابقة" : "No previous conversations"}
          </p>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all border",
                conv.id === conversationId
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "hover:bg-white/5 border-transparent text-slate-200"
              )}
              onClick={() => {
                setSidebarOpen(false);
                if (conv.id !== conversationId) {
                  setMessages([]);
                  navigate(`/chat/${conv.id}`);
                }
              }}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-70" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{conv.title}</p>
                <p className="text-[10px] text-slate-500">
                  {formatDate(conv.updatedAt, isRtl)}
                </p>
              </div>
              <button
                className={cn(
                  "opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all flex-shrink-0",
                  deletingConvId === conv.id && "opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conv.id);
                }}
                title={isRtl ? "حذف المحادثة" : "Delete chat"}
              >
                {deletingConvId === conv.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))
        )}
      </nav>

      {/* ── Memory Panel ──────────────────────────────────────────────────── */}
      <div className="border-t border-white/5 flex-shrink-0 bg-black/20">
        <button
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          onClick={() => setMemoryExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Brain className="w-4 h-4 text-amber-400" />
            <span>{isRtl ? "الذاكرة الذكية" : "Smart Memory"}</span>
            {memoryFacts.length > 0 && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-full">
                {memoryFacts.length}
              </span>
            )}
          </div>
          {memoryExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {memoryExpanded && (
          <div className="px-3 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
            {memoryQuery.isLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              </div>
            ) : memoryFacts.length === 0 ? (
              <p className="text-center text-slate-500 text-[11px] py-2">
                {isRtl ? "لا توجد معلومات محفوظة بعد." : "No memory facts stored yet."}
                <br />
                <span className="text-[10px] text-slate-600">
                  {isRtl ? "جرّب: «اسمي محمود»" : "Try: 'My name is Alex'"}
                </span>
              </p>
            ) : (
              memoryFacts.map((fact) => (
                <div
                  key={fact.key}
                  className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-colors"
                >
                  <div className="min-w-0 pr-1">
                    <span className="text-[10px] text-amber-400 font-medium block">
                      {fact.label}
                    </span>
                    <span className="text-xs text-slate-200 truncate block">
                      {fact.value}
                    </span>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all flex-shrink-0"
                    onClick={() => handleDeleteMemory(fact.key)}
                  >
                    {deletingMemKey === fact.key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Back to home */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <Home className="w-4 h-4 text-amber-400" />
          <span>{isRtl ? "الصفحة الرئيسية" : "Home Page"}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-[100dvh] bg-[#0b0d10] text-[#f8fafc] light:bg-[#f8fafc] light:text-[#0f172a] overflow-hidden transition-colors duration-200" dir={isRtl ? "rtl" : "ltr"}>
      {Sidebar}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-10"
          onClick={() => setSidebarOpen(false)}
        />
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

        {/* Drag and drop visual overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center border-2 border-dashed border-amber-500 m-4 rounded-3xl animate-in fade-in duration-200 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 mb-3 border border-amber-500/40">
              <ImagePlus className="w-8 h-8 animate-bounce" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              {isRtl ? "أفلت الصورة هنا لتحليلها فوراً 🖼️✨" : "Drop your image here to analyze 🖼️✨"}
            </p>
            <p className="text-xs text-amber-400/80">
              {isRtl ? "يدعم PNG, JPG, WebP" : "Supports PNG, JPG, WebP"}
            </p>
          </div>
        )}

        {/* Top Header */}
        <header className="glass flex-none flex items-center justify-between px-4 h-16 border-b border-white/10 light:border-slate-200 z-10">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-xl hover:bg-white/10 light:hover:bg-slate-200 text-slate-300 light:text-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer" onClick={() => navigate("/")}>
              <span className="font-extrabold text-black text-xs">M7</span>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white light:text-slate-900 leading-tight">M7 AI</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] text-slate-400 light:text-slate-500">
                  {isRtl ? "متصل بالذكاء الاصطناعي ومتعدد الوسائط 🤖🎨" : "Multimodal AI Ready 🤖🎨"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle showLabel={false} isRtl={isRtl} />

            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl hover:bg-white/10 light:hover:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-amber-400 light:hover:text-amber-600 transition-colors"
              title={isRtl ? "الصفحة الرئيسية" : "Home"}
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="p-2 rounded-xl hover:bg-white/10 light:hover:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-amber-400 light:hover:text-amber-600 transition-colors"
              title={isRtl ? "الملف الشخصي" : "Profile"}
            >
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto flex flex-col space-y-6">
            {history.isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                <p className="text-xs text-slate-400">
                  {isRtl ? "جارٍ تحميل المحادثة..." : "Loading conversation..."}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-transparent flex items-center justify-center border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                  <span className="text-3xl font-black text-amber-400">M7</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {isRtl
                      ? "أهلاً بك! أنا M7 AI، كيف يمكنني مساعدتك اليوم؟ 🤖✨"
                      : "Welcome! I'm M7 AI, how can I assist you today? 🤖✨"}
                  </h2>
                  <p className="text-xs text-slate-400">
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
                      className="p-4 rounded-2xl bg-white/[0.03] light:bg-white hover:bg-white/[0.06] light:hover:bg-slate-50 border border-white/10 light:border-slate-200 hover:border-amber-500/40 transition-all text-right group shadow-lg"
                    >
                      <p className="text-xs sm:text-sm font-medium text-slate-300 light:text-slate-800 group-hover:text-amber-300 light:group-hover:text-amber-600 transition-colors">
                        {s}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300",
                      msg.role === "user" ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className="relative group max-w-[90%] sm:max-w-[80%]">
                      <div
                        className={cn(
                          "px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md",
                          msg.role === "user"
                            ? "bg-amber-500 text-black font-medium rounded-tr-sm"
                            : "bg-[#14181f] text-slate-100 light:bg-white light:text-slate-900 rounded-tl-sm border border-white/10 light:border-slate-200 pb-8"
                        )}
                      >
                        {/* Web search badge */}
                        {msg.role === "assistant" && msg.isWebSearch && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 light:text-amber-700 bg-amber-500/10 light:bg-amber-50 border border-amber-500/30 light:border-amber-300 px-2.5 py-1 rounded-xl mb-2.5 w-fit shadow-sm">
                            <Globe className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isRtl ? "نتائج حية موثقة من بحث الويب (Google Search) 🌐🔍" : "Live Google Search Grounded Results 🌐🔍"}</span>
                          </div>
                        )}

                        {/* Generated Image badge */}
                        {msg.role === "assistant" && (msg.isImageGeneration || msg.imageUrl) && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 light:text-amber-700 bg-amber-500/10 light:bg-amber-50 border border-amber-500/30 light:border-amber-300 px-2.5 py-1 rounded-xl mb-2.5 w-fit shadow-sm">
                            <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isRtl ? "صورة مولدة بالذكاء الاصطناعي (M7 Vision) 🎨✨" : "AI Generated Image (M7 Vision) 🎨✨"}</span>
                          </div>
                        )}

                        {/* Image Display */}
                        {msg.imageUrl && (
                          <div className="mb-3 overflow-hidden rounded-xl border border-white/15 light:border-slate-300 relative group/img max-w-sm">
                            <img
                              src={msg.imageUrl}
                              alt={msg.role === "user" ? "User upload" : "AI Generated"}
                              referrerPolicy="no-referrer"
                              className="w-full h-auto max-h-72 object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300 rounded-xl"
                              onClick={() => setImageModalUrl(msg.imageUrl!)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                              <button
                                type="button"
                                onClick={() => setImageModalUrl(msg.imageUrl!)}
                                className="p-2 rounded-xl bg-black/70 hover:bg-amber-500 hover:text-black text-white transition-all"
                                title={isRtl ? "عرض بحجم كامل" : "View Fullscreen"}
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <a
                                href={msg.imageUrl}
                                download={`m7-image-${Date.now()}.png`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-black/70 hover:bg-amber-500 hover:text-black text-white transition-all"
                                title={isRtl ? "تحميل الصورة" : "Download Image"}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        )}

                        <div>{msg.content}</div>

                        {msg.role === "assistant" && msg.searchSources && msg.searchSources.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-white/10 light:border-slate-200 text-right" dir={isRtl ? "rtl" : "ltr"}>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 light:text-amber-700 mb-2">
                              <Globe className="w-3.5 h-3.5" />
                              <span>{isRtl ? "المصادر والمراجع المباشرة من الويب:" : "Live Web Sources & Links:"}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {msg.searchSources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.04] light:bg-slate-50 hover:bg-amber-500/15 light:hover:bg-amber-50 border border-white/10 light:border-slate-200 hover:border-amber-500/40 text-slate-300 light:text-slate-800 hover:text-amber-300 light:hover:text-amber-700 transition-all text-xs group"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-amber-400 light:text-amber-600 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold truncate text-[11px]">
                                      {src.title || (src as any).domain || "مصدر الويب"}
                                    </div>
                                    {(src as any).domain && (
                                      <div className="text-[10px] text-slate-400 light:text-slate-500 truncate mt-0.5">
                                        {(src as any).domain}
                                      </div>
                                    )}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assistant actions: Copy, Speak, Retry */}
                      {msg.role === "assistant" && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1">
                          {msg.content.startsWith("⚠️") && (
                            <button
                              onClick={() => {
                                // Find the last user message and retry
                                const prevUserMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
                                if (prevUserMsg) {
                                  handleSend(prevUserMsg.content, undefined, msg.isWebSearch, msg.isImageGeneration);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black transition-all"
                              title={isRtl ? "إعادة المحاولة فوراً" : "Retry now"}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="text-[11px]">{isRtl ? "إعادة المحاولة" : "Retry"}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleCopy(msg.content, idx)}
                            className="p-1 rounded-lg text-slate-400 light:text-slate-500 hover:text-amber-400 light:hover:text-amber-600 hover:bg-white/10 light:hover:bg-slate-100 transition-all"
                            title={isRtl ? "نسخ النص" : "Copy text"}
                          >
                            {copiedIdx === idx ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => speakResponse(msg.content)}
                            className="p-1 rounded-lg text-slate-400 light:text-slate-500 hover:text-amber-400 light:hover:text-amber-600 hover:bg-white/10 light:hover:bg-slate-100 transition-all"
                            title={isRtl ? "قراءة صوتية" : "Listen audio"}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {sendMessageMutation.isPending && (
                  <div className="flex w-full justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {isPendingWebSearch ? (
                      <div className="bg-[#14181f] light:bg-white px-5 py-4 rounded-2xl rounded-tl-sm flex flex-col gap-2.5 border border-amber-500/40 light:border-amber-500/50 shadow-xl shadow-amber-500/10 max-w-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center flex-shrink-0 animate-pulse">
                            <Search className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-amber-400 light:text-amber-700 flex items-center gap-1.5">
                              <span>{isRtl ? "(جاري البحث في الويب 🔍...)" : "(Searching the live web 🔍...)"}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 light:text-slate-500 mt-0.5">
                              {isRtl ? "جاري جلب أحدث النتائج الحية من محرك بحث Google وتلخيصها..." : "Retrieving fresh Google Search data and synthesizing answer..."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/10 light:border-slate-100 text-[10px] text-slate-400 light:text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Globe className="w-3 h-3 text-amber-400" />
                            {isRtl ? "محرك M7 للبحث المباشر" : "M7 Live Search Engine"}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    ) : imageGenMode ? (
                      <div className="bg-[#14181f] light:bg-white px-5 py-4 rounded-2xl rounded-tl-sm flex flex-col gap-2.5 border border-amber-500/40 light:border-amber-500/50 shadow-xl shadow-amber-500/10 max-w-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center flex-shrink-0 animate-spin">
                            <Paintbrush className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-amber-400 light:text-amber-700 flex items-center gap-1.5">
                              <span>{isRtl ? "(جاري توليد الصورة بالذكاء الاصطناعي 🎨...)" : "(Generating AI Image 🎨...)"}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 light:text-slate-500 mt-0.5">
                              {isRtl ? "جاري رسم وتصميم وتوليد الصورة المطلوبة بدقة عالية..." : "Synthesizing and rendering high quality AI artwork..."}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#14181f] light:bg-white px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 border border-white/10 light:border-slate-200 shadow-sm">
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Bottom Input Section */}
        <footer className="glass flex-none p-3 sm:p-4 border-t border-white/10 light:border-slate-200">
          {/* Mode toggle bar */}
          <div className="max-w-3xl mx-auto mb-2.5 px-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Image Generation Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  setImageGenMode((prev) => !prev);
                  if (!imageGenMode) {
                    setWebSearchMode(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all duration-200 border cursor-pointer select-none",
                  imageGenMode
                    ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40 font-bold"
                    : "bg-white/5 light:bg-slate-100 text-slate-300 light:text-slate-700 border-white/10 light:border-slate-200 hover:border-amber-500/40 hover:text-amber-300 light:hover:text-amber-700"
                )}
                title={isRtl ? "تفعيل وضع توليد الصور بالذكاء الاصطناعي" : "Toggle AI Image Generation Mode"}
              >
                <Paintbrush className={cn("w-3.5 h-3.5", imageGenMode ? "text-black" : "text-amber-400")} />
                <span>
                  {isRtl
                    ? imageGenMode
                      ? "وضع توليد الصور 🎨 (مفعّل)"
                      : "توليد الصور 🎨"
                    : imageGenMode
                      ? "Image Gen Mode ON 🎨"
                      : "Image Gen 🎨"}
                </span>
                {imageGenMode && <span className="w-2 h-2 rounded-full bg-black animate-pulse" />}
              </button>

              {/* Dedicated Search Mode Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setWebSearchMode((prev) => !prev);
                  if (!webSearchMode) {
                    setImageGenMode(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all duration-200 border cursor-pointer select-none",
                  webSearchMode
                    ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/40 font-bold"
                    : "bg-white/5 light:bg-slate-100 text-slate-300 light:text-slate-700 border-white/10 light:border-slate-200 hover:border-amber-500/40 hover:text-amber-300 light:hover:text-amber-700"
                )}
                title={isRtl ? "تفعيل أو إلغاء وضع البحث الحي في الويب" : "Toggle Live Web Search Mode"}
              >
                <Globe className={cn("w-3.5 h-3.5", webSearchMode ? "animate-spin text-black" : "text-amber-400")} />
                <span>
                  {isRtl
                    ? webSearchMode
                      ? "بحث الويب (Google) 🌐 (مفعّل)"
                      : "بحث في الويب 🌐"
                    : webSearchMode
                      ? "Web Search ON 🌐"
                      : "Web Search 🌐"}
                </span>
                {webSearchMode && <span className="w-2 h-2 rounded-full bg-black animate-pulse" />}
              </button>
            </div>

            <span className="text-[10px] text-slate-400 light:text-slate-500 hidden sm:inline-block">
              {imageGenMode
                ? (isRtl ? "🎨 توليد صور فائقة الجودة بالذكاء الاصطناعي مباشرة في الشات" : "🎨 AI Image Generation directly inside chat")
                : webSearchMode
                  ? (isRtl ? "⚡ بحث مباشر عبر Google ومصادر حية" : "⚡ Real-time Google Search grounding")
                  : (isRtl ? "💬 دردشة ذكية + تحليل الصور 🖼️" : "💬 Smart Chat + Vision analysis 🖼️")}
            </span>
          </div>

          {/* Attached Image Preview Card */}
          {attachedImage && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={attachedImage.preview}
                  alt="Attached preview"
                  className="w-10 h-10 object-cover rounded-xl border border-amber-500/40 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-amber-400 text-xs flex items-center gap-1">
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{isRtl ? "صورة مرفقة للتحليل الذكي 🖼️" : "Attached for AI Vision Analysis 🖼️"}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-md">
                    {attachedImage.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                title={isRtl ? "إلغاء إرفاق الصورة" : "Remove attached image"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center">
            {/* Attach Image / File Picker Button (Right side before text on RTL or left on LTR) */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending}
              aria-label={isRtl ? "إرفاق صورة للتحليل" : "Attach image"}
              title={isRtl ? "إرفاق صورة للتحليل 🖼️ (أو اسحبها وأفلتها هنا)" : "Attach image 🖼️ (or drag & drop here)"}
              className={cn(
                "absolute right-2 h-9 w-9 rounded-xl transition-all duration-200 z-10",
                attachedImage
                  ? "bg-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black"
                  : "text-slate-400 hover:text-amber-400 hover:bg-white/10"
              )}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                attachedImage
                  ? (isRtl
                      ? "🖼️ اكتب سؤالك حول هذه الصورة (أو اضغط إرسال للتحليل التلقائي)..."
                      : "🖼️ Ask about this image (or press send for instant analysis)...")
                  : imageGenMode
                    ? (isRtl
                        ? "🎨 صف الصورة التي تريد توليدها (مثل: اصنع صورة لغروب شمس فوق الجبال)..."
                        : "🎨 Describe image to generate (e.g. futuristic cyberpunk city)...")
                    : webSearchMode
                      ? (isRtl
                          ? "🌐 اكتب ما تريد البحث عنه في الويب (مثل: الفائز بالكرة الذهبية 2024)..."
                          : "🌐 Type what you want to search on the live web (e.g. 2024 Ballon d'Or winner)...")
                      : (isRtl
                          ? "اكتب رسالتك، اطلب صورة (مثل: اصنع صورة...)، أو أرفق صورة للتحليل..."
                          : "Type message, ask for image, or attach image to analyze...")
              }
              className={cn(
                "pl-36 pr-13 h-13 bg-card/80 light:bg-white border-white/10 light:border-slate-300 hover:border-white/20 focus-visible:ring-amber-500/50 text-sm sm:text-base rounded-2xl shadow-xl text-white light:text-slate-900 placeholder:text-slate-500 transition-all",
                (webSearchMode || imageGenMode || attachedImage) && "border-amber-500/60 ring-2 ring-amber-500/30 bg-amber-500/[0.03]"
              )}
              disabled={sendMessageMutation.isPending}
            />

            {/* Direct Web Search Button */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                if (!inputValue.trim() || sendMessageMutation.isPending) return;
                handleSend(inputValue, undefined, true);
              }}
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              aria-label="بحث في الويب"
              title={isRtl ? "بحث فوري في الويب 🔍 (Google Search)" : "Instant Web Search 🔍"}
              className={cn(
                "absolute left-24 h-9 w-9 rounded-xl transition-all duration-200",
                inputValue.trim()
                  ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black shadow-sm"
                  : "text-slate-500 hover:text-amber-400 hover:bg-white/10",
                "disabled:opacity-40"
              )}
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Voice Dictation Button */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleVoiceToggle}
              disabled={sendMessageMutation.isPending}
              aria-label={isListening ? "إيقاف الاستماع" : "بدء المحادثة الصوتية"}
              title={isListening ? (isRtl ? "إيقاف الاستماع" : "Stop listening") : (isRtl ? "تحدث صوتياً" : "Speak")}
              className={cn(
                "absolute left-14 h-9 w-9 rounded-full transition-all duration-200",
                isListening
                  ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/30 animate-pulse hover:bg-red-500/30"
                  : "text-slate-400 hover:text-amber-400 hover:bg-white/10",
                "disabled:opacity-50"
              )}
            >
              <Mic className="w-4 h-4" />
            </Button>

            {/* Submit / Send Button */}
            <Button
              type="submit"
              size="icon"
              disabled={(!inputValue.trim() && !attachedImage) || sendMessageMutation.isPending}
              className={cn(
                "absolute left-2 h-9 w-9 rounded-xl text-black shadow-md transition-transform active:scale-95 disabled:opacity-50",
                imageGenMode
                  ? "bg-amber-400 hover:bg-amber-300 shadow-amber-400/30"
                  : webSearchMode
                    ? "bg-amber-400 hover:bg-amber-300 shadow-amber-400/30"
                    : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
              )}
              title={isRtl ? (imageGenMode ? "توليد الصورة 🎨" : webSearchMode ? "إرسال والبحث في الويب" : "إرسال الرسالة") : (imageGenMode ? "Generate Image 🎨" : webSearchMode ? "Send & Search Web" : "Send message")}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : imageGenMode ? (
                <Paintbrush className="w-4 h-4" />
              ) : webSearchMode ? (
                <Globe className="w-4 h-4 animate-pulse" />
              ) : (
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              )}
            </Button>
          </form>

          {(isListening || isSpeaking || speechError) && (
            <div
              className={cn(
                "mt-2 flex items-center justify-center gap-1.5 text-xs",
                speechError
                  ? "text-red-400"
                  : isListening
                    ? "text-red-400"
                    : "text-amber-400"
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
            <p className="text-[10px] text-slate-500">
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
                <X className="w-5 h-5" />
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
      </div>
    </div>
  );
}
