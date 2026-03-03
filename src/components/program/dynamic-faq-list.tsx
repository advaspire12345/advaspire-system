"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface DynamicFaqListProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  maxItems?: number;
}

export function DynamicFaqList({
  items,
  onChange,
  maxItems = 20,
}: DynamicFaqListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayValues = items.length > 0 ? items : [{ question: "", answer: "" }];

  const handleChange = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const newItems = [...displayValues];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleAdd = () => {
    if (displayValues.length < maxItems) {
      onChange([...displayValues, { question: "", answer: "" }]);
    }
  };

  const handleRemove = (index: number) => {
    if (displayValues.length > 1) {
      onChange(displayValues.filter((_, i) => i !== index));
    } else {
      onChange([{ question: "", answer: "" }]);
    }
  };

  const validFaqs = displayValues.filter(
    (i) => i.question.trim() && i.answer.trim()
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-foreground">
          Frequently Asked Questions
        </label>
        <span className="text-xs text-muted-foreground">
          {validFaqs.length} / {maxItems}
        </span>
      </div>

      <div className="space-y-4">
        {displayValues.map((item, index) => (
          <div key={index} className="flex gap-2 w-full">
            {/* Fields container */}
            <div className="flex-1 space-y-4">
              {/* Question input with floating label */}
              <div className="relative">
                <input
                  type="text"
                  id={`faq-question-${index}`}
                  value={item.question}
                  onChange={(e) => handleChange(index, "question", e.target.value)}
                  className="peer py-[14px] px-4 w-full rounded-[10px] border border-[#ADAFCA]
                             text-black text-base font-bold placeholder-transparent focus:outline-none
                             focus:border-[#23D2E2] transition-all duration-300"
                  placeholder={`Question ${index + 1}`}
                  autoComplete="off"
                />
                <label
                  htmlFor={`faq-question-${index}`}
                  className={`absolute left-4 px-1 text-sm font-bold pointer-events-none bg-white transition-all duration-200
                    ${
                      item.question !== ""
                        ? "-top-3 text-[#ADAFCA] text-xs"
                        : "top-1/2 -translate-y-1/2 text-[#ADAFCA]"
                    }
                    peer-focus:-top-2 peer-focus:text-xs peer-focus:text-[#ADAFCA] peer-focus:translate-y-0
                  `}
                >
                  Question {index + 1}
                </label>
              </div>

              {/* Answer textarea with floating label */}
              <div className="relative">
                <textarea
                  id={`faq-answer-${index}`}
                  value={item.answer}
                  onChange={(e) => handleChange(index, "answer", e.target.value)}
                  rows={3}
                  className="peer py-[14px] px-4 w-full rounded-[10px] border border-[#ADAFCA]
                             text-black text-base font-bold placeholder-transparent focus:outline-none
                             focus:border-[#23D2E2] transition-all duration-300 resize-none"
                  placeholder={`Answer ${index + 1}`}
                  autoComplete="off"
                />
                <label
                  htmlFor={`faq-answer-${index}`}
                  className={`absolute left-4 px-1 text-sm font-bold pointer-events-none bg-white transition-all duration-200
                    ${
                      item.answer !== ""
                        ? "-top-3 text-[#ADAFCA] text-xs"
                        : "top-4 text-[#ADAFCA]"
                    }
                    peer-focus:-top-2 peer-focus:text-xs peer-focus:text-[#ADAFCA]
                  `}
                >
                  Answer {index + 1}
                </label>
              </div>
            </div>

            {/* Button - vertically centered between two fields */}
            <div className="flex items-center">
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
                  title="Add FAQ"
                >
                  <Plus size={9} className="text-[#23D2E2]" strokeWidth={5} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-0.5 rounded-full border-2 border-[#fd434f] hover:border-red-500 hover:bg-red-500/10
                             transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
                  title="Remove FAQ"
                >
                  <Minus size={9} className="text-[#fd434f]" strokeWidth={5} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
