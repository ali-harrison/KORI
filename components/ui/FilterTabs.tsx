import { cn } from "@/utils";

interface FilterTabsProps<T extends string> {
  options: readonly { value: T; label: string; count: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function FilterTabs<T extends string>({ options, value, onChange, label }: FilterTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 px-3 sm:px-4 text-[13px] border-b-2 -mb-px transition-colors duration-150 cursor-pointer",
              active ? "border-accent text-fg" : "border-transparent text-fg-3 hover:text-fg"
            )}
          >
            {option.label}
            <span className="font-mono text-[11px] ml-1.5 text-fg-3">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
