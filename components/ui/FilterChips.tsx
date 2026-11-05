import { cn } from "@/utils";

interface FilterChipsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// Single-select pill row — used for the Members list status filter.
export function FilterChips<T extends string>({ options, value, onChange, className }: FilterChipsProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "px-3 py-[5px] rounded-full border text-[12.5px] cursor-pointer transition-colors duration-150",
              active
                ? "bg-[#1a201b] border-[#2c332d] text-[#e7eae8]"
                : "bg-transparent border-[#1f2420] text-[#8f978f] hover:text-[#e7eae8]"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
