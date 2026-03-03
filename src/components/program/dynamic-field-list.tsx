"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface DynamicFieldListProps {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxItems?: number;
}

export function DynamicFieldList({
  label,
  placeholder,
  items,
  onChange,
  maxItems = 20,
}: DynamicFieldListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayValues = items.length > 0 ? items : [""];

  const handleChange = (index: number, value: string) => {
    const newItems = [...displayValues];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleAdd = () => {
    if (displayValues.length < maxItems) {
      onChange([...displayValues, ""]);
    }
  };

  const handleRemove = (index: number) => {
    if (displayValues.length > 1) {
      onChange(displayValues.filter((_, i) => i !== index));
    } else {
      onChange([""]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-foreground">{label}</label>
        <span className="text-xs text-muted-foreground">
          {displayValues.filter((i) => i.trim()).length} / {maxItems}
        </span>
      </div>

      <div className="space-y-4">
        {displayValues.map((value, index) => (
          <div key={index} className="flex items-center gap-2 w-full">
            {/* Input with floating label */}
            <div className="relative flex-1">
              <input
                type="text"
                id={`${label}-${index}`}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                className="peer py-[14px] px-4 w-full rounded-[10px] border border-[#ADAFCA]
                           text-black text-base font-bold placeholder-transparent focus:outline-none
                           focus:border-[#23D2E2] transition-all duration-300"
                placeholder={`${placeholder} ${index + 1}`}
                autoComplete="off"
              />
              <label
                htmlFor={`${label}-${index}`}
                className={`absolute left-4 px-1 text-sm font-bold pointer-events-none bg-white transition-all duration-200
                  ${
                    value !== ""
                      ? "-top-3 text-[#ADAFCA] text-xs"
                      : "top-1/2 -translate-y-1/2 text-[#ADAFCA]"
                  }
                  peer-focus:-top-2 peer-focus:text-xs peer-focus:text-[#ADAFCA] peer-focus:translate-y-0
                `}
              >
                {placeholder} {index + 1}
              </label>
            </div>

            {/* Add/Remove button */}
            {index === 0 ? (
              <button
                type="button"
                onClick={handleAdd}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                disabled={displayValues.length >= maxItems}
                className={`
                  p-0.5 rounded-full border-2 border-[#23D2E2]
                  transition-all duration-200 flex items-center justify-center
                  ${hoveredIndex === index ? "bg-[#23D2E2]/10 shadow-md" : ""}
                  ${
                    displayValues.length >= maxItems
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-sm"
                  }
                `}
                title="Add field"
              >
                <Plus size={9} className="text-[#23D2E2]" strokeWidth={5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-0.5 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10
                           transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                title="Remove field"
              >
                <Minus size={9} className="text-[#fd434f]" strokeWidth={5} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
