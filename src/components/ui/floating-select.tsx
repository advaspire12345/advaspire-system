"use client";

import * as React from "react";
import { ChevronDown, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional: for richer display with name, ID, and balance */
  meta?: {
    name: string;
    id: string;
    balance?: number;
  };
}

interface FloatingSelectProps {
  id?: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

const FloatingSelect = React.forwardRef<HTMLDivElement, FloatingSelectProps>(
  (
    {
      id,
      label,
      placeholder = "Select an option",
      options,
      value,
      onChange,
      required = false,
      disabled = false,
      className,
      searchable = false,
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
      if (!searchTerm.trim()) return options;
      return options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [options, searchTerm]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchTerm("");
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
      } else if (event.key === "Enter" || event.key === " ") {
        if (!isOpen) {
          event.preventDefault();
          setIsOpen(true);
        }
      }
    };

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchTerm("");
    };

    const toggleDropdown = () => {
      if (!disabled) {
        setIsOpen((prev) => !prev);
        if (isOpen) setSearchTerm("");
      }
    };

    return (
      <div className={cn("relative w-full", className)} ref={dropdownRef}>
        {/* Select Trigger */}
        <div
          ref={ref}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${selectId}-listbox`}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "relative h-[58px] w-full cursor-pointer rounded-[10px] border border-[#ADAFCA] bg-white px-4 py-3.5 transition-all duration-200",
            "focus:border-[#23D2E2] focus:outline-none",
            disabled && "cursor-not-allowed opacity-60",
            isOpen && "border-[#23D2E2]"
          )}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
        >
          {/* Selected Value or Placeholder */}
          <div className="flex h-full items-center justify-between">
            {selectedOption?.meta ? (
              <div className="flex items-center gap-2 truncate">
                <span className="text-base font-bold text-foreground">
                  {selectedOption.meta.name}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({selectedOption.meta.id})
                </span>
                {selectedOption.meta.balance !== undefined && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-[#23d2e2]">
                    <Coins className="h-4 w-4" />
                    {selectedOption.meta.balance.toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              <span
                className={cn(
                  "truncate transition-all",
                  selectedOption
                    ? "text-base font-bold text-foreground"
                    : "text-base font-bold text-[#ADAFCA]"
                )}
              >
                {selectedOption?.label || placeholder}
              </span>
            )}
          </div>

          {/* Floating Label */}
          <label
            htmlFor={selectId}
            className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]"
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>

          {/* Dropdown Arrow */}
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#ADAFCA]">
            <ChevronDown
              size={18}
              className={cn(
                "transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            id={`${selectId}-listbox`}
            role="listbox"
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-[10px] border border-[#ADAFCA] bg-white shadow-lg"
          >
            {/* Search Input */}
            {searchable && (
              <div className="sticky top-0 border-b border-gray-100 bg-white p-3">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#ADAFCA] px-3 py-2 text-sm focus:border-[#23D2E2] focus:outline-none focus:ring-1 focus:ring-[#23D2E2]/20"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto py-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={value === option.value}
                    className={cn(
                      "cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors last:border-b-0",
                      "hover:bg-[#23D2E2]/10",
                      value === option.value && "bg-[#23D2E2]/5"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.meta ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm text-gray-900",
                            value === option.value && "font-semibold text-[#23D2E2]"
                          )}
                        >
                          {option.meta.name}
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          ({option.meta.id})
                        </span>
                        {option.meta.balance !== undefined && (
                          <span className="flex items-center gap-1 text-sm font-semibold text-[#23d2e2]">
                            <Coins className="h-4 w-4" />
                            {option.meta.balance.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "text-sm text-gray-900",
                          value === option.value && "font-semibold text-[#23D2E2]"
                        )}
                      >
                        {option.label}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  {searchTerm ? "No matching options" : "No options available"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

FloatingSelect.displayName = "FloatingSelect";

export { FloatingSelect };
