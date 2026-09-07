import { logger } from "../utils/logger";
import { config } from "../config";
import type { WhatsAppButton, WhatsAppListRow } from "../types/whatsapp";
import {
  ensureWhatsAppUser,
  getWhatsAppUser,
  updateWhatsAppUserPreferences,
} from "../db/repos/whatsappUserRepo";
import {
  setWhatsAppPendingAction as setPendingActionDb,
  deleteWhatsAppPendingAction as deletePendingActionDb,
  deleteExpiredWhatsAppPendingActions,
  listWhatsAppPendingActions,
  type WhatsAppPendingActionRow,
} from "../db/repos/whatsappPendingActionRepo";
import {
  SUPPORTED_LANGUAGES,
  SOURCE_LANGUAGES,
  INTERFACE_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
  t,
  type SupportedLanguage,
} from "./telegramService";
import { whatsappProvider } from "./whatsapp";
export type { DownloadedMedia } from "./whatsapp";

// The interface dictionary, language constants and `t()` are shared with the
// Telegram bot on purpose: the two bots are the same product and must not drift
// apart in wording. Only the rendering differs — see htmlToWhatsApp below.
export {
  SUPPORTED_LANGUAGES,
  SOURCE_LANGUAGES,
  INTERFACE_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
  t,
  type SupportedLanguage,
};

// WhatsApp caps a text body at 4096 characters. Stay under it and hand anything
// longer to the user as a .txt document, as the Telegram bot does.
export const WA_MAX_MESSAGE_LENGTH = 4000;
export const WA_TEXT_FILE_THRESHOLD = 3500;

// Interactive message limits imposed by the Cloud API.
const BUTTON_TITLE_MAX = 20;
const LIST_ROW_TITLE_MAX = 24;
const LIST_ROW_DESCRIPTION_MAX = 72;
const LIST_BUTTON_LABEL_MAX = 20;
const MAX_BUTTONS = 3;
const MAX_LIST_ROWS = 10;

