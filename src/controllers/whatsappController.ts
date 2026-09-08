import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { unlink } from "fs/promises";
import { logger } from "../utils/logger";
import { config } from "../config";
import type {
  WhatsAppWebhookBody,
  WhatsAppMessage,
  WhatsAppMedia,
  WhatsAppListRow,
  WhatsAppMessageType,
} from "../types/whatsapp";
import type { TranscriptionResult, TranscriptionSegment } from "../types";
import { transcribeAudio, formatSubtitles } from "../services/transcriptionService";
import { cleanupTranscription, detectTranscriptionIssues } from "../services/cleanupService";
import { translateText } from "../services/translationService";
import {
  isSupportedMediaUrl,
  validateMediaUrl,
  downloadMediaAudio,
} from "../services/youtubeService";
import { getMediaErrorMessage } from "../utils/mediaErrors";
import { sendAdminAlert } from "../services/alertService";
import { getWhatsAppUser, markWhatsAppUserStarted } from "../db/repos/whatsappUserRepo";
import {
  createTranscriptionRequest,
  updateTranscriptionRequest,
  getTranscriptionRequestByNumber,
  findTranslationRequestByNumber,
  createFeedback,
  updateFeedback,
  type FeedbackEntry,
} from "../db/repos";
import {
  isWhatsAppEnabled,
  sendText,
  sendButtons,
  sendList,
  sendDocument,
  downloadMedia,
  markAsRead,
  resolveNumberedChoice,
  wt,
  waText,
  languageRows,
  sendMainMenu,
  sendSettingsMenu,
  sendResultFeedbackPrompt,
  ensureWhatsAppProfile,
  getWaPreferences,
  setWaInterfaceLanguage,
  setWaSourceLanguage,
  setWaTargetLanguage,
  getWaPendingAction,
  setWaPendingAction,
  updateWaPendingAction,
  clearWaPendingAction,
  getWaActiveProcess,
  setWaActiveProcess,
  clearWaActiveProcess,
  SOURCE_LANGUAGES,
  INTERFACE_LANGUAGES,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
  WA_TEXT_FILE_THRESHOLD,
  type SupportedLanguage,
  type WaUserPreferences,
} from "../services/whatsappService";

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
// Short results are easier to read in the chat than in a downloaded file; long
// ones would be split across several bubbles, so those go out as a document.
const INLINE_RESULT_LIMIT = 1200;
const MAX_ERROR_CHARS = 300;

/**
 * A failing Python worker can produce a multi-line traceback. The user needs its
 * first line, not all of it, inside a chat bubble — the full message still goes
 * to the log and to the audit row.
 */
function shortError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const firstLine = message.split("\n")[0].trim() || message.trim();
  return firstLine.length > MAX_ERROR_CHARS ? `${firstLine.slice(0, MAX_ERROR_CHARS - 1)}…` : firstLine;
}

// ---------------------------------------------------------------------------
// Webhook plumbing
// ---------------------------------------------------------------------------

/**
 * Meta re-delivers a message until it gets a 200, and delivers the same id to
 * every instance behind a load balancer. Without this, one voice message could
 * be transcribed several times.
 */
const DEDUP_TTL_MS = 10 * 60 * 1000;
const recentMessageIds = new Map<string, number>();

function isDuplicateMessage(messageId: string): boolean {
  const now = Date.now();
  if (recentMessageIds.size > 500) {
    for (const [id, ts] of recentMessageIds.entries()) {
      if (now - ts > DEDUP_TTL_MS) recentMessageIds.delete(id);
    }
  }
  if (recentMessageIds.has(messageId)) return true;
  recentMessageIds.set(messageId, now);
  return false;
}

/**
 * GET handshake Meta performs when the webhook URL is saved in the app
 * dashboard: echo hub.challenge back if the token matches.
 */
export function handleWhatsAppVerify(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === config.WHATSAPP_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(String(challenge ?? ""));
    return;
  }

  logger.warn("WhatsApp webhook verification failed", { mode, hasToken: Boolean(token) });
  res.sendStatus(403);
}

/**
 * Confirm the payload really came from Meta. The signature covers the raw body,
 * so app.ts stashes it during JSON parsing — re-serializing the parsed object
 * would produce a different byte string and never match.
 */
