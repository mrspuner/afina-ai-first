"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { SettingsBlock } from "./settings-field";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import {
  moveActiveToSuggestion,
  moveSuggestionToActive,
} from "@/data/account-interests";
import { cn } from "@/lib/utils";

function RemovableInterestChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm",
        "border-brand/50 bg-brand-muted text-foreground"
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Удалить интерес ${label}`}
        className="opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function InterestsBlock() {
  const { accountSettings } = useAppState();
  const dispatch = useAppDispatch();
  const { interests, suggestedInterests } = accountSettings;

  function removeInterest(id: string) {
    const next = moveActiveToSuggestion(accountSettings, id);
    dispatch({
      type: "settings_updated",
      patch: {
        interests: next.interests,
        suggestedInterests: next.suggestedInterests,
      },
    });
  }

  function acceptSuggestion(id: string) {
    const next = moveSuggestionToActive(accountSettings, id);
    dispatch({
      type: "settings_updated",
      patch: {
        interests: next.interests,
        suggestedInterests: next.suggestedInterests,
      },
    });
  }

  return (
    <SettingsBlock title="Интересы">
      {/* Active set */}
      <div className="flex flex-col gap-2">
        {interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <RemovableInterestChip
                key={interest.id}
                label={interest.label}
                onRemove={() => removeInterest(interest.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Набор интересов пуст.
          </p>
        )}
      </div>

      {/* AI suggestions */}
      {suggestedInterests.length > 0 ? (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5">
            <Image
              src="/mascot-icon.svg"
              alt=""
              width={14}
              height={14}
              aria-hidden
            />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Может быть, вам подойдёт
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {suggestedInterests.map((interest) => (
              <li key={interest.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-foreground transition-colors hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => acceptSuggestion(interest.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                  />
                  {interest.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SettingsBlock>
  );
}
