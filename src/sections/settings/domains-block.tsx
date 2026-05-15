"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsBlock } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";

function DomainChip({
  domain,
  onRemove,
}: {
  domain: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground">
      {domain}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Убрать ${domain} из блок-листа`}
        className="opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function DomainsBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();
  const blocklist = accountSettings.domainBlocklist;

  const [value, setValue] = useState("");

  function addDomain() {
    const next = value.trim().toLowerCase();
    if (!next) return;
    if (blocklist.includes(next)) {
      setValue("");
      return;
    }
    dispatch({
      type: "settings_updated",
      patch: { domainBlocklist: [...blocklist, next] },
    });
    setValue("");
  }

  function removeDomain(domain: string) {
    dispatch({
      type: "settings_updated",
      patch: {
        domainBlocklist: blocklist.filter((d) => d !== domain),
      },
    });
  }

  return (
    <SettingsBlock
      title="Глобальные исключения доменов"
      description="Домены, которые никогда не используются ни в одном триггере."
    >
      <div className="flex flex-col gap-3">
        {blocklist.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {blocklist.map((domain) => (
              <DomainChip
                key={domain}
                domain={domain}
                onRemove={() => removeDomain(domain)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Блок-лист пуст.
          </p>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="example.ru"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDomain();
              }
            }}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDomain}
            disabled={value.trim().length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </Button>
        </div>
      </div>
    </SettingsBlock>
  );
}
