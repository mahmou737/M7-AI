import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Send, Loader2 } from "lucide-react";
import { useSendMessage } from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "كيف يمكنني تحسين إنتاجيتي؟",
  "اشرح لي مفهوم الذكاء الاصطناعي",
  "اكتب لي قصيدة عربية",
  "ما هي أفضل لغات البرمجة؟"
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = useSendMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessageMutation.isPending]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newMessages = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(newMessages);
    setInputValue("");

    sendMessageMutation.mutate(
      { data: { messages: newMessages } },
      {
        onSuccess: (response) => {
          setMessages((prev) => [
            ...prev,
            { role: response.role as "assistant", content: response.message }
          ]);
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sendMessageMutation.isPending) return;
    handleSend(inputValue);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <header className="glass flex-none flex items-center justify-between px-4 h-16 sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 text-muted-foreground hover:text-foreground rounded-full")}>
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <span className="font-bold text-primary-foreground text-sm">M7</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">M7 AI</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">متصل</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col space-y-6">
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <span className="text-3xl font-bold text-primary">M7</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">كيف يمكنني مساعدتك اليوم؟</h2>
                <p className="text-muted-foreground">اختر إحدى البدايات أو اكتب سؤالك الخاص</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputValue(suggestion);
                    }}
                    className="glass p-4 rounded-xl text-right hover:border-primary/40 hover:bg-white/5 transition-all group"
                  >
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{suggestion}</p>
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
                      "max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm",
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

      {/* Input Area */}
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
  );
}