export function isWhatsAppEnabled(): boolean {
  return whatsappProvider.isConfigured();
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Render a Telegram-flavoured HTML string as WhatsApp markup.
 *
 * The shared dictionary is written for Telegram's `parse_mode: HTML`, so every
 * string may contain <b>/<i>/<code> and HTML entities. WhatsApp understands
 * *bold*, _italic_ and ```monospace``` instead and shows raw tags verbatim, so
 * a message that skipped this conversion would reach the user full of angle
 * brackets.
 */
export function htmlToWhatsApp(html: string): string {
  return html
    .replace(/<\/?(b|strong)>/g, "*")
    .replace(/<\/?(i|em)>/g, "_")
    .replace(/<\/?(code|pre)>/g, "```")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Localized string from the shared dictionary, ready to send. */
export function wt(key: string, lang: SupportedLanguage, vars?: Record<string, string>): string {
  return htmlToWhatsApp(t(key, lang, vars));
}

/**
 * Strings that exist only here. Telegram gets these affordances for free from
 * inline keyboards and message editing (a tap needs no label, a status message
 * is rewritten in place); on WhatsApp each one has to be spelled out.
 */
const WA_STRINGS: Record<string, Record<SupportedLanguage, string>> = {
  // Shown once under the welcome message. WhatsApp has no command menu to
  // discover these from, so without this a new user only ever learns the
  // numbered lists and never finds settings or the text-translation flow.
  quickCommands: {
    ky: "*Командалар:*\n/menu — башкы меню\n/settings — интерфейс жана которуу тили\n/translate — текстти которуу\n/help — толук жардам\n/stop — иштеп жатканды токтотуу",
    tg: "*Дастурҳо:*\n/menu — менюи асосӣ\n/settings — забони интерфейс ва тарҷума\n/translate — тарҷумаи матн\n/help — кӯмаки муфассал\n/stop — қатъ кардани коркард",
    uz: "*Buyruqlar:*\n/menu — asosiy menyu\n/settings — interfeys va tarjima tili\n/translate — matnni tarjima qilish\n/help — batafsil yordam\n/stop — ishlovni to'xtatish",
    en: "*Commands:*\n/menu — main menu\n/settings — interface and translation language\n/translate — translate text\n/help — full help\n/stop — stop processing",
    ru: "*Команды:*\n/menu — главное меню\n/settings — язык интерфейса и перевода\n/translate — перевести текст\n/help — подробная справка\n/stop — остановить обработку",
    uz_cyrl: "*Буйруқлар:*\n/menu — асосий меню\n/settings — интерфейс ва таржима тили\n/translate — матнни таржима қилиш\n/help — батафсил ёрдам\n/stop — ишловни тўхтатиш",
  },
  replyWithNumber: {
    ky: "(Керектүү вариянттын номерин жибериңиз)",
    tg: "(Рақами варианти лозимаро фиристед)",
    uz: "(Kerakli variant raqamini yuboring)",
    en: "(Reply with the number of your choice)",
    ru: "(Отправьте номер нужного варианта)",
    uz_cyrl: "(Керакли вариант рақамини юборинг)",
  },
  rateResult: {
    ky: "Натыйжа кандай болду?",
    tg: "Натиҷа чӣ гуна буд?",
    uz: "Natija qanday bo'ldi?",
    en: "How was the result?",
    ru: "Как вам результат?",
    uz_cyrl: "Натижа қандай бўлди?",
  },
  openMenu: {
    ky: "Меню",
    tg: "Меню",
    uz: "Menyu",
    en: "Menu",
    ru: "Меню",
    uz_cyrl: "Меню",
  },
  chooseLanguage: {
    ky: "Тилди тандаңыз",
    tg: "Забонро интихоб кунед",
    uz: "Tilni tanlang",
    en: "Choose a language",
    ru: "Выберите язык",
    uz_cyrl: "Тилни танланг",
  },
  chooseOption: {
    ky: "Тандаңыз",
    tg: "Интихоб кунед",
    uz: "Tanlang",
    en: "Choose",
    ru: "Выбрать",
    uz_cyrl: "Танланг",
  },
  stop: {
    ky: "Токтотуу",
    tg: "Манъ кардан",
    uz: "To'xtatish",
    en: "Stop",
    ru: "Остановить",
    uz_cyrl: "Тўхтатиш",
  },
  cancel: {
    ky: "Жокко чыгаруу",
    tg: "Бекор кардан",
    uz: "Bekor qilish",
    en: "Cancel",
    ru: "Отмена",
    uz_cyrl: "Бекор қилиш",
  },
  languagesButton: {
    ky: "Тилдер",
    tg: "Забонҳо",
    uz: "Tillar",
    en: "Languages",
    ru: "Языки",
    uz_cyrl: "Тиллар",
  },
  sendMediaHint: {
    ky: "Аудио, видео, үн кат же шилтеме жибериңиз.",
    tg: "Аудио, видео, паёми савтӣ ё пайванд фиристед.",
    uz: "Audio, video, ovozli xabar yoki havola yuboring.",
    en: "Send an audio file, video, voice message, or a link.",
    ru: "Отправьте аудио, видео, голосовое сообщение или ссылку.",
    uz_cyrl: "Аудио, видео, овозли хабар ёки ҳавола юборинг.",
  },
  documentTooLargeForWhatsApp: {
    ky: "Натыйжа өтө чоң, ошондуктан файл менен жиберилди.",
    tg: "Натиҷа хеле калон аст, бинобар ин ҳамчун файл фиристода шуд.",
    uz: "Natija juda katta, shuning uchun fayl sifatida yuborildi.",
    en: "The result is long, so it was sent as a file.",
    ru: "Результат длинный, поэтому отправлен файлом.",
    uz_cyrl: "Натижа жуда катта, шунинг учун файл сифатида юборилди.",
  },
};

/** Localized WhatsApp-only string. */
export function waText(key: keyof typeof WA_STRINGS | string, lang: SupportedLanguage): string {
  const entry = WA_STRINGS[key];
  return entry?.[lang] ?? entry?.["en"] ?? String(key);
}

function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/** Split a long body on paragraph/word boundaries so nothing is cut mid-word. */
function splitMessage(text: string, maxLength = WA_MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= maxLength) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf("\n", maxLength);
    if (cut < maxLength * 0.5) cut = remaining.lastIndexOf(" ", maxLength);
    if (cut < maxLength * 0.5) cut = maxLength;
    parts.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

// ---------------------------------------------------------------------------
// Provider Delegation
// ---------------------------------------------------------------------------

/**
 * Providers without interactive buttons print a numbered list and have to tell
 * the user to answer with a digit. That instruction has to follow the user's
 * interface language, and the provider has no idea what it is.
 */
async function numberedHintFor(waId: string): Promise<string> {
  try {
    const prefs = await getWaPreferences(waId);
    return waText("replyWithNumber", prefs.interfaceLanguage);
  } catch {
    return waText("replyWithNumber", "ru");
  }
}

export async function sendText(waId: string, text: string, previewUrl = false): Promise<string | undefined> {
  return whatsappProvider.sendText(waId, text, previewUrl);
}

export async function sendButtons(
  waId: string,
  body: string,
  buttons: WhatsAppButton[],
  options: { header?: string; footer?: string } = {}
): Promise<string | undefined> {
  return whatsappProvider.sendButtons(waId, body, buttons, {
    ...options,
    numberedHint: await numberedHintFor(waId),
  });
}

export async function sendList(
  waId: string,
  body: string,
  buttonLabel: string,
  rows: WhatsAppListRow[],
  options: { header?: string; footer?: string; sectionTitle?: string } = {}
): Promise<string | undefined> {
  return whatsappProvider.sendList(waId, body, buttonLabel, rows, {
    ...options,
    numberedHint: await numberedHintFor(waId),
  });
}

export async function sendDocument(
  waId: string,
  buffer: Buffer,
  filename: string,
  caption?: string
): Promise<string | undefined> {
  return whatsappProvider.sendDocument(waId, buffer, filename, caption);
}

export async function downloadMedia(mediaIdOrUrl: string) {
  return whatsappProvider.downloadMedia(mediaIdOrUrl);
}

export async function markAsRead(messageId: string): Promise<void> {
  return whatsappProvider.markAsRead(messageId);
}

/**
 * Action id behind a numeric reply to a numbered menu, or undefined when the
 * provider sends real buttons and the text is just text.
 */
export function resolveNumberedChoice(waId: string, text: string): string | undefined {
  return whatsappProvider.resolveNumberedChoice?.(waId, text);
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------
export interface WaUserPreferences {
  interfaceLanguage: SupportedLanguage;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage | "none";
}

function normalizeInterface(lang: string | null | undefined): SupportedLanguage {
  if (lang && INTERFACE_LANGUAGES.includes(lang as (typeof INTERFACE_LANGUAGES)[number])) {
    return lang as SupportedLanguage;
  }
  return "ru";
}

function normalizeSource(lang: string | null | undefined): SupportedLanguage {
  if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) return lang as SupportedLanguage;
  return "ru";
}

function normalizeTarget(lang: string | null | undefined): SupportedLanguage | "none" {
  if (lang === "none") return "none";
  if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) return lang as SupportedLanguage;
  return "none";
}

/**
 * Guess the interface language from the phone's country code.
 *
 * WhatsApp sends no locale for a user — the wa_id is all we get on first
 * contact. A Kyrgyz number defaulting to Russian would be a worse first
 * impression than a guess the user can change in two taps.
 */
export function mapPhoneToLanguage(waId: string): SupportedLanguage {
  const digits = waId.replace(/\D/g, "");
  if (digits.startsWith("996")) return "ky"; // Kyrgyzstan
  if (digits.startsWith("992")) return "tg"; // Tajikistan
  if (digits.startsWith("998")) return "uz"; // Uzbekistan
  if (digits.startsWith("7")) return "ru"; // Russia / Kazakhstan
  if (digits.startsWith("1") || digits.startsWith("44")) return "en";
  return "ru";
}

export async function ensureWhatsAppProfile(waId: string, profileName?: string): Promise<WaUserPreferences> {
  const existing = await getWhatsAppUser(waId);
  if (existing) {
    // Keep the display name fresh without touching language choices.
    if (profileName && profileName !== existing.profile_name) {
      void updateWhatsAppUserPreferences(waId, { profile_name: profileName });
    }
    return {
      interfaceLanguage: normalizeInterface(existing.interface_language),
      sourceLanguage: normalizeSource(existing.preferred_language),
      targetLanguage: normalizeTarget(existing.target_language),
    };
  }

  const detected = mapPhoneToLanguage(waId);
  const target = detected === "ru" ? "en" : "ru";
  await ensureWhatsAppUser(waId, {
    profile_name: profileName ?? null,
    interface_language: detected,
    preferred_language: detected,
    target_language: target,
  });
  logger.info("New WhatsApp profile created", { waId, detectedLang: detected });
  return { interfaceLanguage: detected, sourceLanguage: detected, targetLanguage: target };
}

export async function getWaPreferences(waId: string): Promise<WaUserPreferences> {
  const user = await getWhatsAppUser(waId);
  return {
    interfaceLanguage: normalizeInterface(user?.interface_language),
    sourceLanguage: normalizeSource(user?.preferred_language),
    targetLanguage: normalizeTarget(user?.target_language),
  };
}

export async function setWaInterfaceLanguage(waId: string, lang: SupportedLanguage): Promise<void> {
  await updateWhatsAppUserPreferences(waId, { interface_language: lang });
}

export async function setWaSourceLanguage(waId: string, lang: SupportedLanguage): Promise<void> {
  await updateWhatsAppUserPreferences(waId, { preferred_language: lang });
}

export async function setWaTargetLanguage(waId: string, lang: SupportedLanguage | "none"): Promise<void> {
  await updateWhatsAppUserPreferences(waId, { target_language: lang });
}

// ---------------------------------------------------------------------------
// Pending actions
// ---------------------------------------------------------------------------
export interface WaPendingMedia {
  type: "media";
  buffer: Buffer;
  filename: string;
  messageId?: string;
  sourceLanguage?: SupportedLanguage;
  targetLanguage?: SupportedLanguage | "none";
  createdAt: number;
}

export interface WaPendingLink {
  type: "youtube";
  url: string;
  title?: string;
  sourceLanguage?: SupportedLanguage;
  targetLanguage?: SupportedLanguage | "none";
  createdAt: number;
}

export interface WaPendingTranslateText {
  type: "translate_text";
  targetLanguage: SupportedLanguage;
  createdAt: number;
}

export type WaPendingAction = WaPendingMedia | WaPendingLink | WaPendingTranslateText;
export type WaPendingActionWithId = WaPendingAction & { actionId: string };

const pendingActions = new Map<string, WaPendingActionWithId>();
const PENDING_TTL_MS = 60 * 60 * 1000;

function rowToPendingAction(row: WhatsAppPendingActionRow): WaPendingActionWithId {
  const payload = row.payload;
  const createdAt = new Date(row.created_at).getTime();

  if (row.action_type === "media") {
    return {
      type: "media",
      actionId: row.action_id,
      filename: String(payload.filename ?? "media.mp4"),
      messageId: payload.messageId ? String(payload.messageId) : undefined,
      sourceLanguage: normalizeSource(payload.sourceLanguage as string),
      targetLanguage: normalizeTarget(payload.targetLanguage as string),
      buffer: row.buffer ? Buffer.from(row.buffer) : Buffer.alloc(0),
      createdAt,
    };
  }
  if (row.action_type === "translate_text") {
    return {
      type: "translate_text",
      actionId: row.action_id,
      targetLanguage: normalizeSource(payload.targetLanguage as string),
      createdAt,
    };
  }
  return {
    type: "youtube",
    actionId: row.action_id,
    url: String(payload.url ?? ""),
    title: payload.title ? String(payload.title) : undefined,
    sourceLanguage: normalizeSource(payload.sourceLanguage as string),
    targetLanguage: normalizeTarget(payload.targetLanguage as string),
    createdAt,
  };
}

/** Restore pending confirmations on startup so a restart does not lose media. */
export async function initWhatsAppPendingActions(): Promise<void> {
  try {
    const rows = await listWhatsAppPendingActions();
    for (const row of rows) {
      try {
        pendingActions.set(row.wa_id, rowToPendingAction(row));
      } catch (err) {
        logger.warn("Failed to hydrate WhatsApp pending action", {
          waId: row.wa_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    logger.info("Hydrated WhatsApp pending actions", { count: pendingActions.size });
  } catch (err) {
    logger.warn("Failed to hydrate WhatsApp pending actions", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function cleanExpired(): void {
  const now = Date.now();
  let expired = false;
  for (const [waId, action] of pendingActions.entries()) {
    if (now - action.createdAt > PENDING_TTL_MS) {
      pendingActions.delete(waId);
      expired = true;
    }
  }
  if (expired) {
    deleteExpiredWhatsAppPendingActions(PENDING_TTL_MS).catch((err) =>
      logger.warn("Failed to clean expired WhatsApp pending actions", {
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

function syncToDb(waId: string, action: WaPendingActionWithId): void {
  const payload: Record<string, unknown> = { ...action };
  delete payload.buffer;
  delete payload.actionId;
  const buffer = action.type === "media" ? action.buffer : undefined;
  setPendingActionDb(waId, action.actionId, action.type, payload, buffer).catch((err) =>
    logger.warn("Failed to persist WhatsApp pending action", {
      waId,
      error: err instanceof Error ? err.message : String(err),
    })
  );
}

export function getWaPendingAction(waId: string): WaPendingActionWithId | undefined {
  cleanExpired();
  return pendingActions.get(waId);
}

export function setWaPendingAction(waId: string, action: WaPendingAction): string {
  cleanExpired();
  const actionId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const withId = { ...action, actionId } as WaPendingActionWithId;
  pendingActions.set(waId, withId);
  syncToDb(waId, withId);
  return actionId;
}

export function updateWaPendingAction(waId: string, updates: Partial<WaPendingAction>): void {
  const existing = pendingActions.get(waId);
  if (!existing) return;
  const updated = { ...existing, ...updates } as WaPendingActionWithId;
  pendingActions.set(waId, updated);
  syncToDb(waId, updated);
}

export function clearWaPendingAction(waId: string): void {
  pendingActions.delete(waId);
  deletePendingActionDb(waId).catch((err) =>
    logger.warn("Failed to delete WhatsApp pending action", {
      waId,
      error: err instanceof Error ? err.message : String(err),
    })
  );
}

// ---------------------------------------------------------------------------
// Active processes
// ---------------------------------------------------------------------------
export interface WaActiveProcess {
  pid?: number;
  abortController?: AbortController;
  startTime: number;
  type: "media" | "youtube";
  language?: string;
  filename?: string;
  sourceUrl?: string;
}

const activeProcesses = new Map<string, WaActiveProcess>();

export function getWaActiveProcess(waId: string): WaActiveProcess | undefined {
  return activeProcesses.get(waId);
}

export function setWaActiveProcess(waId: string, proc: WaActiveProcess): void {
  activeProcesses.set(waId, proc);
}

export function clearWaActiveProcess(waId: string): void {
  activeProcesses.delete(waId);
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

/**
 * WhatsApp has no persistent keyboard: every choice must ride on a message.
 * These builders keep the wording identical to the Telegram bot while fitting
 * the Cloud API's shapes — at most three reply buttons, otherwise a list.
 */
export function languageRows(
  languages: readonly SupportedLanguage[],
  idPrefix: string
): WhatsAppListRow[] {
  return languages.map((code) => ({
    id: `${idPrefix}${code}`,
    title: `${LANGUAGE_FLAGS[code]} ${LANGUAGE_LABELS[code]}`,
  }));
}

export async function sendMainMenu(
  waId: string,
  prefs: WaUserPreferences,
  isStart = false
): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const body = isStart
    ? `${wt("welcome", lang)}\n\n${waText("quickCommands", lang)}`
    : `${wt("welcome", lang)}\n\n${wt("mainMenuHint", lang)}`;

  await sendButtons(waId, body, [
    { id: "action:translate_text", title: wt("translateTextButton", lang) },
    { id: "action:settings", title: wt("settingsMenu", lang).split("\n")[0] },
    { id: "action:help", title: wt("helpButton", lang) },
  ]);
}

export function buildSettingsText(prefs: WaUserPreferences): string {
  const lang = prefs.interfaceLanguage;
  const sourceLabel = `${LANGUAGE_FLAGS[prefs.sourceLanguage]} ${LANGUAGE_LABELS[prefs.sourceLanguage]}`;
  const targetLabel =
    prefs.targetLanguage === "none"
      ? wt("noDefaultTarget", lang)
      : `${LANGUAGE_FLAGS[prefs.targetLanguage]} ${LANGUAGE_LABELS[prefs.targetLanguage]}`;

  return (
    `${wt("settingsMenu", lang)}\n\n` +
    `${wt("settingsInterfaceLanguage", lang)}: ${LANGUAGE_FLAGS[lang]} ${LANGUAGE_LABELS[lang]}\n` +
    `${wt("settingsSourceLanguage", lang)}: ${sourceLabel}\n` +
    `${wt("settingsTargetLanguage", lang)}: ${targetLabel}`
  );
}

export async function sendSettingsMenu(waId: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;
  await sendList(
    waId,
    buildSettingsText(prefs),
    wt("changeLanguage", lang),
    [
      { id: "settings:interface", title: wt("settingsInterfaceLanguage", lang) },
      { id: "settings:source", title: wt("settingsSourceLanguage", lang) },
      { id: "settings:target", title: wt("settingsTargetLanguage", lang) },
      { id: "action:main", title: wt("backToMenu", lang) },
    ],
    { sectionTitle: wt("settingsMenu", lang).split("\n")[0] }
  );
}

/** Rating buttons that ride along with a finished result. */
export async function sendResultFeedbackPrompt(
  waId: string,
  lang: SupportedLanguage,
  requestNumber?: number
): Promise<void> {
  const ref = requestNumber ?? 0;
  await sendButtons(
    waId,
    waText("rateResult", lang),
    [
      { id: `fb:up:${ref}`, title: wt("feedbackGood", lang) },
      { id: `fb:down:${ref}`, title: wt("feedbackBad", lang) },
      { id: `fb:issue:${ref}`, title: wt("feedbackReport", lang) },
    ],
    { footer: requestNumber ? `#${requestNumber}` : undefined }
  );
}
