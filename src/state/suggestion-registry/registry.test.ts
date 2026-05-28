import { describe, it, expect } from "vitest";
import { resolveSuggestions } from "./registry";
import type { Scope, SuggestionItem } from "./types";
import type { WorkflowNodeType, NodeParams } from "@/types/workflow";
import type { SignalStatus } from "@/types/signal-status";
import type { CampaignStatus } from "@/state/app-state";

const NODE_FIXTURE: Array<{ nodeType: WorkflowNodeType; params: string[] }> = [
  { nodeType: "sms", params: ["Текст", "Alpha-name", "Время", "Ссылка"] },
  { nodeType: "email", params: ["Тема", "Текст", "Отправитель", "Ссылка"] },
  { nodeType: "push", params: ["Заголовок", "Текст", "Deeplink"] },
  { nodeType: "ivr", params: ["Сценарий", "Голос"] },
  { nodeType: "wait", params: ["Длительность", "До события"] },
  { nodeType: "condition", params: ["Триггер"] },
  { nodeType: "split", params: ["По", "Ветки"] },
  { nodeType: "signal", params: [] },
  { nodeType: "success", params: ["Цель"] },
  { nodeType: "end", params: ["Причина"] },
  { nodeType: "storefront", params: ["Офферы"] },
  { nodeType: "landing", params: ["CTA", "Оффер"] },
  { nodeType: "merge", params: [] },
];

const PARAMS_KINDS = [
  "sms", "email", "push", "ivr", "wait", "condition", "split",
  "merge", "signal", "success", "end", "storefront", "landing",
] as const satisfies ReadonlyArray<NodeParams["kind"]>;
type _ExhaustiveCheck = Exclude<NodeParams["kind"], (typeof PARAMS_KINDS)[number]>;
const _verifyExhaustive: _ExhaustiveCheck extends never ? true : false = true;
void _verifyExhaustive;

const EMPTY_SIGNAL_COUNTS: Record<SignalStatus, number> = {
  draft: 0, awaiting_payment: 0, processing: 0, ready: 0, expired: 0, error: 0,
};

function assertValid(items: SuggestionItem[], hint: string) {
  expect(items.length, `${hint}: empty`).toBeGreaterThan(0);
  const ids = new Set<string>();
  for (const item of items) {
    expect(item.id, `${hint}: id`).toBeTruthy();
    expect(item.label, `${hint}: label`).toBeTruthy();
    expect(ids.has(item.id), `${hint}: duplicate id ${item.id}`).toBe(false);
    ids.add(item.id);
    expect(["ask", "submit", "dispatch", "chat-submit", "command"]).toContain(item.action.kind);
  }
}

describe("registry — node-context", () => {
  for (const { nodeType, params } of NODE_FIXTURE) {
    it(`whole-node ${nodeType}`, () => {
      assertValid(
        resolveSuggestions({ kind: "node-context", nodeType }),
        `${nodeType}/__node__`
      );
    });
    for (const param of params) {
      it(`${nodeType} / ${param}`, () => {
        assertValid(
          resolveSuggestions({ kind: "node-context", nodeType, paramLabel: param }),
          `${nodeType}/${param}`
        );
      });
    }
  }

  it("unknown nodeType → GENERIC fallback", () => {
    assertValid(
      resolveSuggestions({ kind: "node-context", nodeType: "default" as WorkflowNodeType }),
      "default → generic"
    );
  });

  it("known nodeType + неизвестный paramLabel → whole-node fallback", () => {
    assertValid(
      resolveSuggestions({ kind: "node-context", nodeType: "sms", paramLabel: "??" }),
      "sms/unknown"
    );
  });
});

describe("registry — section.campaigns (filter-aware)", () => {
  it("hasCampaigns=false → онбординг (2 чипа)", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "campaigns", hasCampaigns: false, activeFilter: [], sort: "default" },
    });
    assertValid(items, "campaigns/empty");
    expect(items.find((i) => i.label.includes("первую кампанию"))).toBeDefined();
  });

  it("hasCampaigns=true, без фильтров → выдаёт сорт+фильтры, без reset", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "campaigns", hasCampaigns: true, activeFilter: [], sort: "default" },
    });
    assertValid(items, "campaigns/with");
    expect(items.find((i) => i.id === "sec-camp-reset")).toBeUndefined();
  });

  it("активный filter[active] → 'active' выпадает из набора, появляется reset", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "campaigns", hasCampaigns: true, activeFilter: ["active"], sort: "default" },
    });
    assertValid(items, "campaigns/active");
    expect(items.find((i) => i.id === "sec-camp-reset")).toBeDefined();
    expect(items.find((i) => i.id === "sec-camp-active")).toBeUndefined();
  });

  it("sort=profit-desc → 'profit' выпадает, остаётся conversion", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "campaigns", hasCampaigns: true, activeFilter: [], sort: "profit-desc" },
    });
    expect(items.find((i) => i.id === "sec-camp-profit")).toBeUndefined();
    expect(items.find((i) => i.id === "sec-camp-conversion")).toBeDefined();
    expect(items.find((i) => i.id === "sec-camp-reset")).toBeDefined();
  });
});

