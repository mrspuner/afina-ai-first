import { afterEach, describe, expect, it } from "vitest";
import {
  addEmail,
  applyEmailEdit,
  generateEmailDraft,
  getEmail,
  getEmails,
  __resetEmailDirectory,
} from "./email-directory";

afterEach(() => __resetEmailDirectory());

describe("email-directory", () => {
  it("exposes preset emails", () => {
    const emails = getEmails();
    expect(emails.length).toBeGreaterThanOrEqual(3);
    expect(emails.every((e) => e.id && e.name && e.subject)).toBe(true);
  });

  it("adds a new email and surfaces it first", () => {
    const saved = addEmail({
      name: "Тест",
      subject: "Тема",
      body: "Текст",
      link: "https://x",
      cta: "Перейти",
      sender: "s",
    });
    expect(saved.id).toBeTruthy();
    expect(getEmails()[0].id).toBe(saved.id);
    expect(getEmail(saved.id)?.subject).toBe("Тема");
  });

  it("updates an existing session email by id", () => {
    const saved = addEmail({
      name: "Тест",
      subject: "Тема",
      body: "Текст",
      link: "https://x",
      cta: "Перейти",
      sender: "s",
    });
    addEmail({ ...saved, subject: "Новая тема" });
    expect(getEmail(saved.id)?.subject).toBe("Новая тема");
    // No duplicate created.
    expect(getEmails().filter((e) => e.id === saved.id)).toHaveLength(1);
  });
});

describe("generateEmailDraft", () => {
  it("returns a filled draft with CTA enabled", () => {
    const draft = generateEmailDraft("письмо клиенту");
    expect(draft.subject).toBeTruthy();
    expect(draft.body.split("\n\n").length).toBeGreaterThanOrEqual(2);
    expect(draft.showCta).toBe(true);
  });

  it("picks a discount theme from keywords", () => {
    const draft = generateEmailDraft("сделай письмо про скидку");
    expect(draft.cta).toMatch(/скидк/i);
  });

  it("uses a friendly greeting when asked", () => {
    const draft = generateEmailDraft("дружелюбное письмо");
    expect(draft.body.startsWith("Привет")).toBe(true);
  });
});

describe("applyEmailEdit", () => {
  const base = generateEmailDraft("обычное письмо");

  it("shortens the body on a 'короче' command", () => {
    const patch = applyEmailEdit("сделай короче", base);
    expect(patch?.body).toBeTruthy();
    expect(patch!.body!.split("\n\n").length).toBeLessThanOrEqual(2);
  });

  it("returns null for an unrecognised command", () => {
    expect(applyEmailEdit("абракадабра", base)).toBeNull();
  });
});
