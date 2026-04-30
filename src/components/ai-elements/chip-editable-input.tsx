"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import { usePromptChips, type PromptChip } from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";

interface ChipEditableInputProps {
  placeholder?: string;
  className?: string;
}

export interface ChipEditableInputHandle {
  focus(): void;
}

/**
 * Contenteditable replacement for `<PromptInputTextarea>` that lets chips and
 * free-text live in the same inline flow — wrapping rules apply uniformly to
 * chips and words, just like recipient pills in Gmail.
 *
 * The component:
 * - Reads chips from `usePromptChips()` and renders them as
 *   `contentEditable={false}` spans inside the contenteditable shell.
 * - Pushes the visible text into `PromptInputController` on every input so
 *   the existing form-submit pipeline (`controller.textInput.value`) keeps
 *   working unchanged.
 * - Treats Enter (without Shift) as submit by triggering `form.requestSubmit()`.
 * - Treats Backspace adjacent to a chip as "remove that chip".
 * - Treats Backspace at the very start with no text + chips as "remove the
 *   last removable chip" (matches existing UX from textarea-mode).
 */
export const ChipEditableInput = forwardRef<
  ChipEditableInputHandle,
  ChipEditableInputProps
>(function ChipEditableInput({ placeholder, className }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { chips, removeChip } = usePromptChips();
  const chipsHostRef = useRef<HTMLSpanElement>(null);
  const controller = usePromptInputController();
  const value = controller.textInput.value;
  const setInput = controller.textInput.setInput;

  // Read the current visible text — i.e. all text-node siblings of the chips
  // host, in document order. The chips host span itself contributes nothing.
  const readText = useCallback((): string => {
    const ed = editorRef.current;
    if (!ed) return "";
    let out = "";
    ed.childNodes.forEach((node) => {
      if (node === chipsHostRef.current) return;
      if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
      else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        // Atomic chip elements live inside the chips host; defensive guard
        // for any stray block-level children (line breaks etc.).
        if (el.tagName === "BR") out += "\n";
        else out += el.textContent ?? "";
      }
    });
    return out;
  }, []);

  // Replace the visible text with `next`, preserving the chips host and the
  // user's caret-at-end. Used when external code calls `setInput(...)`.
  const writeText = useCallback((next: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    // Drop every child that isn't the chips host.
    const toRemove: ChildNode[] = [];
    ed.childNodes.forEach((node) => {
      if (node !== chipsHostRef.current) toRemove.push(node);
    });
    toRemove.forEach((node) => node.remove());
    if (next.length > 0) {
      ed.appendChild(document.createTextNode(next));
    }
  }, []);

  // External setInput → DOM. Avoid loops by skipping when DOM already matches.
  useEffect(() => {
    if (readText() !== value) {
      writeText(value);
    }
  }, [value, readText, writeText]);

  // After a chip is added, pull focus into the editor and put the caret at
  // the end — clicking "Настроить" on a trigger card or selecting a node
  // should let the user type immediately. On chip *removal* we don't grab
  // focus (the user's caret is already inside the editor in that flow).
  const prevChipCount = useRef(chips.length);
  useLayoutEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (chips.length > prevChipCount.current) {
      ed.focus();
      placeCaretAtEnd(ed);
    } else if (document.activeElement === ed) {
      placeCaretAtEnd(ed);
    }
    prevChipCount.current = chips.length;
  }, [chips.length]);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        const ed = editorRef.current;
        if (!ed) return;
        ed.focus();
        placeCaretAtEnd(ed);
      },
    }),
    []
  );

  const onInput = useCallback(() => {
    setInput(readText());
  }, [readText, setInput]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const form = (e.currentTarget as HTMLElement).closest("form");
        if (form) {
          const submitBtn = form.querySelector<HTMLButtonElement>(
            'button[type="submit"]'
          );
          if (submitBtn?.disabled) return;
          e.preventDefault();
          form.requestSubmit();
        }
        return;
      }
      if (e.key === "Backspace") {
        // The text portion is "empty" if it contains only whitespace, br, or
        // zero-width characters that browsers sometimes inject as caret
        // markers inside an otherwise empty contenteditable. In that case
        // Backspace removes the last removable chip — anything else is
        // handed back to the browser for standard char-deletion.
        const meaningful = readText().replace(/[\s​ ]/g, "");
        if (meaningful.length === 0 && chips.length > 0) {
          const lastRemovable = [...chips].reverse().find((c) => c.removable);
          if (lastRemovable) {
            e.preventDefault();
            removeChip(lastRemovable.id);
            // Scrub any caret markers the browser left around the chip so the
            // editor returns to a known-clean state and is ready to receive
            // the next chip. Without this Chrome can leave a <br> or empty
            // text node that confuses future insertions.
            const ed = editorRef.current;
            if (ed) {
              const toRemove: ChildNode[] = [];
              ed.childNodes.forEach((node) => {
                if (node === chipsHostRef.current) return;
                toRemove.push(node);
              });
              toRemove.forEach((n) => n.remove());
            }
            setInput("");
          }
        }
      }
    },
    [chips, readText, removeChip, setInput]
  );

  // Strip rich formatting from pasted content — only plain text in the editor.
  const onPaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    document.execCommand("insertText", false, text);
  }, []);

  const isEmpty = chips.length === 0 && value.length === 0;

  return (
    <div
      ref={editorRef}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={cn(
        "min-h-[52px] max-h-[120px] w-full overflow-y-auto bg-transparent text-sm text-[#fafafa] outline-none",
        // Inline flow: chips are inline-block, so they wrap with text words.
        "leading-7 whitespace-pre-wrap break-words",
        // Placeholder rendered via a CSS pseudo when empty.
        "[&[data-empty='true']]:before:content-[attr(data-placeholder)]",
        "[&[data-empty='true']]:before:text-muted-foreground",
        "[&[data-empty='true']]:before:pointer-events-none",
        className
      )}
      data-empty={isEmpty || undefined}
    >
      <span
        ref={chipsHostRef}
        contentEditable={false}
        className="contents"
        data-chips-host
      >
        {chips.map((chip) => (
          <ChipNode key={chip.id} chip={chip} />
        ))}
      </span>
    </div>
  );
});

function ChipNode({ chip }: { chip: PromptChip }) {
  return (
    <span
      contentEditable={false}
      data-chip-id={chip.id}
      data-chip-kind={chip.kind}
      // Inline-flex so the chip flows with surrounding text and follows the
      // same line-wrapping rules as words. We deliberately keep the chip
      // free of <img> children — Chrome treats inline images as separately
      // selectable objects in contenteditable, which led to a "delete the
      // label first, then the icon" Backspace artefact. Glyphs/icons that
      // describe the chip's role belong in the floating hint above the bar.
      className={cn(
        "mx-0.5 inline-flex select-none items-center rounded-md border px-2 py-0.5 align-baseline text-xs font-medium",
        "border-white/15 bg-white/10 text-white"
      )}
    >
      <span className="leading-none">{chip.label}</span>
    </span>
  );
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