function hasValidSignature(req: Request): boolean {
  if (!config.WHATSAPP_APP_SECRET) return true; // verification disabled

  const header = req.get("x-hub-signature-256");
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!header || !raw) return false;

  const expected = `sha256=${createHmac("sha256", config.WHATSAPP_APP_SECRET).update(raw).digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
  if (!hasValidSignature(req)) {
    logger.warn("WhatsApp webhook rejected: bad signature");
    res.sendStatus(403);
    return;
  }

  // Meta retries anything that is not answered within seconds, so acknowledge
  // before doing any work.
  res.sendStatus(200);

  if (!isWhatsAppEnabled()) return;

  const body = req.body as WhatsAppWebhookBody;
  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      for (const status of value?.statuses ?? []) {
        if (status.status === "failed") {
          logger.warn("WhatsApp message delivery failed", {
            recipient: status.recipient_id,
            errors: status.errors,
          });
        }
      }

      for (const message of value?.messages ?? []) {
        const profileName = value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
        try {
          await handleMessage(message, profileName);
        } catch (err) {
          logger.error("Error processing WhatsApp message", {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            messageId: message.id,
          });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Message routing
// ---------------------------------------------------------------------------

/** Words that open a conversation. "menu" is deliberately not one of them. */
const START_WORDS = new Set(["start", "старт", "boshla", "башта", "оғоз"]);

/**
 * True when this chat may be answered: it has sent /start before, or is
 * sending it right now. The flag is stored per chat so it survives restarts.
 */
async function hasStarted(waId: string, msg: WhatsAppMessage): Promise<boolean> {
  const user = await getWhatsAppUser(waId);
  if (user?.started_at) return true;

  const text = msg.type === "text" ? (msg.text?.body ?? "").trim().toLowerCase().replace(/^\//, "") : "";
  if (!START_WORDS.has(text)) return false;

  await markWhatsAppUserStarted(waId);
  return true;
}


async function handleMessage(msg: WhatsAppMessage, profileName?: string): Promise<void> {
  if (isDuplicateMessage(msg.id)) {
    logger.debug("Duplicate WhatsApp message ignored", { messageId: msg.id });
    return;
  }

  const waId = msg.from;
  const prefs = await ensureWhatsAppProfile(waId, profileName);

  // The bot answers a chat only once that chat has sent /start. Anything
  // arriving before that is read and dropped without a reply, so the number
  // never speaks to someone who did not open the conversation.
  if (!(await hasStarted(waId, msg))) {
    logger.debug("WhatsApp message ignored: chat has not sent /start", { waId });
    return;
  }

  void markAsRead(msg.id);

  switch (msg.type) {
    case "interactive":
      await handleInteractive(waId, msg, prefs);
      return;
    case "button":
      // Legacy template buttons carry their payload instead of an id.
      await handleAction(waId, msg.button?.payload ?? "action:main", prefs);
      return;
    case "text":
      await handleText(waId, msg.text?.body?.trim() ?? "", prefs);
      return;
    case "audio":
    case "voice":
    case "video":
    case "document":
      await handleMedia(waId, msg, prefs);
      return;
    default:
      await sendText(waId, `${wt("unsupportedFileType", prefs.interfaceLanguage)}\n\n${waText("sendMediaHint", prefs.interfaceLanguage)}`);
  }
}

async function handleText(waId: string, text: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;

  if (!text) {
    await sendMainMenu(waId, prefs);
    return;
  }

  // On providers without interactive buttons the menu was sent as a numbered
  // list, so a bare "2" is a button press rather than a message. Resolved
  // before the commands below; the two cannot collide.
  const numberedChoice = resolveNumberedChoice(waId, text);
  if (numberedChoice) {
    await handleAction(waId, numberedChoice, prefs);
    return;
  }

  // Commands, with the bare words people actually type on WhatsApp — there is
  // no command menu here to discover "/help" from.
  const normalized = text.toLowerCase().replace(/^\//, "");
  if (["start", "menu", "меню", "старт", "boshla", "башта"].includes(normalized)) {
    await sendMainMenu(waId, prefs, true);
    return;
  }
  if (["help", "помощь", "справка", "yordam", "жардам", "кӯмак"].includes(normalized)) {
    await sendText(waId, wt("help", lang));
    await sendMainMenu(waId, prefs);
    return;
  }
  if (["settings", "настройки", "sozlamalar", "жөндөөлөр", "танзимот", "lang"].includes(normalized)) {
    await sendSettingsMenu(waId, prefs);
    return;
  }
  if (["stop", "стоп", "cancel", "отмена"].includes(normalized)) {
    await stopActiveProcess(waId, prefs);
    return;
  }
  if (normalized === "translate" || normalized === "перевод") {
    await startTranslateTextFlow(waId, prefs);
    return;
  }

  if (isSupportedMediaUrl(text)) {
    await handleMediaLink(waId, text, prefs);
    return;
  }

  // A text the user was asked for: translation input, feedback comment, or a
  // problem report. Checked in that order so an in-flight request wins.
  const pending = getWaPendingAction(waId);
  if (pending?.type === "translate_text") {
    clearWaPendingAction(waId);
    await processTextTranslation(waId, text, pending.targetLanguage, prefs);
    return;
  }

  const pendingText = takePendingFeedbackText(waId);
  if (pendingText?.feedbackId) {
    const updated = await updateFeedback(pendingText.feedbackId, { comment: text.slice(0, 2000) }).catch((err) => {
      logger.warn("Failed to save WhatsApp feedback comment", {
        error: err instanceof Error ? err.message : String(err),
        feedbackId: pendingText.feedbackId,
      });
      return null;
    });
    await sendText(waId, wt("feedbackCommentSaved", lang));
    if (updated) void notifyAdminFeedback(updated, true);
    return;
  }
  if (pendingText) {
    const entry = await recordFeedback({
      waId,
      requestNumber: pendingText.issueRequestNumber,
      rating: "issue",
      comment: text.slice(0, 2000),
      interfaceLang: lang,
    });
    await sendText(waId, wt("feedbackCommentSaved", lang));
    if (entry) void notifyAdminFeedback(entry);
    return;
  }

  await sendMainMenu(waId, prefs);
}

function mediaOf(msg: WhatsAppMessage): { media: WhatsAppMedia; kind: string } | null {
  if (msg.voice) return { media: msg.voice, kind: "voice" };
  if (msg.audio) return { media: msg.audio, kind: "audio" };
  if (msg.video) return { media: msg.video, kind: "video" };
  if (msg.document) return { media: msg.document, kind: "document" };
  return null;
}

function extensionFor(mimeType: string, kind: string): string {
  const map: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/opus": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "video/quicktime": "mov",
  };
  const base = mimeType.split(";")[0].trim();
  return map[base] ?? (kind === "video" ? "mp4" : "ogg");
}

async function handleMedia(waId: string, msg: WhatsAppMessage, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const found = mediaOf(msg);
  if (!found) {
    await sendText(waId, wt("unsupportedFileType", lang));
    return;
  }

  const { media, kind } = found;
  const mimeType = media.mime_type ?? "";
  if (kind === "document" && !/^(audio|video)\//.test(mimeType)) {
    await sendText(waId, wt("unsupportedFileType", lang));
    return;
  }

  let downloaded;
  try {
    downloaded = await downloadMedia(media.id);
  } catch (err) {
    logger.error("WhatsApp media download failed", {
      error: err instanceof Error ? err.message : String(err),
      waId,
      mediaId: media.id,
    });
    await sendText(waId, wt("transcriptionFailed", lang, { error: shortError(err) }));
    return;
  }

  if (downloaded.buffer.length > MAX_MEDIA_BYTES) {
    await sendText(
      waId,
      wt("fileTooLarge", lang, { size: (downloaded.buffer.length / 1024 / 1024).toFixed(1) })
    );
    return;
  }

  const filename =
    media.filename ?? `whatsapp_${kind}_${Date.now()}.${extensionFor(downloaded.mimeType || mimeType, kind)}`;

  const actionId = setWaPendingAction(waId, {
    type: "media",
    buffer: downloaded.buffer,
    filename,
    messageId: msg.id,
    sourceLanguage: prefs.sourceLanguage,
    targetLanguage: prefs.targetLanguage,
    createdAt: Date.now(),
  });

  await askSourceLanguage(waId, lang, `cf:${actionId}`);
}

async function handleMediaLink(waId: string, url: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;

  const validation = await validateMediaUrl(url);
  if (!validation.ok) {
    await sendText(waId, getMediaErrorMessage(validation.reason, lang));
    return;
  }

  const pending = getWaPendingAction(waId);
  let actionId: string;
  if (pending?.type === "youtube") {
    actionId = pending.actionId;
    updateWaPendingAction(waId, { url, title: validation.title });
  } else {
    actionId = setWaPendingAction(waId, {
      type: "youtube",
      url,
      title: validation.title,
      sourceLanguage: prefs.sourceLanguage,
      targetLanguage: prefs.targetLanguage,
      createdAt: Date.now(),
    });
  }

  await sendText(waId, wt("mediaPreview", lang, { title: validation.title ?? "" }));
  await askSourceLanguage(waId, lang, `cf:${actionId}`);
}

// ---------------------------------------------------------------------------
// Menus and interactive replies
// ---------------------------------------------------------------------------

async function askSourceLanguage(waId: string, lang: SupportedLanguage, mode: string): Promise<void> {
  await sendList(
    waId,
    wt("chooseSourceLanguage", lang),
    waText("chooseLanguage", lang),
    languageRows(SOURCE_LANGUAGES, `src:${mode}:`),
    { sectionTitle: waText("chooseLanguage", lang) }
  );
}

async function askTargetLanguage(waId: string, lang: SupportedLanguage, mode: string): Promise<void> {
  const rows: WhatsAppListRow[] = [
    ...languageRows(SUPPORTED_LANGUAGES, `tgt:${mode}:`),
    { id: `tgt:${mode}:none`, title: wt("noTranslation", lang) },
  ];
  await sendList(waId, wt("chooseTargetLanguage", lang), waText("chooseLanguage", lang), rows, {
    sectionTitle: waText("chooseLanguage", lang),
  });
}

async function askInterfaceLanguage(waId: string, lang: SupportedLanguage): Promise<void> {
  await sendList(
    waId,
    wt("chooseInterfaceLanguage", lang),
    waText("chooseLanguage", lang),
    languageRows(INTERFACE_LANGUAGES, "ui:"),
    { sectionTitle: waText("chooseLanguage", lang) }
  );
}

function buildConfirmationText(
  lang: SupportedLanguage,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage | "none",
  title?: string
): string {
  const sourceLabel = `${LANGUAGE_FLAGS[sourceLang]} ${LANGUAGE_LABELS[sourceLang]}`;
  const targetLabel =
    targetLang === "none" ? wt("noDefaultTarget", lang) : `${LANGUAGE_FLAGS[targetLang]} ${LANGUAGE_LABELS[targetLang]}`;

  const confirm = wt(targetLang === "none" ? "confirmStartNoTranslation" : "confirmStart", lang, {
    source: sourceLabel,
    target: targetLabel,
  });
  return title ? `${wt("mediaPreview", lang, { title })}\n\n${confirm}` : confirm;
}

async function sendConfirmationCard(waId: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const pending = getWaPendingAction(waId);
  if (!pending || pending.type === "translate_text") {
    await sendText(waId, wt("sessionExpired", lang));
    return;
  }

  const text = buildConfirmationText(
    lang,
    pending.sourceLanguage ?? prefs.sourceLanguage,
    pending.targetLanguage ?? prefs.targetLanguage,
    pending.type === "youtube" ? pending.title : undefined
  );

  await sendButtons(waId, text, [
    { id: `confirm:start:${pending.actionId}`, title: `▶ ${wt("start", lang)}` },
    { id: `confirm:langs:${pending.actionId}`, title: waText("languagesButton", lang) },
    { id: `confirm:cancel:${pending.actionId}`, title: waText("cancel", lang) },
  ]);
}

async function handleInteractive(waId: string, msg: WhatsAppMessage, prefs: WaUserPreferences): Promise<void> {
  const reply = msg.interactive;
  const id = reply?.button_reply?.id ?? reply?.list_reply?.id;
  if (!id) {
    await sendMainMenu(waId, prefs);
    return;
  }
  await handleAction(waId, id, prefs);
}

async function handleAction(waId: string, id: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;
  logger.debug("WhatsApp action", { waId, id });

  // Anything unrecognised falls through to the main menu at the end of this
  // function. Silence would leave the user staring at a tapped button that did
  // nothing, with no way to tell whether the bot is working.

  // ---- Feedback ------------------------------------------------------------
  if (id.startsWith("fb:")) {
    const [, rating, ref] = id.split(":");
    const requestNumber = Number(ref) > 0 ? Number(ref) : undefined;

    if (rating === "issue") {
      setPendingIssueReport(waId, requestNumber);
      await sendText(waId, wt("feedbackReportHint", lang));
      return;
    }

    const entry = await recordFeedback({
      waId,
      requestNumber,
      rating: rating === "up" ? "up" : "down",
      interfaceLang: lang,
    });

    if (rating === "up") {
      await sendText(waId, wt("feedbackThanks", lang));
    } else if (entry) {
      await sendList(
        waId,
        wt("feedbackAskReason", lang),
        waText("chooseOption", lang),
        [
          { id: `fbc:stt:${entry.id}`, title: wt("feedbackReasonStt", lang) },
          { id: `fbc:translation:${entry.id}`, title: wt("feedbackReasonTranslation", lang) },
          { id: `fbc:download:${entry.id}`, title: wt("feedbackReasonDownload", lang) },
          { id: `fbc:speed:${entry.id}`, title: wt("feedbackReasonSpeed", lang) },
          { id: `fbc:other:${entry.id}`, title: wt("feedbackReasonOther", lang) },
        ],
        { sectionTitle: waText("chooseOption", lang) }
      );
    } else {
      await sendText(waId, wt("feedbackThanks", lang));
    }
    return;
  }

  if (id.startsWith("fbc:")) {
    const [, category, idRaw] = id.split(":");
    const feedbackId = Number(idRaw);
    if (Number.isFinite(feedbackId) && feedbackId > 0) {
      await updateFeedback(feedbackId, { category }).catch((err) =>
        logger.warn("Failed to set WhatsApp feedback category", {
          error: err instanceof Error ? err.message : String(err),
          feedbackId,
        })
      );
      setPendingFeedbackComment(waId, feedbackId);
    }
    await sendText(waId, wt("feedbackCommentHint", lang));
    return;
  }

  // ---- Language pickers ----------------------------------------------------
  if (id.startsWith("ui:")) {
    const code = id.slice(3) as SupportedLanguage;
    await setWaInterfaceLanguage(waId, code);
    const updated = await getWaPreferences(waId);
    await sendText(waId, wt("interfaceLanguageSet", code, { language: LANGUAGE_LABELS[code] }));
    await sendSettingsMenu(waId, updated);
    return;
  }

  if (id.startsWith("src:")) {
    // src:<mode>:<lang> where mode is "def" or "cf:<actionId>"
    const rest = id.slice(4);
    const code = rest.slice(rest.lastIndexOf(":") + 1) as SupportedLanguage;
    const mode = rest.slice(0, rest.lastIndexOf(":"));

    if (mode === "def") {
      await setWaSourceLanguage(waId, code);
      const updated = await getWaPreferences(waId);
      await sendSettingsMenu(waId, updated);
      return;
    }
    if (mode.startsWith("cf:")) {
      const actionId = mode.slice(3);
      const pending = getWaPendingAction(waId);
      if (!pending || pending.actionId !== actionId) {
        await sendText(waId, wt("sessionExpired", lang));
        return;
      }
      updateWaPendingAction(waId, { sourceLanguage: code });
      await sendConfirmationCard(waId, prefs);
      return;
    }
  }

  if (id.startsWith("tgt:")) {
    const rest = id.slice(4);
    const code = rest.slice(rest.lastIndexOf(":") + 1) as SupportedLanguage | "none";
    const mode = rest.slice(0, rest.lastIndexOf(":"));

    if (mode === "def") {
      await setWaTargetLanguage(waId, code);
      const updated = await getWaPreferences(waId);
      await sendSettingsMenu(waId, updated);
      return;
    }
    if (mode.startsWith("cf:")) {
      const actionId = mode.slice(3);
      const pending = getWaPendingAction(waId);
      if (!pending || pending.actionId !== actionId) {
        await sendText(waId, wt("sessionExpired", lang));
        return;
      }
      updateWaPendingAction(waId, { targetLanguage: code });
      // Remember the choice, exactly as the Telegram flow does.
      await setWaTargetLanguage(waId, code);
      await sendConfirmationCard(waId, prefs);
      return;
    }
    if (mode.startsWith("tt:")) {
      const actionId = mode.slice(3);
      const pending = getWaPendingAction(waId);
      if (pending?.type === "translate_text" && pending.actionId === actionId && code !== "none") {
        updateWaPendingAction(waId, { targetLanguage: code });
      }
      await sendText(waId, wt("sendTextToTranslate", lang));
      return;
    }
  }

  // ---- Confirmation card ---------------------------------------------------
  if (id.startsWith("confirm:")) {
    const [, action, actionId] = id.split(":");
    const pending = getWaPendingAction(waId);
    if (!pending || pending.actionId !== actionId) {
      await sendText(waId, wt("sessionExpired", lang));
      return;
    }

    if (action === "start") {
      await startPendingAction(waId);
    } else if (action === "langs") {
      await sendList(
        waId,
        waText("chooseLanguage", lang),
        waText("chooseOption", lang),
        [
          { id: `confirm:src:${actionId}`, title: wt("settingsSourceLanguage", lang) },
          { id: `confirm:tgt:${actionId}`, title: wt("settingsTargetLanguage", lang) },
          { id: `confirm:back:${actionId}`, title: wt("back", lang) },
        ],
        { sectionTitle: waText("chooseOption", lang) }
      );
    } else if (action === "src") {
      await askSourceLanguage(waId, lang, `cf:${actionId}`);
    } else if (action === "tgt") {
      await askTargetLanguage(waId, lang, `cf:${actionId}`);
    } else if (action === "back") {
      await sendConfirmationCard(waId, prefs);
    } else if (action === "cancel") {
      clearWaPendingAction(waId);
      await sendMainMenu(waId, prefs);
    }
    return;
  }

  // ---- Settings and menu ---------------------------------------------------
  if (id === "settings:interface") {
    await askInterfaceLanguage(waId, lang);
    return;
  }
  if (id === "settings:source") {
    await askSourceLanguage(waId, lang, "def");
    return;
  }
  if (id === "settings:target") {
    await askTargetLanguage(waId, lang, "def");
    return;
  }
  if (id === "action:settings") {
    await sendSettingsMenu(waId, prefs);
    return;
  }
  if (id === "action:help") {
    await sendText(waId, wt("help", lang));
    return;
  }
  if (id === "action:translate_text") {
    await startTranslateTextFlow(waId, prefs);
    return;
  }
  if (id === "action:stop" || id.startsWith("stop")) {
    await stopActiveProcess(waId, prefs);
    return;
  }

  await sendMainMenu(waId, prefs);
}

async function startTranslateTextFlow(waId: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const target = prefs.targetLanguage === "none" ? "ru" : prefs.targetLanguage;

  const actionId = setWaPendingAction(waId, {
    type: "translate_text",
    targetLanguage: target,
    createdAt: Date.now(),
  });

  await sendList(
    waId,
    wt("chooseTranslationTargetLanguage", lang),
    waText("chooseLanguage", lang),
    languageRows(SUPPORTED_LANGUAGES, `tgt:tt:${actionId}:`),
    { sectionTitle: waText("chooseLanguage", lang) }
  );
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

async function startPendingAction(waId: string): Promise<void> {
  const prefs = await getWaPreferences(waId);
  const lang = prefs.interfaceLanguage;
  const pending = getWaPendingAction(waId);

  if (!pending) {
    await sendText(waId, wt("sessionExpired", lang));
    return;
  }
  if (pending.type === "translate_text") {
    clearWaPendingAction(waId);
    await sendText(waId, wt("sendTextToTranslate", lang));
    return;
  }

  if (getWaActiveProcess(waId)) {
    await sendText(waId, wt("processAlreadyRunning", lang));
    return;
  }

  clearWaPendingAction(waId);
  const sourceLang = pending.sourceLanguage ?? prefs.sourceLanguage;
  const targetLang = pending.targetLanguage === "none" ? undefined : pending.targetLanguage;

  if (pending.type === "media") {
    await processAudio(waId, pending.buffer, pending.filename, sourceLang, targetLang, prefs, pending.messageId);
  } else {
    await processMediaLink(waId, pending.url, sourceLang, targetLang, prefs);
  }
}

/**
 * WhatsApp cannot edit a sent message, so a Telegram-style animated progress bar
 * would mean a new bubble every few seconds. Instead the user gets one message
 * per real phase change, and a Stop button on the first one.
 */
function createPhaseReporter(waId: string, lang: SupportedLanguage) {
  let current = "";
  let sent = 0;
  const MAX_PHASE_MESSAGES = 4;

  return async (label: string, withStop = false): Promise<void> => {
    if (!label || label === current || sent >= MAX_PHASE_MESSAGES) return;
    current = label;
    sent += 1;
    try {
      // The shared phase strings already carry their own icon, so nothing is
      // prepended here.
      if (withStop) {
        await sendButtons(waId, label, [{ id: "action:stop", title: waText("stop", lang) }]);
      } else {
        await sendText(waId, label);
      }
    } catch (err) {
      logger.debug("Failed to send WhatsApp phase update", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

async function openRequest(payload: {
  waId: string;
  sourceType: string;
  sourceUrl?: string;
  filename?: string;
  language: string;
}): Promise<number | undefined> {
  try {
    const row = await createTranscriptionRequest({
      whatsappWaId: payload.waId,
      sourceType: payload.sourceType,
      sourceUrl: payload.sourceUrl,
      filename: payload.filename,
      language: payload.language,
    });
    return row.request_number;
  } catch (err) {
    logger.warn("Failed to open WhatsApp transcription request", {
      error: err instanceof Error ? err.message : String(err),
      waId: payload.waId,
    });
    return undefined;
  }
}

async function closeRequest(
  requestNumber: number | undefined,
  updates: Parameters<typeof updateTranscriptionRequest>[1]
): Promise<void> {
  if (!requestNumber) return;
  await updateTranscriptionRequest(requestNumber, updates).catch((err) =>
    logger.warn("Failed to close WhatsApp transcription request", {
      error: err instanceof Error ? err.message : String(err),
      requestNumber,
    })
  );
}

async function processAudio(
  waId: string,
  buffer: Buffer,
  filename: string,
  language: SupportedLanguage,
  targetLanguage: SupportedLanguage | undefined,
  prefs: WaUserPreferences,
  sourceMessageId?: string
): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const phase = createPhaseReporter(waId, lang);
  const abortController = new AbortController();
  const requestNumber = await openRequest({
    waId,
    sourceType: "whatsapp_media",
    filename,
    language,
  });

  await phase(wt("transcribing", lang), true);

  try {
    setWaActiveProcess(waId, { abortController, startTime: Date.now(), type: "media", language, filename });

    const result = await transcribeAudio(
      buffer,
      filename,
      language,
      (pid) => setWaActiveProcess(waId, { pid, abortController, startTime: Date.now(), type: "media", language, filename }),
      undefined,
      abortController.signal
    );
    clearWaActiveProcess(waId);

    if (result.segments.length === 0) {
      await closeRequest(requestNumber, { status: "completed", completedAt: new Date() });
      await sendText(waId, wt("noSpeech", lang));
      return;
    }

    await finishResult(waId, result, targetLanguage, prefs, phase, requestNumber, {
      sourceType: "whatsapp_media",
      messageId: sourceMessageId,
    });
  } catch (err) {
    clearWaActiveProcess(waId);
    const message = err instanceof Error ? err.message : String(err);
    logger.error("WhatsApp transcription error", { error: message, waId, requestNumber });
    await closeRequest(requestNumber, { status: "error", errorMessage: message });
    await sendText(waId, wt("transcriptionFailed", lang, { error: shortError(err) }));
  }
}

async function processMediaLink(
  waId: string,
  url: string,
  language: SupportedLanguage,
  targetLanguage: SupportedLanguage | undefined,
  prefs: WaUserPreferences
): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const phase = createPhaseReporter(waId, lang);
  const abortController = new AbortController();
  let tmpWav = "";
  const requestNumber = await openRequest({
    waId,
    sourceType: "youtube",
    sourceUrl: url,
    filename: "media_audio.wav",
    language,
  });

  await phase(wt("stageDownload", lang), true);

  try {
    setWaActiveProcess(waId, {
      abortController,
      startTime: Date.now(),
      type: "youtube",
      language,
      sourceUrl: url,
    });

    const download = await downloadMediaAudio(url, undefined, abortController.signal);
    tmpWav = download.tmpWav;

    await phase(wt("stageTranscribe", lang));

    const result = await transcribeAudio(
      download.audioBuffer,
      "media_audio.wav",
      language,
      (pid) =>
        setWaActiveProcess(waId, {
          pid,
          abortController,
          startTime: Date.now(),
          type: "youtube",
          language,
          sourceUrl: url,
        }),
      undefined,
      abortController.signal
    );
    await unlink(tmpWav).catch(() => {});
    clearWaActiveProcess(waId);

    if (result.segments.length === 0) {
      await closeRequest(requestNumber, { status: "completed", completedAt: new Date() });
      await sendText(waId, wt("noSpeech", lang));
      return;
    }

    await finishResult(waId, result, targetLanguage, prefs, phase, requestNumber, {
      sourceType: "youtube",
      sourceUrl: url,
    });
  } catch (err) {
    clearWaActiveProcess(waId);
    await unlink(tmpWav).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    logger.error("WhatsApp media link error", { error: message, waId, url, requestNumber });
    await closeRequest(requestNumber, { status: "error", errorMessage: message });
    await sendText(waId, `❌ ${shortError(err)}`);
  }
}

/**
 * Clean up, translate if asked, persist and deliver. Kept in one place so the
 * media and link flows cannot drift apart in what the user finally receives.
 */
async function finishResult(
  waId: string,
  result: TranscriptionResult,
  targetLanguage: SupportedLanguage | undefined,
  prefs: WaUserPreferences,
  phase: (label: string, withStop?: boolean) => Promise<void>,
  requestNumber: number | undefined,
  meta: { sourceType: string; sourceUrl?: string; messageId?: string }
): Promise<void> {
  const lang = prefs.interfaceLanguage;

  const cleanup = await cleanupTranscription(result.text, result.language);
  const cleanedText = cleanup.cleanedText;

  const quality = detectTranscriptionIssues(cleanedText, result.language, result.segments);
  if (quality.isSuspicious) {
    logger.warn("WhatsApp transcription quality flags", { waId, flags: quality.flags });
  }

  await closeRequest(requestNumber, {
    status: "completed",
    fullText: cleanedText,
    segmentsJson: result.segments,
    provider: result.provider,
    model: result.model,
    gpu: result.gpu,
    completedAt: new Date(),
  });

  const sourceLabel = LANGUAGE_LABELS[result.language as SupportedLanguage] ?? result.language;

  // Translation requested and meaningful: the translated text is the deliverable,
  // exactly as in the Telegram bot.
  if (targetLanguage && targetLanguage !== result.language && cleanedText.trim()) {
    await phase(wt("translating", lang));
    try {
      const translation = await translateText({
        text: cleanedText,
        targetLang: targetLanguage,
        sourceLang: result.language,
        sourceUrl: meta.sourceUrl,
        sourceType: meta.sourceType,
      });

      const targetLabel = LANGUAGE_LABELS[targetLanguage] ?? targetLanguage;
      const shownNumber = translation.requestId ?? requestNumber;
      const warnings = [cleanup.warning, translation.warning].filter(Boolean);
      const warningNote = warnings.length ? `\n\n⚠️ ${warnings.join(" ")}` : "";
      const header = `*${targetLabel}*${shownNumber ? ` #${shownNumber}` : ""}`;

      await deliver(
        waId,
        lang,
        `${header}${warningNote}\n\n${translation.translatedText}`,
        `translation_${Date.now()}.txt`,
        `${targetLabel}${shownNumber ? ` #${shownNumber}` : ""}`
      );
      await sendResultFeedbackPrompt(waId, lang, shownNumber);
      return;
    } catch (err) {
      logger.error("WhatsApp translation failed, falling back to transcription", {
        error: err instanceof Error ? err.message : String(err),
        waId,
        targetLanguage,
      });
      await sendText(waId, wt("translationFailed", lang, { error: shortError(err) }));
      // Fall through: the transcription is still worth delivering.
    }
  }

  const warningHeader = cleanup.warning ? `\n\n⚠️ ${cleanup.warning}` : "";
  const header = `*${sourceLabel}*${requestNumber ? ` #${requestNumber}` : ""}`;
  const subtitles = formatSubtitles(result.segments);
  const fileContent = `${sourceLabel}${warningHeader}\n\n${cleanedText}\n\n---\n\n${subtitles}`;

  await deliver(
    waId,
    lang,
    `${header}${warningHeader}\n\n${cleanedText}`,
    `transcription_${Date.now()}.txt`,
    `${sourceLabel}${requestNumber ? ` #${requestNumber}` : ""}`,
    fileContent
  );
  await sendResultFeedbackPrompt(waId, lang, requestNumber);
}

/**
 * Deliver a result as a chat message when it is short enough to read in place,
 * and as a .txt document otherwise. `fileContent` lets the caller attach a
 * richer version (transcript plus timecoded subtitles) than the inline text.
 */
async function deliver(
  waId: string,
  lang: SupportedLanguage,
  inlineText: string,
  filename: string,
  caption: string,
  fileContent?: string
): Promise<void> {
  if (inlineText.length <= INLINE_RESULT_LIMIT) {
    await sendText(waId, inlineText);
    // Timecoded subtitles are only useful as a file; send them alongside the
    // short inline text rather than instead of it.
    if (fileContent) {
      await sendDocument(waId, Buffer.from(fileContent, "utf-8"), filename, caption).catch((err) =>
        logger.warn("Failed to send WhatsApp subtitles document", {
          error: err instanceof Error ? err.message : String(err),
          waId,
        })
      );
    }
    return;
  }

  if (inlineText.length <= WA_TEXT_FILE_THRESHOLD) {
    await sendText(waId, inlineText);
    if (fileContent) {
      await sendDocument(waId, Buffer.from(fileContent, "utf-8"), filename, caption).catch(() => {});
    }
    return;
  }

  await sendText(waId, waText("documentTooLargeForWhatsApp", lang));
  await sendDocument(waId, Buffer.from(fileContent ?? inlineText, "utf-8"), filename, caption);
}

async function processTextTranslation(
  waId: string,
  text: string,
  targetLang: SupportedLanguage,
  prefs: WaUserPreferences
): Promise<void> {
  const lang = prefs.interfaceLanguage;
  await sendText(waId, `⏳ ${wt("translating", lang)}`);

  try {
    const result = await translateText({
      text,
      targetLang,
      sourceType: "whatsapp_text",
    });

    const shownNumber = result.requestId;
    const header = `*${LANGUAGE_LABELS[targetLang] ?? targetLang}*${shownNumber ? ` #${shownNumber}` : ""}`;
    await deliver(
      waId,
      lang,
      `${header}\n\n${result.translatedText}`,
      `translation_${Date.now()}.txt`,
      shownNumber ? `#${shownNumber}` : "translation"
    );
    await sendResultFeedbackPrompt(waId, lang, shownNumber);
  } catch (err) {
    logger.error("WhatsApp text translation failed", {
      error: err instanceof Error ? err.message : String(err),
      waId,
    });
    await sendText(waId, wt("translationFailed", lang, { error: shortError(err) }));
  }
}

