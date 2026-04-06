"use client";

import Image from "next/image";
import {
  CirclePlus,
  Bell,
  Megaphone,
  BarChart2,
  Wallet,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  onLaunchOpen?: () => void;
  flyoutOpen?: boolean;
}

export function AppSidebar({
  activeNav,
  onNavChange,
  onLaunchOpen,
  flyoutOpen = false,
}: AppSidebarProps) {
  const navItems = [
    { icon: Bell, label: "Сигналы" },
    { icon: Megaphone, label: "Кампании" },
    { icon: BarChart2, label: "Статистика" },
  ];

  return (
    <aside className={cn("flex h-screen w-[120px] shrink-0 flex-col justify-between transition-colors", flyoutOpen ? "bg-card" : "bg-background")}>
      {/* Верхняя группа: лого + навигация */}
      <div className="flex flex-col gap-5">
        {/* Logo */}
        <div className="p-5">
          <Image src="/logo.svg" alt="Afina" width={80} height={20} priority />
        </div>

        <nav className="flex flex-col gap-6 px-2">
          {/* Запустить */}
          <button
            onClick={onLaunchOpen}
            className="flex h-[68px] flex-col items-center gap-1 rounded-md py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <CirclePlus className="h-6 w-6" />
            <span className="text-xs font-medium">Запустить</span>
          </button>

          {/* Основная навигация */}
          <div className="flex flex-col">
            {navItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => onNavChange?.(label)}
                className={cn(
                  "relative flex h-[68px] flex-col items-center gap-1 rounded-md py-3 transition-colors",
                  activeNav === label
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Подвал */}
      <div className="flex flex-col gap-3 pt-3">
        <div className="flex flex-col gap-0.5 px-5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Баланс
          </p>
          <p className="text-sm font-semibold text-foreground">
            ₽ 24 800
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md px-5 py-2 transition-colors hover:bg-accent">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                АК
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden px-2.5 text-left">
              <p className="truncate text-xs font-medium text-foreground">
                Арслан К.
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                arslan@afina.ai
              </p>
            </div>
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Wallet className="mr-2 h-4 w-4" />
              Финансы
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
