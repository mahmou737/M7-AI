import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Crown, ChevronDown, Check, Sparkles, Bot, Code, PenTool, Briefcase } from "lucide-react";
import { AI_PERSONAS, PersonaId, PersonaConfig } from "@/types/personas";
import { cn } from "@/lib/utils";

interface PersonaSelectorProps {
  selectedPersona: PersonaId;
  onSelectPersona: (personaId: PersonaId) => void;
  onOpenPaywall: () => void;
  className?: string;
}

export function PersonaSelector({
  selectedPersona,
  onSelectPersona,
  onOpenPaywall,
  className,
}: PersonaSelectorProps) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const isPro = user?.plan === "pro";

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activePersona = AI_PERSONAS[selectedPersona] || AI_PERSONAS.general;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (persona: PersonaConfig) => {
    if (persona.isPro && !isPro) {
      setIsOpen(false);
      onOpenPaywall();
      return;
    }
    onSelectPersona(persona.id);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-start", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 sm:gap-2 text-xs font-bold transition-all select-none shadow-sm",
          activePersona.isPro
            ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300"
            : "bg-[var(--bg-card)] hover:bg-black/5 dark:hover:bg-white/10 border-[var(--border-color)] text-[var(--text-main)]"
        )}
        title={isRtl ? "اختيار شخصية الذكاء الاصطناعي" : "Select AI Persona"}
      >
        <span className="text-sm flex-shrink-0 leading-none">{activePersona.icon}</span>
        <span className="truncate max-w-[95px] sm:max-w-[130px]">
          {isRtl ? activePersona.nameAr : activePersona.nameEn}
        </span>
        {activePersona.isPro && (
          <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-black text-amber-500 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
            <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
            <span>PRO</span>
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-64 sm:w-72 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-[var(--text-main)]",
            isRtl ? "right-0" : "left-0"
          )}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="px-2.5 py-2 border-b border-[var(--border-color)] mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {isRtl ? "🎭 شخصيات الذكاء الاصطناعي" : "🎭 AI Personas & Roles"}
            </span>
            {!isPro && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPaywall();
                }}
                className="text-[10px] font-bold text-amber-500 hover:underline flex items-center gap-1"
              >
                <Crown className="w-3 h-3" />
                <span>{isRtl ? "فتح الكل في PRO" : "Unlock all"}</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            {(Object.values(AI_PERSONAS) as PersonaConfig[]).map((persona) => {
              const isSelected = selectedPersona === persona.id;
              const isLocked = persona.isPro && !isPro;

              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handleSelect(persona)}
                  className={cn(
                    "w-full flex items-start gap-2.5 p-2 rounded-xl text-start transition-all relative group",
                    isSelected
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]",
                    isLocked && "opacity-85"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 mt-0.5 border shadow-xs",
                      persona.isPro
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                        : "bg-black/5 dark:bg-white/10 border-transparent text-[var(--text-main)]"
                    )}
                  >
                    {persona.icon}
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold truncate">
                        {isRtl ? persona.nameAr : persona.nameEn}
                      </span>
                      {persona.isPro && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-500 text-[10px] font-black border border-amber-500/30">
                          <Crown className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span>PRO</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed mt-0.5">
                      {isRtl ? persona.descAr : persona.descEn}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 self-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {isLocked && !isSelected && (
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 self-center group-hover:scale-110 transition-transform">
                      <Crown className="w-3 h-3 text-amber-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
