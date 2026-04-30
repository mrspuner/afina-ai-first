"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import {
  usePromptChips,
  type ChipSegment,
  type PromptChip,
} from "@/state/prompt-chips-context";
import { cn } from "@/lib/utils";

interface ChipEditableInputProps {
  placeholder?: string;
  className?: string;
}

export interface ChipEditableInputHandle {
  focus(): void;
  /**
   * Walks the editor in DOM order and returns one segment per chip. Each
   * segment carries the chip metadata plus the free text *after* that chip
   * (until the next chip or end of editor). Leading text before the first
   * chip is dropped — there is no target it could belong to.
   */
  getSegments(): ChipSegment[];
  /** Removes all chips and text from the editor. Used after successful submit. */
  clear(): void;
}

/**
 * Contenteditable input where chips are inline elements inserted at the
 * caret position, sharing the textual flow with user typing. Chips wrap
 * with text words; each chip's "command text" is whatever the user types
 * between it and the next chip.
 *
 * Chips are managed imperatively via DOM (not React-rendered), because:
 * - `<img>`/React reconciliation inside contenteditable produces visual
 *   artefacts on Backspace.
 * - Position-at-cursor insertion is impossible if React owns the children
 *   list (it would always re-render chips into a fixed React-defined order).
 *
 * The chip *state* (id, kind, label, payload) still lives in React context
 * — DOM is just a derived view, kept in sync by the diff effect below.
 */
export const ChipEditableInput = forwardRef<
  ChipEditableInputHandle,
  ChipEditableInputProps
