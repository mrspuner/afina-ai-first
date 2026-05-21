// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAiReplyAutoDismiss } from "./use-ai-reply-auto-dismiss";

describe("useAiReplyAutoDismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches ai_reply_dismissed after 5000ms when aiReply is non-null", () => {
    const dispatch = vi.fn();
    renderHook(() => useAiReplyAutoDismiss("Готово", dispatch));

    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4999);
    expect(dispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "ai_reply_dismissed" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch when aiReply is null", () => {
    const dispatch = vi.fn();
    renderHook(() => useAiReplyAutoDismiss(null, dispatch));

    vi.advanceTimersByTime(10000);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("resets the timer when aiReply text changes mid-cycle", () => {
    const dispatch = vi.fn();
    const { rerender } = renderHook(
      ({ reply }: { reply: string | null }) =>
        useAiReplyAutoDismiss(reply, dispatch),
      { initialProps: { reply: "Думаю..." } }
    );

    // 3 seconds pass — timer would have 2 seconds left.
    vi.advanceTimersByTime(3000);
    expect(dispatch).not.toHaveBeenCalled();

    // New text arrives — timer must reset to a fresh 5 seconds.
    rerender({ reply: "Готово, обновил ноду" });

    // Old timer would have fired at +2000ms; new timer must not fire yet.
    vi.advanceTimersByTime(4999);
    expect(dispatch).not.toHaveBeenCalled();

    // 5000ms after the second text → dismiss.
    vi.advanceTimersByTime(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "ai_reply_dismissed" });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("clears the pending timer on unmount", () => {
    const dispatch = vi.fn();
    const { unmount } = renderHook(() =>
      useAiReplyAutoDismiss("Готово", dispatch)
    );

    vi.advanceTimersByTime(2000);
    unmount();
    vi.advanceTimersByTime(10000);

    expect(dispatch).not.toHaveBeenCalled();
  });
});
