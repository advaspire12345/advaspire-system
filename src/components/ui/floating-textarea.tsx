"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> {
  label: string;
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ className, label, id, value, rows = 4, ...props }, ref) => {
    const textareaId = id || React.useId();
    const hasValue = value !== undefined && value !== "";

    return (
      <div className="relative w-full">
        <textarea
          id={textareaId}
          ref={ref}
          value={value}
          rows={rows}
          placeholder={label}
          autoComplete="off"
          className={cn(
            "peer w-full min-h-[100px] rounded-[10px] border border-[#ADAFCA] bg-transparent px-4 py-4 text-base font-bold text-foreground placeholder-transparent transition-colors resize-none",
            "focus:border-[#23D2E2] focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <label
          htmlFor={textareaId}
          className={cn(
            "pointer-events-none absolute left-3 bg-white px-1 font-bold text-[#ADAFCA] transition-all",
            hasValue
              ? "-top-2.5 text-xs"
              : "top-4 text-base",
            "peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#23D2E2]"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

FloatingTextarea.displayName = "FloatingTextarea";

export { FloatingTextarea };