describe("registry — section.statistics (period+rowKind)", () => {
  it("period=today, rowKind=campaigns → сравни со вчера + по каналам", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "statistics", period: "today", rowKind: "campaigns" },
    });
    assertValid(items, "stats/today/campaigns");
    expect(items.some((i) => i.label.includes("вчера"))).toBe(true);
    expect(items.some((i) => i.label.includes("каналам"))).toBe(true);
  });

  it("period=this-month → сравни с прошлым месяцем", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "statistics", period: "this-month", rowKind: "campaigns" },
    });
    expect(items.some((i) => i.label.includes("прошлым месяцем"))).toBe(true);
  });

  it("rowKind=days → лучший день + тренд", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "statistics", period: "this-month", rowKind: "days" },
    });
    expect(items.some((i) => i.label.includes("Лучший день"))).toBe(true);
    expect(items.some((i) => i.label.includes("тренд"))).toBe(true);
  });

  it("rowKind=channels → не предлагает 'разбей по каналам' (уже там)", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "statistics", period: "this-month", rowKind: "channels" },
    });
    expect(items.some((i) => i.label.includes("по каналам"))).toBe(false);
    expect(items.some((i) => i.label.includes("по кампаниям"))).toBe(true);
  });
});

describe("registry — section.signals (status-aware)", () => {
  it("статусов нет → ровно 2 чипа: вопрос и создание", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "signals", statusCounts: EMPTY_SIGNAL_COUNTS },
    });
    expect(items).toHaveLength(2);
    expect(items.some((i) => i.id === "sec-sig-empty-what")).toBe(true);
    expect(items.some((i) => i.id === "sec-sig-empty-create")).toBe(true);
    const createChip = items.find((i) => i.id === "sec-sig-empty-create")!;
    expect(createChip.action.kind).toBe("dispatch");
  });

  it("только ready → один чип 'Готовые'", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "signals", statusCounts: { ...EMPTY_SIGNAL_COUNTS, ready: 3 } },
    });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("sec-sig-filter-ready");
  });

  it("есть несколько статусов → фильтры по каждому, max 3", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: {
        kind: "signals",
        statusCounts: {
          ...EMPTY_SIGNAL_COUNTS,
          ready: 2,
          processing: 1,
          awaiting_payment: 5,
          draft: 1,
        },
      },
    });
    expect(items).toHaveLength(3);
    // Порядок: ready, processing, awaiting_payment (по объявлению в реестре).
    expect(items[0].id).toBe("sec-sig-filter-ready");
    expect(items[1].id).toBe("sec-sig-filter-processing");
    expect(items[2].id).toBe("sec-sig-filter-awaiting");
  });

  it("статус есть, но счётчик 0 → чипа нет", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "signals", statusCounts: { ...EMPTY_SIGNAL_COUNTS, error: 1 } },
    });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("sec-sig-filter-error");
  });
});

describe("registry — section.settings", () => {
  it("базовый тариф + интеграций нет → upgrade + add-integrations", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "settings", hasIntegrations: false, isBasicTariff: true },
    });
    assertValid(items, "settings/basic");
    expect(items.some((i) => i.id === "sec-set-tariff-up")).toBe(true);
    expect(items.some((i) => i.id === "sec-set-integrations-add")).toBe(true);
  });

  it("интеграции есть → 'Управлять' вместо 'Подключить'", () => {
    const items = resolveSuggestions({
      kind: "section",
      sub: { kind: "settings", hasIntegrations: true, isBasicTariff: true },
    });
    expect(items.some((i) => i.id === "sec-set-integrations-manage")).toBe(true);
    expect(items.some((i) => i.id === "sec-set-integrations-add")).toBe(false);
  });
});

