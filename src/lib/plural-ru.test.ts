import { describe, it, expect } from "vitest";
import { pluralRu } from "./plural-ru";

const FORMS: [string, string, string] = ["домен", "домена", "доменов"];

describe("pluralRu", () => {
  it("picks form for 1, 2-4, 5+", () => {
    expect(pluralRu(1, FORMS)).toBe("домен");
    expect(pluralRu(2, FORMS)).toBe("домена");
    expect(pluralRu(3, FORMS)).toBe("домена");
    expect(pluralRu(4, FORMS)).toBe("домена");
    expect(pluralRu(5, FORMS)).toBe("доменов");
    expect(pluralRu(11, FORMS)).toBe("доменов");
    expect(pluralRu(21, FORMS)).toBe("домен");
    expect(pluralRu(22, FORMS)).toBe("домена");
    expect(pluralRu(0, FORMS)).toBe("доменов");
  });
});