>(function ChipEditableInput({ placeholder, className }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { chips, removeChip } = usePromptChips();
  const controller = usePromptInputController();
  const value = controller.textInput.value;
  const setInput = controller.textInput.setInput;

  // Last in-editor caret range — saved continuously so we can insert chips
  // at the cursor even when the click that pushed the chip moved focus to a
  // button outside the editor (e.g. step-2's "Настроить").
  const lastRangeRef = useRef<Range | null>(null);

  const readText = useCallback((): string => {
    const ed = editorRef.current;
    if (!ed) return "";
    let out = "";
    ed.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
      else if (node instanceof HTMLElement) {
        if (node.dataset.chipId) return; // chip — not text
        if (node.tagName === "BR") out += "\n";
        else out += node.textContent ?? "";
      }
    });
    return out;
  }, []);

  const onInput = useCallback(() => {
    setInput(readText());
  }, [readText, setInput]);

  // Imperative text inserter registered with the prompt-input controller
  // (see registration effect below) so external callers — NodeCardBody param
  // rows in particular — can drop a template into the editor without
  // holding our ref. Inserts at the saved caret position when one exists,
  // otherwise appends to the end. Smart separator adds a single space when
  // needed so new content doesn't visually fuse with surrounding text/chips.
  const insertTextImperative = useCallback(
    (text: string, options?: { separator?: "smart" | "none" }) => {
      const ed = editorRef.current;
      if (!ed) return;
      const separator = options?.separator ?? "smart";

      const prependSpace = (range: Range): boolean => {
        if (separator === "none") return false;
        const node = range.startContainer;
        const offset = range.startOffset;
        if (node.nodeType === Node.TEXT_NODE) {
          const t = (node.textContent ?? "").slice(0, offset);
          if (t.length === 0) return false;
          return !t.endsWith(" ");
        }
        const prev = node.childNodes[offset - 1];
        if (!prev) return false;
        if (prev instanceof HTMLElement && prev.dataset.chipId) return true;
        if (prev.nodeType === Node.TEXT_NODE) {
          const t = prev.textContent ?? "";
          return t.length > 0 && !t.endsWith(" ");
        }
        return false;
      };

      const sel = window.getSelection();
      let range: Range | null = null;
      if (sel && sel.rangeCount > 0 && ed.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
      } else if (
        lastRangeRef.current &&
        ed.contains(lastRangeRef.current.startContainer)
      ) {
        range = lastRangeRef.current;
      }

      if (range) {
        range.deleteContents();
        const prefix = prependSpace(range) ? " " : "";
        const node = document.createTextNode(prefix + text);
        range.insertNode(node);
        const next = document.createRange();
        next.setStartAfter(node);
        next.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(next);
        lastRangeRef.current = next.cloneRange();
      } else {
        const last = ed.lastChild;
        let needsPad = false;
        if (last) {
          if (last instanceof HTMLElement && last.dataset.chipId) {
            needsPad = true;
          } else if (last.nodeType === Node.TEXT_NODE) {
            const t = last.textContent ?? "";
            needsPad = t.length > 0 && !t.endsWith(" ");
          }
        }
        const prefix = separator === "smart" && needsPad ? " " : "";
        ed.appendChild(document.createTextNode(prefix + text));
      }

      setInput(readText());
      ed.focus();
    },
    [readText, setInput]
  );

  // Register the imperative inserter with the prompt-input controller so
  // `controller.textInput.insertAtCursor()` calls actually reach this
  // contenteditable surface (the textarea path can't write to it).
  useEffect(() => {
    controller.textInput.__registerEditorInserter(insertTextImperative);
    return () => {
      controller.textInput.__registerEditorInserter(null);
    };
  }, [controller.textInput, insertTextImperative]);

  // Save the last in-editor range so chip insertion can target the user's
  // typing position even after focus moved to a button.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (ed.contains(range.startContainer)) {
        lastRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  // Sync chips state → DOM. Diffs by id; new chips inserted at saved caret;
  // missing chips removed. Re-rendered (label updates) chips have their
  // text content swapped in place to avoid clobbering surrounding text.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const stateById = new Map(chips.map((c) => [c.id, c] as const));

    // Remove DOM chips not in state.
    ed.querySelectorAll<HTMLElement>("[data-chip-id]").forEach((el) => {
      const id = el.dataset.chipId!;
      if (!stateById.has(id)) {
        el.remove();
      } else {
        // Update label if it changed.
        const target = stateById.get(id)!;
        if (el.textContent !== target.label) {
          el.textContent = target.label;
        }
      }
    });

    // Add state chips not in DOM, in array order. Each gets inserted at
    // the saved caret (or appended if no caret).
    for (const chip of chips) {
      const selector = `[data-chip-id="${cssEscape(chip.id)}"]`;
      if (ed.querySelector(selector)) continue;
      const el = createChipElement(chip);
      insertChipAtRange(el, ed, lastRangeRef.current);
      // Refresh the saved range so subsequent chip pushes append after the
      // chip we just inserted (not at the same anchor each time).
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ed.contains(sel.anchorNode)) {
        lastRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    }

    // Re-flush text into controller so external readers see the latest.
    setInput(readText());
  }, [chips, readText, setInput]);

  // External setInput("") (form-submit clear) should also clear DOM text and
  // chips. Other external value changes (rare now) sync into the editor end.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (value === "" && readText() !== "") {
      // Clear text nodes only; chip removal is driven through chips state.
      const toRemove: ChildNode[] = [];
      ed.childNodes.forEach((node) => {
        if (
          node.nodeType === Node.TEXT_NODE ||
          (node instanceof HTMLElement && !node.dataset.chipId)
        ) {
          toRemove.push(node);
        }
      });
      toRemove.forEach((n) => n.remove());
    }
  }, [value, readText]);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        const ed = editorRef.current;
        if (!ed) return;
        ed.focus();
        placeCaretAtEnd(ed);
      },
      getSegments() {
        const ed = editorRef.current;
        if (!ed) return [];
        const stateById = new Map(chips.map((c) => [c.id, c] as const));
        const segments: ChipSegment[] = [];
        let currentChip: PromptChip | null = null;
        let buffer = "";
        const flush = () => {
          if (currentChip) {
            segments.push({ chip: currentChip, text: buffer.trim() });
          }
          buffer = "";
        };
        ed.childNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            node.dataset.chipId &&
            stateById.has(node.dataset.chipId)
          ) {
            flush();
            currentChip = stateById.get(node.dataset.chipId)!;
          } else if (node.nodeType === Node.TEXT_NODE) {
            buffer += node.textContent ?? "";
          } else if (node instanceof HTMLElement && node.tagName === "BR") {
            buffer += "\n";
          }
        });
        flush();
        return segments;
      },
      clear() {
        const ed = editorRef.current;
        if (!ed) return;
        // Wipe everything — chips and text. Caller is expected to also
        // dispatch clearChips() so React state mirrors the DOM.
        while (ed.firstChild) ed.removeChild(ed.firstChild);
        lastRangeRef.current = null;
      },
    }),
    [chips]
  );

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
      }
      // Backspace: rely on browser default. Native behaviour treats a chip
      // (contentEditable=false span) as an atomic deletable block when the
      // caret is right after it — matching Gmail recipient pills. The chip
      // gets removed from DOM; our MutationObserver / next input event
      // catches the removal and updates chip state.
    },
    []
  );

  // Watch for chip elements vanishing from the DOM (Backspace, Cut, etc.)
  // and mirror that into chip state.
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const obs = new MutationObserver(() => {
      const presentIds = new Set(
        Array.from(ed.querySelectorAll<HTMLElement>("[data-chip-id]")).map(
          (el) => el.dataset.chipId!
        )
      );
      // Identify state chips that are no longer in DOM and remove them.
      const dropped: string[] = [];
      for (const c of chips) {
        if (!presentIds.has(c.id)) dropped.push(c.id);
      }
      if (dropped.length > 0) {
        // Defer to a microtask to avoid mutating state during a mutation
        // observer callback (some bundlers flag this).
        queueMicrotask(() => {
          for (const id of dropped) removeChip(id);
        });
      }
    });
    obs.observe(ed, { childList: true, subtree: false });
    return () => obs.disconnect();
  }, [chips, removeChip]);

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
        "leading-7 whitespace-pre-wrap break-words",
        "[&[data-empty='true']]:before:content-[attr(data-placeholder)]",
        "[&[data-empty='true']]:before:text-muted-foreground",
        "[&[data-empty='true']]:before:pointer-events-none",
        className
      )}
      data-empty={isEmpty || undefined}
    />
  );
});

