"use client";

import * as React from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface FloatingMultiSelectProps {
  id?: string;
  label: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  allowCreate?: boolean;
  onCreateOption?: (inputValue: string) => void;
}

const FloatingMultiSelect = React.forwardRef<HTMLDivElement, FloatingMultiSelectProps>(
  (
    {
      id,
      label,
      placeholder = "Select options",
      options,
      value,
      onChange,
      required = false,
      disabled = false,
      className,
      searchable = true,
      allowCreate = false,
      onCreateOption,
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedOptions = options.filter((opt) => value.includes(opt.value));

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
      if (!searchTerm.trim()) return options;
      return options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [options, searchTerm]);

    // Check if search term matches any existing option
    const canCreateNew = React.useMemo(() => {
      if (!allowCreate || !searchTerm.trim()) return false;
      return !options.some(
        (opt) => opt.label.toLowerCase() === searchTerm.toLowerCase()
      );
    }, [allowCreate, options, searchTerm]);

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

    const handleToggle = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    };

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(value.filter((v) => v !== optionValue));
    };

    const handleCreateNew = () => {
      if (canCreateNew && onCreateOption) {
        onCreateOption(searchTerm.trim());
        setSearchTerm("");
      }
    };

    const toggleDropdown = () => {
      if (!disabled) {
        setIsOpen((prev) => !prev);
        if (!isOpen && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 0);
        }
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
            "relative min-h-[58px] w-full cursor-pointer rounded-[10px] border border-[#ADAFCA] bg-white px-4 py-2.5 transition-all duration-200",
            "focus:border-[#23D2E2] focus:outline-none",
            disabled && "cursor-not-allowed opacity-60",
            isOpen && "border-[#23D2E2]"
          )}
          onClick={toggleDropdown}
        >
          {/* Selected Values as Badges */}
          <div className="flex flex-wrap gap-1.5 min-h-[34px] items-center pr-8">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#23D2E2]/10 text-[#23D2E2] text-sm font-medium"
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(opt.value, e)}
                    className="hover:bg-[#23D2E2]/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-base font-bold text-[#ADAFCA]">
                {placeholder}
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
            aria-multiselectable="true"
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-[10px] border border-[#ADAFCA] bg-white shadow-lg"
          >
            {/* Search Input */}
            {searchable && (
              <div className="sticky top-0 border-b border-gray-100 bg-white p-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#ADAFCA] px-3 py-2 text-sm focus:border-[#23D2E2] focus:outline-none focus:ring-1 focus:ring-[#23D2E2]/20"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto py-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors last:border-b-0 flex items-center gap-3",
                        "hover:bg-[#23D2E2]/10",
                        isSelected && "bg-[#23D2E2]/5"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(option.value);
                      }}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-[#23D2E2] border-[#23D2E2]"
                            : "border-[#ADAFCA]"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span
                        className={cn(
                          "text-sm text-gray-900",
                          isSelected && "font-semibold text-[#23D2E2]"
                        )}
                      >
                        {option.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  {searchTerm ? "No matching options" : "No options available"}
                </div>
              )}

              {/* Create new option */}
              {canCreateNew && (
                <div
                  className="cursor-pointer border-t border-gray-100 px-4 py-3 transition-colors hover:bg-[#23D2E2]/10 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateNew();
                  }}
                >
                  <span className="text-sm font-medium text-[#23D2E2]">
                    + Create &quot;{searchTerm}&quot;
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

FloatingMultiSelect.displayName = "FloatingMultiSelect";

export { FloatingMultiSelect };
