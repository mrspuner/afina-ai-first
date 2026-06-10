import { nanoid } from "nanoid";

/**
 * Справочник писем email-нод (спека A5).
 *
 * Письмо — креатив `{ id, name, subject, body, link, cta, sender }`. Нода email
 * ссылается на письмо по `id` и хранит его контент в своих параметрах.
 *
 * Store живёт на время сессии: мок-список ранее созданных писем + созданные
 * пользователем в этой сессии. Прототипу персиста не требуется.
 */

export interface EmailRecord {
  id: string;
  name: string;
  subject: string;
  /** Тело письма; абзацы разделены пустой строкой ("\n\n"). */
  body: string;
  /** Ссылка кнопки-CTA. */
  link: string;
  /** Подпись кнопки-CTA. */
  cta: string;
  /** Отправитель (для шапки письма). */
  sender: string;
}

/** Черновик письма в редакторе — те же поля плюс флаги стандартных блоков. */
export interface EmailDraft extends EmailRecord {
  /** Показывать кнопку-CTA. */
  showCta: boolean;
  /** Показывать картинку-плейсхолдер в шапке. */
  showImage: boolean;
}

const PRESET_EMAILS: EmailRecord[] = [
  {
    id: "eml_welcome",
    name: "Приветственное — онбординг",
    subject: "Добро пожаловать! Начнём?",
    body:
      "Здравствуйте!\n\n" +
      "Спасибо, что выбрали нас. Мы подготовили всё, чтобы вы быстро получили результат.\n\n" +
      "Нажмите кнопку ниже — поможем сделать первый шаг.",
    link: "https://example.com/start",
    cta: "Начать",
    sender: "Афина <noreply@afina.ai>",
  },
  {
    id: "eml_offer",
    name: "Персональный оффер",
    subject: "Ваше предложение готово",
    body:
      "Здравствуйте!\n\n" +
      "Мы подобрали персональное предложение на основе ваших интересов. " +
      "Оно действует ограниченное время.\n\n" +
      "Посмотрите детали по кнопке ниже.",
    link: "https://example.com/offer",
    cta: "Посмотреть предложение",
    sender: "Афина <offers@afina.ai>",
  },
  {
    id: "eml_reactivation",
    name: "Реактивация спящих",
    subject: "Давно вас не видели",
    body:
      "Здравствуйте!\n\n" +
      "Вы давно не заходили — а у нас появилось много нового. " +
      "Возвращайтесь, мы приготовили для вас специальные условия.\n\n" +
      "Загляните по кнопке ниже.",
    link: "https://example.com/back",
    cta: "Вернуться",
    sender: "Афина <hello@afina.ai>",
  },
];

const sessionEmails: EmailRecord[] = [];

/** Все письма справочника: пресеты + созданные в сессии (свежие сверху). */
export function getEmails(): EmailRecord[] {
  return [...sessionEmails, ...PRESET_EMAILS];
}

export function getEmail(id: string): EmailRecord | undefined {
  return getEmails().find((e) => e.id === id);
}

/**
 * Добавляет письмо в справочник. Если `id` уже есть в сессии — обновляет;
 * иначе создаёт новую запись (генерируя id при отсутствии).
 * Возвращает сохранённую запись.
 */
export function addEmail(record: Omit<EmailRecord, "id"> & { id?: string }): EmailRecord {
  const existingIdx = record.id
    ? sessionEmails.findIndex((e) => e.id === record.id)
    : -1;
  const saved: EmailRecord = {
    ...record,
    id: record.id ?? `eml_${nanoid(6)}`,
  };
  if (existingIdx >= 0) {
    sessionEmails[existingIdx] = saved;
  } else {
    sessionEmails.unshift(saved);
  }
  return saved;
}

/** Только для тестов: очистить созданные в сессии письма. */
export function __resetEmailDirectory(): void {
  sessionEmails.length = 0;
}

/** Превращает запись справочника в редактируемый черновик (CTA включён). */
export function draftFromRecord(record: EmailRecord): EmailDraft {
  return {
    ...record,
    showCta: Boolean(record.cta || record.link),
    showImage: false,
  };
}

