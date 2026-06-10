import { describe, expect, it } from "vitest";
import {
  NODE_FIELD_EDITABILITY,
  getFieldMeta,
} from "./node-field-editability";

describe("NODE_FIELD_EDITABILITY", () => {
  it("covers every node kind that has params", () => {
    const kinds = Object.keys(NODE_FIELD_EDITABILITY).sort();
    expect(kinds).toEqual(
      [
        "condition", "email", "end", "ivr", "landing", "merge",
        "push", "signal", "split", "sms", "storefront", "success", "wait",
      ].sort()
    );
  });

  it("uses only the three editability categories", () => {
    for (const fields of Object.values(NODE_FIELD_EDITABILITY)) {
      for (const meta of Object.values(fields)) {
        expect(["manual", "ai", "readonly"]).toContain(meta.editability);
      }
    }
  });

  it("every manual field carries a paramKey for inline editing", () => {
    for (const fields of Object.values(NODE_FIELD_EDITABILITY)) {
      for (const meta of Object.values(fields)) {
        if (meta.editability === "manual") {
          expect(typeof meta.paramKey).toBe("string");
        }
      }
    }
  });

  it("classifies sms text as manual and sms link as ai", () => {
    expect(getFieldMeta("sms", "Текст")?.editability).toBe("manual");
    expect(getFieldMeta("sms", "Ссылка")?.editability).toBe("ai");
  });

  it("classifies signal fields as readonly", () => {
    expect(getFieldMeta("signal", "Файл")?.editability).toBe("readonly");
  });

  it("returns undefined for an unknown field", () => {
    expect(getFieldMeta("sms", "Неизвестно")).toBeUndefined();
  });

  it("gives former-manual fields a combo control with an optionsKey", () => {
    const combo = getFieldMeta("sms", "Текст");
    expect(combo?.control).toBe("combo");
    expect(combo?.optionsKey).toBe("smsText");
    expect(getFieldMeta("landing", "Оффер")?.control).toBe("combo");
  });

  it("gives the email body the email control, not combo", () => {
    const body = getFieldMeta("email", "Текст");
    expect(body?.control).toBe("email");
    expect(body?.optionsKey).toBeUndefined();
    // Subject stays a normal combo.
    expect(getFieldMeta("email", "Тема")?.control).toBe("combo");
  });

  it("leaves ai fields without a combo control", () => {
    expect(getFieldMeta("sms", "Ссылка")?.control).toBeUndefined();
  });

  it("every combo field carries an optionsKey", () => {
    for (const fields of Object.values(NODE_FIELD_EDITABILITY)) {
      for (const meta of Object.values(fields)) {
        if (meta.control === "combo") {
          expect(typeof meta.optionsKey).toBe("string");
        }
      }
    }
  });
});
