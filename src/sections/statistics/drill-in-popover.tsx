"use client";

import { useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DrillLevel = {
  /** Уникальный id уровня в дереве. */
  id: string;
  /** Заголовок уровня (показывается в шапке попапа). */
  title: string;
  /**
   * Рендер тела уровня. `drill` открывает дочерний уровень по его id.
   * Дочерние уровни перечислены в `children`.
   */
  render: (drill: (childId: string) => void) => React.ReactNode;
  /** Дочерние уровни, доступные из этого. */
  children?: DrillLevel[];
};

export type DrillInPopoverProps = {
  /** Контент тулбар-кнопки, открывающей попап. */
  trigger: React.ReactNode;
  /** Корневой уровень дерева. */
  root: DrillLevel;
  /** Есть ли несохранённые изменения (draft !== applied). */
  dirty: boolean;
  /** Применить draft → applied и перезагрузить таблицу. */
  onSave: () => void;
  /** align для PopoverContent. По умолчанию "end". */
  align?: "start" | "center" | "end";
  /** Доп. узлы футера 1-го уровня (например, «Сохранить как шаблон»). */
  rootFooterExtra?: React.ReactNode;
  /** Tailwind-класс ширины PopoverContent. По умолчанию "w-80". */
  contentWidthClassName?: string;
};

export function DrillInPopover({
  trigger,
  root,
  dirty,
  onSave,
  align,
  rootFooterExtra,
  contentWidthClassName,
}: DrillInPopoverProps) {
  const [open, setOpen] = useState(false);
  // Стек id уровней от корня до текущего. Первый элемент — всегда root.id.
  const [stack, setStack] = useState<string[]>([root.id]);
  // true когда показан подтверждающий поповер закрытия.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Находит уровень по пути id'шек начиная от root.
  function resolveLevel(path: string[]): DrillLevel {
    let level = root;
    for (let i = 1; i < path.length; i++) {
      const next = level.children?.find((c) => c.id === path[i]);
      if (!next) break;
      level = next;
    }
    return level;
  }

  const currentLevel = resolveLevel(stack);
  const atRoot = stack.length === 1;

  // Drill вниз: ребёнок текущего уровня.
  function drillInto(childId: string) {
    setStack((prev) => [...prev, childId]);
  }

  // Назад на один уровень. На корне ничего не делает.
  function goBack() {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  // Безусловное закрытие: сбрасывает стек к корню.
  function closeNow() {
    setConfirmOpen(false);
    setOpen(false);
    setStack([root.id]);
  }

  // Запрос на закрытие попапа (крестик / клик вне / Esc / явный close).
  // При несохранённых правках — перехватываем и показываем подтверждение.
  function requestClose() {
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    closeNow();
  }

  // Сохранение с любого уровня: применяем и закрываем попап.
  function handleSaveClick() {
    onSave();
    closeNow();
  }

  // Подключение к Popover.onOpenChange:
  function handleOpenChange(next: boolean) {
    if (next) {
      setOpen(true);
      setStack([root.id]); // каждый раз открываем с корня
      return;
    }
    // next === false → попытка закрытия, проходит через guard
    requestClose();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="default">
            {trigger}
          </Button>
        }
      />
      <PopoverContent
        align={align ?? "end"}
        side="bottom"
        className={cn(contentWidthClassName ?? "w-80", "gap-0 p-0")}
      >
        {/* Шапка уровня */}
        <div className="flex items-center gap-2 border-b border-border px-2 py-2">
          {!atRoot && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={goBack}
              aria-label="Назад"
            >
              <ChevronLeftIcon />
            </Button>
          )}
          <span className="text-sm font-medium">{currentLevel.title}</span>
        </div>

        {/* Тело уровня */}
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {currentLevel.render(drillInto)}
        </div>

        {/* Футер */}
        <div className="flex items-center gap-2 border-t border-border px-2 py-2">
          <Button size="sm" onClick={handleSaveClick}>
            Сохранить
          </Button>
          {atRoot && rootFooterExtra}
          {dirty && (
            <span className="ml-auto text-xs text-muted-foreground">
              Не сохранено
            </span>
          )}
        </div>

        {/* Подтверждающий поповер закрытия */}
        <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
          <PopoverTrigger
            render={<span className="absolute inset-x-0 bottom-0 h-0" />}
          />
          <PopoverContent align="center" side="top" className="w-64 gap-2">
            <div className="text-sm font-medium">Закрыть без сохранения?</div>
            <div className="text-xs text-muted-foreground">
              Несохранённые изменения настроек будут потеряны.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(false)}
              >
                Отмена
              </Button>
              <Button variant="destructive" size="sm" onClick={closeNow}>
                Закрыть
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </PopoverContent>
    </Popover>
  );
}
