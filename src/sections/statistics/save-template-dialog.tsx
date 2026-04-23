"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SaveTemplatePopover({
  onSave,
  disabled,
  children,
}: {
  onSave: (name: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" disabled={disabled}>
            {children}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        side="top"
        className="w-72 gap-3"
      >
        <div className="text-sm font-medium">Сохранить шаблон</div>
        <Input
          placeholder="Название шаблона"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          autoFocus
        />
        <Button
          size="sm"
          className="self-start"
          disabled={!name.trim()}
          onClick={submit}
        >
          Сохранить
        </Button>
      </PopoverContent>
    </Popover>
  );
}
