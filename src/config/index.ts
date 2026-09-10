import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  TELEGRAM_BOT_TOKEN: z.string().optional().or(z.literal("")),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // ---- WhatsApp Cloud API (Meta) ------------------------------------------
  // Permanent system-user token from the Meta app. Empty = WhatsApp disabled;
  // the webhook then answers 200 without doing anything, as it did before.
  WHATSAPP_ACCESS_TOKEN: z.string().optional().or(z.literal("")),
  // Phone number ID of the WABA sender (not the phone number itself).
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().or(z.literal("")),
  // Echoed back during the GET webhook verification handshake.
  WHATSAPP_VERIFY_TOKEN: z.string().optional().or(z.literal("")),
  // App secret used to check the X-Hub-Signature-256 header. Strongly
  // recommended: without it anyone who learns the URL can post fake updates.
  WHATSAPP_APP_SECRET: z.string().optional().or(z.literal("")),
  WHATSAPP_API_VERSION: z.string().optional().or(z.literal("")).default("v21.0"),
  WHATSAPP_GRAPH_URL: z.string().url().optional().or(z.literal("")).default("https://graph.facebook.com"),

  // ---- WhatsApp Multi-Provider --------------------------------------------
  WHATSAPP_PROVIDER: z.enum(["meta", "twilio", "greenapi"]).default("meta"),
  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional().or(z.literal("")),
  TWILIO_AUTH_TOKEN: z.string().optional().or(z.literal("")),
  TWILIO_WHATSAPP_NUMBER: z.string().optional().or(z.literal("")),
  // Green-API
  GREEN_API_ID_INSTANCE: z.string().optional().or(z.literal("")),
  GREEN_API_API_TOKEN_INSTANCE: z.string().optional().or(z.literal("")),

  // ---- Public website -----------------------------------------------------
  // Used to build the "chat with the bot" links. A channel whose handle is
  // missing is simply not advertised on the site.
  TELEGRAM_BOT_USERNAME: z.string().optional().or(z.literal("")),
  WHATSAPP_CONTACT_PHONE: z.string().optional().or(z.literal("")),
  // Numbers the bot must never message, comma-separated digits. A blocked
  // number is also ignored on the way in, so nothing it sends can produce a
  // reply through some other path.
  WHATSAPP_BLOCKED_NUMBERS: z.string().optional().or(z.literal("")).default(""),
  // When true the bot ignores a chat until it sends /start. Off by default:
  // the bot answers everyone. The opening word still sets the language either
  // way, so turning this on does not change how a conversation begins.
  WHATSAPP_REQUIRE_START: z.string().optional().default("false").transform((v) => v === "true"),
  OPENAI_API_KEY: z.string().optional().or(z.literal("")),
  OPENAI_STT_MODEL: z.string().optional().or(z.literal("")).default("whisper-1"),
  TRANSLATION_MODULE_URL: z.string().url().optional().or(z.literal("")),
  LINGVA_TRANSLATE_URL: z.string().url().optional().or(z.literal("")).default("https://lingva.ml"),
  LINGVA_TRANSLATE_CHUNK_SIZE: z.string().default("2000").transform(Number),
  TILTAB_TRANSLATION_PROVIDER: z.enum(["lingva", "openai", "azure", "yandex", "mock", "auto"]).default("openai"),
  GROQ_API_KEY: z.string().optional().or(z.literal("")),
  GEMINI_API_KEY: z.string().optional().or(z.literal("")),


  ELEVENLABS_API_KEY: z.string().optional().or(z.literal("")),
  ELEVENLABS_MODEL_ID: z.string().optional().or(z.literal("")).default("scribe_v2"),
  TILTAB_STT_PROVIDER: z.enum(["openai", "local", "auto", "elevenlabs"]).default("local"),
  TILTAB_STT_SERVICE_URL: z.string().url().optional().or(z.literal("")),
  TILTAB_GPU_STT_URL: z.string().url().optional().or(z.literal("")),
  TILTAB_GPU_STT_API_KEY: z.string().optional().or(z.literal("")),
  TILTAB_GPU_STT_TIMEOUT_MS: z.string().default("600000").transform(Number),
  // Persistent GigaAM worker (gigaam_server.py) that keeps the model resident so
  // it is not reloaded on every request. When set, GigaAM languages are sent
  // here; on any failure the backend falls back to spawning transcribe_hybrid.py.
  TILTAB_GIGAAM_SERVER_URL: z.string().url().optional().or(z.literal("")),

  // Daniel's transcription module. Asynchronous: POST returns 202 with a job id,
  // the result is polled from /api/web/jobs/{id}. Recognition is serialised on
  // one machine there, so the ceiling has to cover a long job waiting its turn.
  TILTAB_MODULE_URL: z.string().url().optional().or(z.literal("")),
  TILTAB_MODULE_API_KEY: z.string().optional().or(z.literal("")),
  TILTAB_MODULE_POLL_MS: z.string().default("5000").transform(Number),
  TILTAB_MODULE_TIMEOUT_MS: z.string().default("1800000").transform(Number),
  TILTAB_GIGAAM_SERVER_TIMEOUT_MS: z.string().default("600000").transform(Number),
  TILTAB_GIGAAM_SERVER_LANGUAGES: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("ky,uz,ru")
    .transform((val) =>
      val
        ?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? ["ky", "uz", "ru"]
    ),
  TILTAB_GPU_STT_LANGUAGES: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("ru,en,uz,tg,ky,auto,multi")
    .transform((val) =>
      val
        ?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? ["ru", "en", "uz", "auto", "multi"]
    ),
  // Comma-separated list of language codes for which Groq Whisper may be used as a fallback.
  // Default is "en" because Groq Whisper quality drops significantly for non-English languages.
  TILTAB_GROQ_WHISPER_LANGUAGES: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("en")
    .transform((val) =>
      val
        ?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? ["en"]
    ),
  TILTAB_CLEANUP_PROVIDER: z.enum(["openai", "groq", "gemini", "none"]).default("openai"),
  TILTAB_CLEANUP_MODEL: z.string().optional().or(z.literal("")),
  // Enable LLM cleanup for non-Tajik languages. Tajik cleanup is always enabled unless provider is "none".
  TILTAB_CLEANUP_NON_TAJIK: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("1")
    .transform((v) => !v || ["1", "true", "yes", "on"].includes(v.toLowerCase())),
  TILTAB_TRANSLATION_MODEL: z.string().optional().or(z.literal("")).default("gpt-4o-mini"),
  TILTAB_REVIEW_ENABLED: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("true")
    .transform((v) => !v || ["1", "true", "yes", "on"].includes(v.toLowerCase())),
  TILTAB_REVIEW_PROVIDER: z.enum(["openai", "auto"]).default("openai"),
  TILTAB_REVIEW_MODEL: z.string().optional().or(z.literal("")),
  TILTAB_TRANSLATION_MAX_TOKENS: z.string().default("4096").transform(Number),
  TILTAB_REVIEW_MAX_TOKENS: z.string().default("4096").transform(Number),
  TILTAB_REVIEW_MAX_INPUT_CHARS: z.string().default("3000").transform(Number),
  AZURE_TRANSLATOR_KEY: z.string().optional().or(z.literal("")),
  AZURE_TRANSLATOR_REGION: z.string().optional().or(z.literal("")),
  AZURE_TRANSLATOR_ENDPOINT: z.string().url().optional().or(z.literal("")).default("https://api.cognitive.microsofttranslator.com"),
  YANDEX_TRANSLATE_API_KEY: z.string().optional().or(z.literal("")),
  YANDEX_TRANSLATE_FOLDER_ID: z.string().optional().or(z.literal("")),
  YANDEX_TRANSLATE_ENDPOINT: z.string().url().optional().or(z.literal("")).default("https://translate.api.cloud.yandex.net/translate/v2/translate"),
  TILTAB_ADMIN_TOKEN: z.string().optional().or(z.literal("")),
  // Telegram chat ID that receives operational alerts (e.g. all Cobalt
  // instances down). Leave empty to disable admin alerts.
  TILTAB_ADMIN_CHAT_ID: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      const n = v ? Number(v) : NaN;
      return Number.isFinite(n) ? n : undefined;
    }),
  // Background monitor that checks whether any Cobalt instance can still
  // resolve a video, and alerts the admin when they all fail.
  COBALT_HEALTHCHECK_ENABLED: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("true")
    .transform((v) => !v || ["1", "true", "yes", "on"].includes(v.toLowerCase())),
  COBALT_HEALTHCHECK_URL: z
    .string()
    .optional()
    .or(z.literal(""))
    .default("https://www.youtube.com/watch?v=jNQXAC9IVRw"),
  COBALT_HEALTHCHECK_INTERVAL_MINUTES: z.string().default("30").transform(Number),
  COBALT_ALERT_THROTTLE_HOURS: z.string().default("6").transform(Number),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  DATABASE_URL: isTest
    ? z.string().default("")
    : z.string().min(1, "DATABASE_URL is required"),
  PGLITE_DATA_DIR: z.string().default("./.pglite-data"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
