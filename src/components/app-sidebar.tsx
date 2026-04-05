"use client";

import Image from "next/image";
import {
  Rocket,
  Bell,
  Megaphone,
  BarChart2,
  Wallet,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
}

export function AppSidebar({
  activeNav = "Кампании",
  onNavChange,
  onLaunchOpen,
}: AppSidebarProps) {
  const navItems = [
    { icon: Bell, label: "Сигналы", badge: 3 },
    { icon: Megaphone, label: "Кампании", badge: 2 },
    { icon: BarChart2, label: "Статистика" },
  ];

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col bg-background">
      {/* Logo */}
      <div className="px-4 py-5">
        <Image src="/logo.svg" alt="Afina" width={80} height={24} priority />
      </div>

      <nav className="flex flex-col px-2">
        {/* Запустить — первый, отбит отступом снизу */}
        <button
          onClick={onLaunchOpen}
          className="mb-6 flex flex-col items-center gap-1 rounded-md px-3 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Rocket className="h-6 w-6" />
          <span className="text-xs font-medium">Запустить</span>
        </button>

        {/* Основная навигация */}
        {navItems.map(({ icon: Icon, label, badge }) => (
          <button
            key={label}
            onClick={() => onNavChange?.(label)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-md px-3 py-3 transition-colors",
              activeNav === label
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="relative">
              <Icon className="h-6 w-6" />
              {badge !== undefined && (
                <Badge className="absolute -right-2.5 -top-2 h-4 min-w-4 px-1 text-[10px] leading-none">
                  {badge}
                </Badge>
              )}
            </span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Подвал */}
      <div className="px-2 py-3">
        <div className="mb-3 px-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Баланс
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            ₽ 24 800
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-accent">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                АК
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden text-left">
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
