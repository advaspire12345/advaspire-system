"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder"> {
  label: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, id, value, type = "text", ...props }, ref) => {
    const inputId = id || React.useId();
    const hasValue = value !== undefined && value !== "";

    return (
      <div className="relative w-full">
        <input
          type={type}
          id={inputId}
          ref={ref}
          value={value}
          placeholder={label}
          autoComplete="off"
          className={cn(
            "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 text-base font-bold text-foreground placeholder-transparent transition-colors",
            "focus:border-[#23D2E2] focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-3 bg-white px-1 font-bold text-[#ADAFCA] transition-all",
            hasValue
              ? "-top-2.5 text-xs"
              : "top-1/2 -translate-y-1/2 text-base",
            "peer-focus:-top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[#23D2E2]"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
