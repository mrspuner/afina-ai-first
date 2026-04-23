"use client";

import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NewCampaignMenuProps {
  onGoToSignals: () => void;
}

export function NewCampaignMenu({ onGoToSignals }: NewCampaignMenuProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Создать кампанию
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Создать новую кампанию</PopoverTitle>
          <PopoverDescription className="text-xs">
            Выберите сигнал, на базе которого запустить кампанию.
          </PopoverDescription>
        </PopoverHeader>
        <Button onClick={onGoToSignals} className="mt-1 self-start">
          Перейти в Сигналы
          <ArrowRight className="h-4 w-4" />
        </Button>
      </PopoverContent>
    </Popover>
  );
}
