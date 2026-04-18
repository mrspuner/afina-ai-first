import { describe, it, expect } from "vitest";
import { stripEmptyTags } from "./prompt-input";

describe("stripEmptyTags — empty @-tag cleanup", () => {
  it("returns empty string unchanged", () => {
    expect(stripEmptyTags("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripEmptyTags("hello world")).toBe("hello world");
  });

  it("strips a lone trailing empty tag", () => {
    // "@A " → "" (tag with no following content except whitespace → removed).
    expect(stripEmptyTags("@A ")).toBe("");
  });

  it("strips a lone trailing empty tag with no trailing space", () => {
    expect(stripEmptyTags("@A")).toBe("");
  });

  it("keeps a tag with content after it", () => {
    expect(stripEmptyTags("@A hello")).toBe("@A hello");
  });

  it("strips two consecutive empty tags", () => {
    // "@A @B " → "" (both empty — each followed only by another tag or end).
    expect(stripEmptyTags("@A @B ")).toBe("");
  });

  it("keeps tag with content but strips trailing empty tag", () => {
    // "@A hello @B " → "@A hello " (A preserved because "hello" follows, B empty).
    expect(stripEmptyTags("@A hello @B ")).toBe("@A hello ");
  });

  it("preserves literal text before an empty tag", () => {
    expect(stripEmptyTags("привет @A ")).toBe("привет ");
  });

  it("collapses double spaces left after strip", () => {
    // When a strip leaves double spaces, they collapse.
    expect(stripEmptyTags("hello  world")).toBe("hello world");
  });

  it("handles russian labels", () => {
    expect(stripEmptyTags("@СМС ")).toBe("");
    expect(stripEmptyTags("@Задержка сделай длиннее")).toBe(
      "@Задержка сделай длиннее"
    );
  });

  it("strips the trailing tag even when mid tag has content", () => {
    expect(stripEmptyTags("@Сплиттер добавь ветку @СМС ")).toBe(
      "@Сплиттер добавь ветку "
    );
  });

  it("strips multiple empty tags in sequence", () => {
    // "@A @B @C " → "" (all empty).
    expect(stripEmptyTags("@A @B @C ")).toBe("");
  });
});
