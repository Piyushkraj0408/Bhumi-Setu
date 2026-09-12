import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Languages, ChevronDown, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES, changeLanguage } from "../../i18n";

interface LanguageSelectorProps {
  variant?: "header" | "login";
}

export function LanguageSelector({ variant = "header" }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  if (variant === "login") {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Languages className="w-3.5 h-3.5 text-brand-600" />
          <span>{currentLang.nativeName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Select Language / भाषा
            </div>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                    isSelected
                      ? "bg-brand-50/70 text-brand-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-400">{lang.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 ml-2 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors"
        title="Change Language"
        aria-label="Change Language"
      >
        <Languages className="w-4 h-4 text-slate-500" />
        <span className="hidden sm:inline font-medium">{currentLang.nativeName}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-88 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Language / भाषा
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div>
                  <span className="font-medium text-slate-800">{lang.nativeName}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({lang.name})</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 ml-2 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
