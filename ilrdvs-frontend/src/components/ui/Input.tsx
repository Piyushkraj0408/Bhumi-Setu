import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-600 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full rounded-md border border-slate-300 bg-white text-sm text-navy-900 placeholder:text-slate-400",
              "px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors",
              icon && "pl-9",
              error && "border-danger-500",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger-500 mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
