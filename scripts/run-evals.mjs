#!/usr/bin/env node
/**
 * Экзамен оркестратора: гонит evals/cases.mjs против /api/ai/assist.
 * Требует dev-сервер с ключом (npm run dev -- -p 3001) или EVAL_BASE_URL.
 * Free tier лимитирует частоту → пауза между кейсами EVAL_DELAY_MS (4500).
 * Exit 0 — все mustPass прошли; 1 — есть провалы mustPass; 2 — нет ключа/сервера.
 * Фильтр: npm run eval -- <подстрока имени>.
 */
import { cases } from "../evals/cases.mjs";

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3001";
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 4500);
const only = process.argv[2];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function textFields(results) {
  return results
    .flatMap((r) => [r.text, r.confirmation, ...(r.questions ?? []), r.spec?.assumptions])
    .filter(Boolean)
    .join(" ");
}

function checkCase(c, results) {
  const failures = [];
  if (c.expect.kinds) {
    const got = results.map((r) => r.kind);
    const variants = Array.isArray(c.expect.kinds[0]) ? c.expect.kinds : [c.expect.kinds];
    if (!variants.some((v) => JSON.stringify(v) === JSON.stringify(got))) {
      failures.push(`kinds: ждали ${JSON.stringify(variants)}, получили ${JSON.stringify(got)}`);
    }
  }
  const text = textFields(results);
  for (const s of c.expect.mustContain ?? []) {
    if (!text.includes(s)) failures.push(`нет подстроки «${s}»`);
  }
  for (const s of c.expect.mustNotContain ?? []) {
    if (text.includes(s)) failures.push(`запрещённая подстрока «${s}»`);
  }
  if (c.expect.check) {
    const r = c.expect.check(results);
    if (r) failures.push(r);
  }
  return failures;
}

const probe = await fetch(`${BASE_URL}/api/ai/assist`).then((r) => r.json()).catch(() => null);
if (!probe?.available) {
  console.error(`Нет ключа/сервера на ${BASE_URL} — нужен GOOGLE_GENERATIVE_AI_API_KEY и dev-сервер.`);
  process.exit(2);
}

let passed = 0, failed = 0, mustPassFailed = 0;
const selected = only ? cases.filter((c) => c.name.includes(only)) : cases;
for (const [i, c] of selected.entries()) {
  const res = await fetch(`${BASE_URL}/api/ai/assist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ history: [], ...c.request }),
  }).catch(() => null);
  const body = res?.ok ? await res.json() : null;
  const failures = body?.results ? checkCase(c, body.results) : [`HTTP ${res?.status ?? "network error"}`];
  if (failures.length === 0) {
    passed++;
    console.log(`✓ ${c.name}`);
  } else {
    failed++;
    if (c.mustPass) mustPassFailed++;
    console.log(`✗ ${c.name}${c.mustPass ? " [MUST]" : ""}`);
    for (const f of failures) console.log(`    ${f}`);
  }
  if (i < selected.length - 1) await sleep(DELAY_MS);
}

console.log(`\n${passed}/${selected.length} прошло; провалов must-pass: ${mustPassFailed}`);
process.exit(mustPassFailed > 0 ? 1 : 0);
