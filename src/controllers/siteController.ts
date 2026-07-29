import type { Request, Response } from "express";
import { config } from "../config";
import { isWhatsAppEnabled } from "../services/whatsappService";

/**
 * Public, unauthenticated snapshot of what the deployment actually offers, so
 * the marketing site never advertises a channel that is not configured. It
 * exposes handles and feature flags only — no tokens, no provider names.
 */
export function getSiteConfig(_req: Request, res: Response): void {
  const telegramUser = config.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim();
  const whatsappPhone = config.WHATSAPP_CONTACT_PHONE?.replace(/\D/g, "");

  res.json({
    channels: {
      web: true,
      telegram: Boolean(config.TELEGRAM_BOT_TOKEN && telegramUser),
      whatsapp: isWhatsAppEnabled() && Boolean(whatsappPhone),
    },
    links: {
      telegram: telegramUser ? `https://t.me/${telegramUser}` : null,
      whatsapp: whatsappPhone ? `https://wa.me/${whatsappPhone}` : null,
    },
    languages: {
      transcription: ["ky", "tg", "uz", "ru", "en"],
      translation: ["ky", "tg", "uz", "ru", "en", "uz_cyrl"],
    },
    maxUploadMb: 25,
    sources: ["youtube", "tiktok", "instagram"],
  });
}
