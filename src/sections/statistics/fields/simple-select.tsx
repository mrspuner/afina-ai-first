"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SimpleSelectOption<T extends string> = {
  value: T;
  label: string;
};

export function SimpleSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SimpleSelectOption<T>[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as T)}
    >
      <SelectTrigger className={`w-full ${className ?? ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
