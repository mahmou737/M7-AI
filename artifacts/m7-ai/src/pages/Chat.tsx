import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Send, Loader2, Plus, MessageSquare,
  Trash2, Menu, X, Brain, ChevronDown, ChevronUp, UserCircle,
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
import type { ChatMessage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const SUGGESTIONS = [
  "كيف يمكنني تحسين إنتاجيتي؟",
  "اشرح لي مفهوم الذكاء الاصطناعي",
  "اكتب لي قصيدة عربية",
  "ما هي أفضل لغات البرمجة؟",
];

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export default function Chat() {
  const { id: conversationId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memoryExpanded, setMemoryExpanded] = useState(true);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deletingMemKey, setDeletingMemKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
const convs = useListConversations();
const id = conversationId!;
const opt = { enabled: Boolean(id) };
const history = useGetConversationMessages(id, );








    


 


  
  const memoryQuery = useListMemory();

  const sendMessageMutation = useSendMessage();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const deleteMemoryMutation = useDeleteMemory();

  // ── Load history ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (history.data) {
      setMessages(
        history.data.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  }, [history.data]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || sendMessageMutation.isPending) return;
      const newMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: text.trim() },
      ];
      setMessages(newMessages);
      setInputValue("");

      sendMessageMutation.mutate(
        { data: { messages: newMessages, conversationId } },
        {
          onSuccess: (response) => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: response.message },
            ]);
            // Refresh sidebar titles + memory (AI may have saved new facts)
            queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() });
          },
        }
      );
    },
    [messages, conversationId, sendMessageMutation, queryClient]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
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
          if (id === conversationId) navigate("/");
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

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = (
    <aside
      className={cn(
        "relative z-20 flex flex-col h-full w-72 bg-card/80 backdrop-blur-xl border-l border-white/5 flex-shrink-0",
        sidebarOpen ? "flex" : "hidden md:flex"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary text-lg">M7</span>
          <span className="text-xs text-muted-foreground">المحادثات</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Profile button */}
          <button
            onClick={() => navigate("/profile")}
            title={user?.displayName ?? user?.email ?? "الملف الشخصي"}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10"
          >
            <UserCircle className="w-5 h-5" />
          </button>
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* New conversation */}
      <div className="p-3">
        <Button
          className="w-full gap-2 rounded-xl"
          variant="outline"
          onClick={handleNewConversation}
          disabled={createConversation.isPending}
        >
          {createConversation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          محادثة جديدة
        </Button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {convs.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            لا توجد محادثات سابقة
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all",
                conv.id === conversationId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-white/5 text-foreground"
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
                <p className="text-sm font-medium truncate">{conv.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(conv.updatedAt)}
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
      <div className="border-t border-white/5 flex-shrink-0">
        {/* Toggle header */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          onClick={() => setMemoryExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Brain className="w-4 h-4 text-primary" />
            <span>الذاكرة</span>
            {memoryFacts.length > 0 && (
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {memoryFacts.length}
              </span>
            )}
          </div>
          {memoryExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Facts list */}
        {memoryExpanded && (
          <div className="px-3 pb-3 space-y-1 max-h-44 overflow-y-auto">
            {memoryQuery.isLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : memoryFacts.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-3">
                لا توجد معلومات محفوظة بعد.
                <br />
                <span className="opacity-60">جرّب: «اسمي محمود»</span>
              </p>
            ) : (
              memoryFacts.map((fact) => (
                <div
                  key={fact.key}
                  className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-muted-foreground block">
                      {fact.label}
                    </span>
                    <span className="text-xs font-medium truncate block">
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
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          الصفحة الرئيسية
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden" dir="rtl">
      {Sidebar}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="glass flex-none flex items-center gap-3 px-4 h-16 border-b border-white/5 z-10">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <span className="font-bold text-primary-foreground text-xs">M7</span>
            </div>
            <div>
              <h1 className="font-bold leading-tight">M7 AI</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">متصل</span>
              </div>
            </div>
          </div>
          {/* Show memory count in header on mobile */}
          {memoryFacts.length > 0 && (
            <div className="mr-auto flex items-center gap-1 text-xs text-muted-foreground md:hidden">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span>{memoryFacts.length} معلومة</span>
            </div>
          )}
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto flex flex-col space-y-6">
            {history.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                  <span className="text-3xl font-bold text-primary">M7</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">كيف يمكنني مساعدتك اليوم؟</h2>
                  <p className="text-muted-foreground">اختر إحدى البدايات أو اكتب سؤالك الخاص</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue(s)}
                      className="glass p-4 rounded-xl text-right hover:border-primary/40 hover:bg-white/5 transition-all group"
                    >
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{s}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex w-full animate-in slide-in-from-bottom-2 fade-in duration-300",
                      msg.role === "user" ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "glass rounded-tl-sm border-white/5"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex w-full justify-end animate-in fade-in duration-300">
                    <div className="glass px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 border-white/5">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Input */}
        <footer className="glass flex-none p-4 pb-6 md:pb-4 border-t border-white/5">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="pl-14 pr-6 h-14 bg-card/50 border-white/10 hover:border-white/20 focus-visible:ring-primary/50 text-base shadow-lg"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              className="absolute left-2 h-10 w-10 rounded-full transition-transform active:scale-95 disabled:opacity-50"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              )}
            </Button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] text-muted-foreground/60">
              قد يخطئ M7 AI أحياناً. يُرجى التحقق من المعلومات المهمة.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
