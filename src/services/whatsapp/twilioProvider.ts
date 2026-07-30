import { logger } from "../../utils/logger";
import { config } from "../../config";
import type { WhatsAppButton, WhatsAppListRow } from "../../types/whatsapp";
import type { DownloadedMedia, IWhatsAppProvider } from "./types";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01/Accounts";

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  isConfigured(): boolean {
    return Boolean(
      config.TWILIO_ACCOUNT_SID &&
      config.TWILIO_AUTH_TOKEN &&
      config.TWILIO_WHATSAPP_NUMBER
    );
  }

  private async callTwilio(data: URLSearchParams): Promise<string | undefined> {
    if (!this.isConfigured()) {
      logger.warn("WhatsApp send skipped: Twilio is not configured");
      return undefined;
    }

    const url = `${TWILIO_API_BASE}/${config.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: data.toString(),
    });

    const resData = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!res.ok || resData.code) {
      logger.error("WhatsApp send failed (Twilio)", { status: res.status, detail: resData.message });
      throw new Error(`Twilio API error: ${resData.message}`);
    }
    return resData.sid;
  }

  async sendText(waId: string, text: string, previewUrl = false): Promise<string | undefined> {
    const params = new URLSearchParams({
      To: `whatsapp:+${waId}`,
      From: `whatsapp:${config.TWILIO_WHATSAPP_NUMBER}`,
      Body: text,
    });
    return this.callTwilio(params);
  }

  // Twilio requires pre-approved Content Templates for native WhatsApp buttons.
  // To avoid complex setup, we fallback to numbered text lists.
  async sendButtons(
    waId: string,
    body: string,
    buttons: WhatsAppButton[],
    options: { header?: string; footer?: string } = {}
  ): Promise<string | undefined> {
    let text = "";
    if (options.header) text += `*${options.header}*\n\n`;
    text += `${body}\n\n`;
    buttons.forEach((btn, idx) => {
      text += `${idx + 1}. ${btn.title}\n`;
    });
    text += `\n(Отправьте номер нужного варианта)`;
    if (options.footer) text += `\n\n_${options.footer}_`;

    return this.sendText(waId, text);
  }

  async sendList(
    waId: string,
    body: string,
    buttonLabel: string,
    rows: WhatsAppListRow[],
    options: { header?: string; footer?: string; sectionTitle?: string } = {}
  ): Promise<string | undefined> {
    let text = "";
    if (options.header) text += `*${options.header}*\n\n`;
    text += `${body}\n\n`;
    if (options.sectionTitle) text += `*${options.sectionTitle}*\n`;
    rows.forEach((row, idx) => {
      text += `${idx + 1}. ${row.title}`;
      if (row.description) text += ` - ${row.description}`;
      text += "\n";
    });
    text += `\n(Отправьте номер нужного варианта)`;
    if (options.footer) text += `\n\n_${options.footer}_`;

    return this.sendText(waId, text);
  }

  async sendDocument(
    waId: string,
    buffer: Buffer,
    filename: string,
    caption?: string
  ): Promise<string | undefined> {
    // Twilio requires a public URL for media. We can't easily upload a buffer directly to Twilio Messages API 
    // unless we host it locally and pass a MediaUrl. Since we don't have a public endpoint guaranteed for uploads, 
    // we will log a warning or send a text fallback for now, OR we can upload to a temporary file host.
    // However, since this is for returning large text files:
    if (buffer.length < 1600) {
      return this.sendText(waId, buffer.toString("utf-8"));
    }
    const params = new URLSearchParams({
      To: `whatsapp:+${waId}`,
      From: `whatsapp:${config.TWILIO_WHATSAPP_NUMBER}`,
      Body: caption || "Документ (файл слишком велик для отправки текстом)",
      // MediaUrl: requires public URL
    });
    logger.warn("Twilio provider currently doesn't support raw buffer uploads for documents. Sending text fallback.");
    return this.callTwilio(params);
  }

  async downloadMedia(mediaUrl: string): Promise<DownloadedMedia> {
    // Twilio provides a public-ish URL for media but requires HTTP Basic Auth to download securely.
    const auth = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString("base64");
    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!fileRes.ok) {
      throw new Error(`WhatsApp media download failed (Twilio): HTTP ${fileRes.status}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const mimeType = fileRes.headers.get("content-type") ?? "application/octet-stream";
    logger.info("Downloaded media from WhatsApp (Twilio)", { sizeBytes: buffer.length });
    return {
      buffer,
      mimeType,
      fileSize: buffer.length,
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    // Twilio doesn't support marking individual WhatsApp messages as read via API
    // They are automatically marked when received by the webhook.
  }
}
