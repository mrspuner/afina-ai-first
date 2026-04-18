"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NewSignalMenuProps {
  onCreate: () => void;
  onUpload: () => void;
  variant?: "outline" | "primary";
}

export function NewSignalMenu({ onCreate, onUpload, variant = "outline" }: NewSignalMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant={variant === "primary" ? "default" : "outline"}>
            <Plus className="h-4 w-4" />
            Новый сигнал
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onCreate}>Создать новый</DropdownMenuItem>
        <DropdownMenuItem onClick={onUpload}>Загрузить с устройства</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