describe("registry — wizard sub-states", () => {
  it("step 1 → 2 ask-вопроса (разница + что выбрать)", () => {
    const items = resolveSuggestions({ kind: "wizard-step", sub: { step: 1 } });
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.action.kind === "ask")).toBe(true);
    expect(items.some((i) => i.id === "wiz-1-diff")).toBe(true);
    expect(items.some((i) => i.id === "wiz-1-which")).toBe(true);
  });

  it("step 2 пусто-пусто → 3 стартовых вопроса", () => {
    const items = resolveSuggestions({
      kind: "wizard-step",
      sub: { step: 2, hasInterests: false, hasDomains: false },
    });
    expect(items.every((i) => i.action.kind === "ask")).toBe(true);
    expect(items.some((i) => i.id === "wiz-2-where-start")).toBe(true);
  });

  it("step 2 интересы+домены → вопросы про сужение/расширение", () => {
    const items = resolveSuggestions({
      kind: "wizard-step",
      sub: { step: 2, hasInterests: true, hasDomains: true },
    });
    expect(items.some((i) => i.id === "wiz-2-narrow-q")).toBe(true);
    expect(items.some((i) => i.id === "wiz-2-widen-q")).toBe(true);
  });

  it("step 2 только интересы → 'Зачем триггеры?'", () => {
    const items = resolveSuggestions({
      kind: "wizard-step",
      sub: { step: 2, hasInterests: true, hasDomains: false },
    });
    expect(items.some((i) => i.id === "wiz-2-need-trigger")).toBe(true);
  });

  it("step 5 → 3 вопроса про бюджет (без dispatch)", () => {
    const items = resolveSuggestions({
      kind: "wizard-step", sub: { step: 5 },
    });
    expect(items.every((i) => i.action.kind === "ask")).toBe(true);
    expect(items.some((i) => i.id === "wiz-5-budget-why")).toBe(true);
  });

  it("step 6 nameSet=true → 'Поменять название?'", () => {
    const items = resolveSuggestions({
      kind: "wizard-step", sub: { step: 6, nameSet: true },
    });
    expect(items.some((i) => i.id === "wiz-6-rename-q")).toBe(true);
  });

  it("step 6 nameSet=false → 'Как назвать сигнал?'", () => {
    const items = resolveSuggestions({
      kind: "wizard-step", sub: { step: 6, nameSet: false },
    });
    expect(items.some((i) => i.id === "wiz-6-name-q")).toBe(true);
  });
});

describe("registry — views & commands", () => {
  it.each(["draft", "active", "paused", "completed"] satisfies CampaignStatus[])(
    "campaign-feed status=%s",
    (status) => {
      const items = resolveSuggestions({ kind: "campaign-feed", status });
      assertValid(items, `feed/${status}`);
    }
  );

  it("campaign-feed paused → 'Возобновить'", () => {
    const items = resolveSuggestions({ kind: "campaign-feed", status: "paused" });
    expect(items.some((i) => i.label === "Возобновить")).toBe(true);
    expect(items.every((i) => i.action.kind === "ask")).toBe(true);
  });

  it("campaign-feed completed → 'Запустить копию'", () => {
    const items = resolveSuggestions({ kind: "campaign-feed", status: "completed" });
    expect(items.some((i) => i.label === "Запустить копию")).toBe(true);
  });

  it("awaiting / select", () => {
    assertValid(resolveSuggestions({ kind: "awaiting-campaign" }), "awaiting");
    assertValid(resolveSuggestions({ kind: "campaign-select" }), "select");
  });

  it("draft-queue → один brand apply-all", () => {
    const items = resolveSuggestions({ kind: "draft-queue" });
    expect(items).toHaveLength(1);
    expect(items[0].variant).toBe("brand");
  });

  it("welcome-wave маппит чипы", () => {
    const items = resolveSuggestions({
      kind: "welcome-wave",
      chips: [{ id: "c1", label: "Что?", next: "x" }],
    });
    expect(items).toHaveLength(1);
    expect(items[0].action.kind).toBe("chat-submit");
  });
});

describe("registry — глобальная уникальность id", () => {
  it("все ключевые scope дают уникальные id", () => {
    const scopes: Scope[] = [
      ...NODE_FIXTURE.map((n) => ({ kind: "node-context" as const, nodeType: n.nodeType })),
      { kind: "draft-queue" },
      { kind: "section", sub: { kind: "campaigns", hasCampaigns: true, activeFilter: [], sort: "default" } },
      { kind: "section", sub: { kind: "campaigns", hasCampaigns: false, activeFilter: [], sort: "default" } },
      { kind: "section", sub: { kind: "statistics", period: "this-month", rowKind: "campaigns" } },
      { kind: "section", sub: { kind: "signals", statusCounts: EMPTY_SIGNAL_COUNTS } },
      { kind: "section", sub: { kind: "settings", hasIntegrations: true, isBasicTariff: false } },
      { kind: "wizard-step", sub: { step: 1 } },
      { kind: "wizard-step", sub: { step: 2, hasInterests: false, hasDomains: false } },
      { kind: "wizard-step", sub: { step: 5 } },
      { kind: "awaiting-campaign" },
      { kind: "campaign-select" },
      { kind: "campaign-feed", status: "active" },
      { kind: "campaign-feed", status: "paused" },
    ];
    for (const scope of scopes) {
      const items = resolveSuggestions(scope);
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size, `dup in ${scope.kind}`).toBe(ids.length);
    }
  });
});