function createChipElement(chip: PromptChip): HTMLElement {
  const el = document.createElement("span");
  el.contentEditable = "false";
  el.setAttribute("data-chip-id", chip.id);
  el.setAttribute("data-chip-kind", chip.kind);
  el.className =
    "mx-0.5 inline-flex select-none items-center rounded-md border px-2 py-0.5 align-baseline text-xs font-medium border-white/15 bg-white/10 text-white";
  el.textContent = chip.label;
  return el;
}

function insertChipAtRange(
  el: HTMLElement,
  editor: HTMLElement,
  saved: Range | null
) {
  // Prefer the live selection if it's still inside the editor; otherwise
  // fall back to the last range we recorded while focus was here. Append
  // to the end as a last resort.
  const sel = window.getSelection();
  let range: Range | null = null;
  if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    range = sel.getRangeAt(0);
  } else if (saved && editor.contains(saved.startContainer)) {
    range = saved;
  }

  if (range) {
    range.deleteContents();
    range.insertNode(el);
    // Add a trailing space so the user's next keystroke doesn't visually
    // glue onto the chip.
    const space = document.createTextNode(" ");
    el.after(space);
    const next = document.createRange();
    next.setStartAfter(space);
    next.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(next);
  } else {
    // No caret reference at all — append.
    const space = document.createTextNode(" ");
    editor.appendChild(el);
    editor.appendChild(space);
  }
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/(["\\])/g, "\\$1");
}
