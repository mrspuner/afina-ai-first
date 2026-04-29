import { describe, it, expect } from "vitest";
import {
  isCompanyNameValid,
  isWebsiteValid,
  normalizeWebsite,
} from "./survey-validation";

describe("isCompanyNameValid", () => {
  it("accepts a 2+ char name", () => {
    expect(isCompanyNameValid("Acme")).toBe(true);
  });
  it("rejects empty / whitespace", () => {
    expect(isCompanyNameValid("")).toBe(false);
    expect(isCompanyNameValid("   ")).toBe(false);
  });
  it("rejects single char", () => {
    expect(isCompanyNameValid("A")).toBe(false);
  });
});

describe("isWebsiteValid", () => {
  it("accepts bare domain", () => {
    expect(isWebsiteValid("example.com")).toBe(true);
  });
  it("accepts www and full URL", () => {
    expect(isWebsiteValid("www.example.ru")).toBe(true);
    expect(isWebsiteValid("https://acme.io/path")).toBe(true);
  });
  it("rejects strings without a dot", () => {
    expect(isWebsiteValid("localhost")).toBe(false);
  });
  it("rejects strings with whitespace", () => {
    expect(isWebsiteValid("acme .com")).toBe(false);
  });
  it("rejects empty", () => {
    expect(isWebsiteValid("")).toBe(false);
    expect(isWebsiteValid("   ")).toBe(false);
  });
  it("rejects trailing dot or empty TLD", () => {
    expect(isWebsiteValid("acme.")).toBe(false);
    expect(isWebsiteValid(".com")).toBe(false);
  });
});

describe("normalizeWebsite", () => {
  it("adds https when scheme missing", () => {
    expect(normalizeWebsite("acme.com")).toBe("https://acme.com");
  });
  it("preserves existing http/https scheme", () => {
    expect(normalizeWebsite("http://acme.com")).toBe("http://acme.com");
    expect(normalizeWebsite("https://acme.com")).toBe("https://acme.com");
  });
  it("trims trailing slashes", () => {
    expect(normalizeWebsite("acme.com/")).toBe("https://acme.com");
    expect(normalizeWebsite("https://acme.com//")).toBe("https://acme.com");
  });
  it("returns empty for empty input", () => {
    expect(normalizeWebsite("")).toBe("");
    expect(normalizeWebsite("  ")).toBe("");
  });
});