async function stopActiveProcess(waId: string, prefs: WaUserPreferences): Promise<void> {
  const lang = prefs.interfaceLanguage;
  const active = getWaActiveProcess(waId);

  if (!active) {
    await sendText(waId, wt("nothingToStop", lang));
    return;
  }

  try {
    active.abortController?.abort();
    if (active.pid) process.kill(active.pid, "SIGTERM");
  } catch (err) {
    logger.warn("Failed to kill WhatsApp process", {
      error: err instanceof Error ? err.message : String(err),
      pid: active.pid,
      waId,
    });
  }

  clearWaActiveProcess(waId);
  await sendText(waId, `🛑 ${wt("processingStopped", lang)}`);
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

interface PendingFeedbackText {
  feedbackId?: number;
  issueRequestNumber?: number;
  expiresAt: number;
}

const pendingFeedbackText = new Map<string, PendingFeedbackText>();
const FEEDBACK_COMMENT_WINDOW_MS = 10 * 60 * 1000;

function setPendingFeedbackComment(waId: string, feedbackId: number): void {
  pendingFeedbackText.set(waId, { feedbackId, expiresAt: Date.now() + FEEDBACK_COMMENT_WINDOW_MS });
}

function setPendingIssueReport(waId: string, requestNumber?: number): void {
  pendingFeedbackText.set(waId, {
    issueRequestNumber: requestNumber,
    expiresAt: Date.now() + FEEDBACK_COMMENT_WINDOW_MS,
  });
}

function takePendingFeedbackText(waId: string): PendingFeedbackText | undefined {
  const entry = pendingFeedbackText.get(waId);
  if (!entry) return undefined;
  pendingFeedbackText.delete(waId);
  if (entry.expiresAt < Date.now()) return undefined;
  return entry;
}

async function recordFeedback(params: {
  waId: string;
  requestNumber?: number;
  rating: "up" | "down" | "issue";
  comment?: string;
  interfaceLang: string;
}): Promise<FeedbackEntry | undefined> {
  // The number may belong to a transcription or to a plain text translation;
  // both draw from the same sequence, so try one and then the other.
  let context: Awaited<ReturnType<typeof getTranscriptionRequestByNumber>> = null;
  let translation: Awaited<ReturnType<typeof findTranslationRequestByNumber>> = null;
  if (params.requestNumber) {
    context = await getTranscriptionRequestByNumber(params.requestNumber).catch(() => null);
    if (!context) {
      translation = await findTranslationRequestByNumber(params.requestNumber).catch(() => null);
    }
  }

  try {
    const entry = await createFeedback({
      requestNumber: params.requestNumber ?? null,
      source: "whatsapp",
      rating: params.rating,
      comment: params.comment ?? null,
      whatsappWaId: params.waId,
      sourceType: context?.source_type ?? translation?.source_type ?? null,
      sourceUrl: context?.source_url ?? translation?.source_url ?? null,
      sourceLang: context?.language ?? translation?.source_lang ?? null,
      targetLang: translation?.target_lang ?? null,
      provider: context?.provider ?? translation?.provider ?? null,
      model: context?.model ?? translation?.model ?? null,
      interfaceLang: params.interfaceLang,
    });
    logger.info("WhatsApp feedback recorded", {
      feedbackId: entry.id,
      rating: params.rating,
      requestNumber: params.requestNumber,
    });
    if (params.rating !== "up") void notifyAdminFeedback(entry);
    return entry;
  } catch (err) {
    logger.error("Failed to record WhatsApp feedback", {
      error: err instanceof Error ? err.message : String(err),
      waId: params.waId,
    });
    return undefined;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Alerts reach the admin over Telegram, so they are written in HTML. */
async function notifyAdminFeedback(entry: FeedbackEntry, isFollowUp = false): Promise<void> {
  if (entry.rating !== "down" && entry.rating !== "issue") return;

  const header =
    entry.rating === "issue"
      ? "🛠 <b>Сообщение о проблеме (WhatsApp)</b>"
      : "👎 <b>Негативный отзыв (WhatsApp)</b>";
  const lines = [
    isFollowUp ? "💬 <b>Комментарий к отзыву (WhatsApp)</b>" : header,
    entry.request_number ? `Запрос: #${entry.request_number}` : "Запрос: —",
    `От: +${entry.whatsapp_wa_id ?? "—"}`,
    entry.category ? `Причина: ${entry.category}` : null,
    entry.source_lang ? `Язык: ${entry.source_lang}` : null,
    entry.provider || entry.model ? `Движок: ${entry.provider ?? "?"} / ${entry.model ?? "?"}` : null,
    entry.source_url ? `Ссылка: ${escapeHtml(entry.source_url)}` : null,
    entry.comment ? `\n«${escapeHtml(entry.comment)}»` : null,
  ].filter(Boolean);

  await sendAdminAlert(`wa-feedback-${entry.id}${isFollowUp ? "-comment" : ""}`, lines.join("\n"), 0);
}

// Segments are only used for the subtitle file; exported for tests.
export type { TranscriptionSegment };

// ---------------------------------------------------------------------------
// Alternative Providers Webhooks
// ---------------------------------------------------------------------------

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
  // Twilio sends a POST with form-urlencoded body
  const body = req.body;
  if (!body || !body.From) {
    res.sendStatus(200);
    return;
  }

  const fromNumber = body.From.replace("whatsapp:", "");
  const messageId = body.MessageSid;
  const profileName = body.ProfileName;
  const numMedia = parseInt(body.NumMedia || "0", 10);
  
  let msgType: WhatsAppMessageType = "text";
  if (numMedia > 0) {
    const contentType = body.MediaContentType0 || "";
    if (contentType.startsWith("audio/")) msgType = "audio";
    else if (contentType.startsWith("video/")) msgType = "video";
    else msgType = "document";
  }

  const msg: WhatsAppMessage = {
    id: messageId,
    from: fromNumber,
    timestamp: String(Date.now()), // Not provided in same format by Twilio
    type: msgType,
  };

  if (numMedia > 0) {
    const media: WhatsAppMedia = {
      id: body.MediaUrl0, // For Twilio, we use the URL directly as media ID
      mime_type: body.MediaContentType0,
    };
    if (msgType === "audio") msg.audio = media;
    else if (msgType === "video") msg.video = media;
    else msg.document = media;
  } else {
    msg.text = { body: body.Body || "" };
  }

  // Acknowledge webhook before processing
  res.sendStatus(200);
  
  if (!isWhatsAppEnabled()) return;

  try {
    await handleMessage(msg, profileName);
  } catch (err) {
    logger.error("Error processing Twilio WhatsApp message", {
      error: err instanceof Error ? err.message : String(err),
      messageId: msg.id,
    });
  }
}

export async function handleGreenApiWebhook(req: Request, res: Response): Promise<void> {
  res.sendStatus(200); // Acknowledge webhook immediately

  if (!isWhatsAppEnabled()) return;

  const body = req.body;
  if (body?.typeWebhook !== "incomingMessageReceived") return;

  const idMessage = body.idMessage;
  const chatId = body.senderData?.chatId;
  const fromNumber = chatId ? chatId.split("@")[0] : "";
  const profileName = body.senderData?.senderName;

  const msgData = body.messageData;
  if (!msgData) return;

  const typeMessage = msgData.typeMessage;

  let msgType: WhatsAppMessageType = "unsupported";
  let textBody = "";
  let media: WhatsAppMedia | undefined = undefined;

  if (typeMessage === "textMessage") {
    msgType = "text";
    textBody = msgData.textMessageData?.textMessage || "";
  } else if (typeMessage === "extendedTextMessage") {
    msgType = "text";
    textBody = msgData.extendedTextMessageData?.text || "";
  } else if (typeMessage === "audioMessage" || typeMessage === "videoMessage" || typeMessage === "documentMessage") {
    if (typeMessage === "audioMessage") msgType = "audio";
    else if (typeMessage === "videoMessage") msgType = "video";
    else msgType = "document";

    media = {
      id: msgData.fileMessageData?.downloadUrl, // using downloadUrl as ID
      mime_type: msgData.fileMessageData?.mimeType,
      filename: msgData.fileMessageData?.fileName,
    };
  } else if (typeMessage === "quotedMessage") {
    // Basic fallback for quoted texts
    msgType = "text";
    textBody = msgData.quotedMessage?.textMessage || "";
  }

  const msg: WhatsAppMessage = {
    id: idMessage,
    from: fromNumber,
    timestamp: String(Date.now()),
    type: msgType,
  };

  if (msgType === "text") msg.text = { body: textBody };
  else if (msgType === "audio") msg.audio = media;
  else if (msgType === "video") msg.video = media;
  else if (msgType === "document") msg.document = media;

  try {
    await handleMessage(msg, profileName);
  } catch (err) {
    logger.error("Error processing Green-API WhatsApp message", {
      error: err instanceof Error ? err.message : String(err),
      messageId: msg.id,
    });
  }
}