// ── Мок-генерация черновика по описанию (AI-fill, спека A5) ───────────────────

const TONE_FRIENDLY = /друж|тепл|мягк|нефор|прост/i;
const TONE_FORMAL = /офиц|строг|делов|формальн/i;
const TOPIC_DISCOUNT = /скидк|акци|выгод|дешев|снижен/i;
const TOPIC_REACTIVATION = /реактив|верн|спящ|давно/i;
const TOPIC_WELCOME = /привет|онбординг|добро пожал|регистрац/i;

/**
 * Собирает черновик письма по свободному описанию пользователя.
 * Мок: regex по ключевым словам выбирает тему/тон/контент (PRODUCT.md — AI на
 * regex). Всегда возвращает заполненный черновик с включённым CTA.
 */
export function generateEmailDraft(description: string): EmailDraft {
  const d = description.trim();
  const friendly = TONE_FRIENDLY.test(d);
  const formal = TONE_FORMAL.test(d);

  const greeting = friendly ? "Привет!" : formal ? "Здравствуйте." : "Здравствуйте!";

  let subject = "Письмо для вас";
  let middle =
    "Мы подготовили для вас сообщение. Подробности — по кнопке ниже.";
  let cta = "Перейти";
  let name = "Новое письмо";

  if (TOPIC_DISCOUNT.test(d)) {
    subject = friendly ? "Лови скидку 🎁" : "Специальная скидка для вас";
    middle =
      "Только сейчас — персональная скидка по вашему запросу. " +
      "Успейте воспользоваться, предложение ограничено по времени.";
    cta = "Забрать скидку";
    name = "Письмо со скидкой";
  } else if (TOPIC_REACTIVATION.test(d)) {
    subject = "Давно вас не видели";
    middle =
      "Вы давно не заходили — а у нас много нового и специальные условия " +
      "именно для вас. Возвращайтесь!";
    cta = "Вернуться";
    name = "Реактивация";
  } else if (TOPIC_WELCOME.test(d)) {
    subject = "Добро пожаловать!";
    middle =
      "Рады видеть вас с нами. Мы поможем быстро во всём разобраться — " +
      "начните с первого шага.";
    cta = "Начать";
    name = "Приветственное письмо";
  }

  const closing = friendly
    ? "Если что — пишите, всегда на связи."
    : "С уважением, команда Афина.";

  return {
    id: `eml_${nanoid(6)}`,
    name,
    subject,
    body: `${greeting}\n\n${middle}\n\n${closing}`,
    link: "https://example.com",
    cta,
    sender: "Афина <noreply@afina.ai>",
    showCta: true,
    showImage: false,
  };
}

/**
 * Применяет к черновику правку, описанную в чате (мок AI-редактирования).
 * Возвращает патч полей черновика, или null если команда не распознана.
 */
export function applyEmailEdit(
  command: string,
  draft: EmailDraft
): Partial<EmailDraft> | null {
  const c = command.toLowerCase();

  if (TONE_FRIENDLY.test(c)) {
    return {
      body: draft.body.replace(/^Здравствуйте[.!]?/, "Привет!"),
    };
  }
  if (TONE_FORMAL.test(c)) {
    return {
      body: draft.body.replace(/^Привет!?/, "Здравствуйте."),
    };
  }
  if (/корот|короч|сократ|кратк|меньше/.test(c)) {
    // Оставляем приветствие и первый смысловой абзац.
    const blocks = draft.body.split(/\n\n+/);
    const shortened = blocks.slice(0, 2).join("\n\n");
    return { body: shortened };
  }
  if (/призыв|cta|кнопк|действи/.test(c)) {
    return { showCta: true, cta: draft.cta || "Перейти" };
  }
  if (TOPIC_DISCOUNT.test(c)) {
    const blocks = draft.body.split(/\n\n+/);
    blocks.splice(Math.max(1, blocks.length - 1), 0,
      "А ещё — специальная скидка по вашему запросу. Успейте воспользоваться!");
    return { body: blocks.join("\n\n") };
  }
  return null;
}
