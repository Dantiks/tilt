import { logger } from "../../utils/logger";
import { config } from "../../config";
import type { WhatsAppButton, WhatsAppListRow } from "../../types/whatsapp";
import type { DownloadedMedia, IWhatsAppProvider } from "./types";

const GREEN_API_BASE = "https://api.green-api.com";

export class GreenApiWhatsAppProvider implements IWhatsAppProvider {
  isConfigured(): boolean {
    return Boolean(config.GREEN_API_ID_INSTANCE && config.GREEN_API_API_TOKEN_INSTANCE);
  }

  private apiUrl(method: string): string {
    return `${GREEN_API_BASE}/waInstance${config.GREEN_API_ID_INSTANCE}/${method}/${config.GREEN_API_API_TOKEN_INSTANCE}`;
  }

  async sendText(waId: string, text: string, previewUrl = false): Promise<string | undefined> {
    if (!this.isConfigured()) {
      logger.warn("WhatsApp send skipped: Green-API is not configured");
      return undefined;
    }

    const res = await fetch(this.apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: `${waId}@c.us`,
        message: text,
        linkPreview: previewUrl,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { idMessage?: string; description?: string };
    if (!res.ok || !data.idMessage) {
      logger.error("WhatsApp send failed (Green-API)", { status: res.status, detail: data.description });
      throw new Error(`Green-API error: ${data.description}`);
    }
    return data.idMessage;
  }

  async sendButtons(
    waId: string,
    body: string,
    buttons: WhatsAppButton[],
    options: { header?: string; footer?: string } = {}
  ): Promise<string | undefined> {
    // Green API doesn't support interactive buttons reliably on all devices (often blocked by WhatsApp for unofficial APIs).
    // We fallback to numbered lists.
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
    const form = new FormData();
    form.append("chatId", `${waId}@c.us`);
    form.append("fileName", filename);
    if (caption) form.append("caption", caption);
    form.append("file", new Blob([new Uint8Array(buffer)]), filename);

    const res = await fetch(this.apiUrl("sendFileByUpload"), {
      method: "POST",
      body: form,
    });

    const data = (await res.json().catch(() => ({}))) as { idMessage?: string; description?: string };
    if (!res.ok || !data.idMessage) {
      throw new Error(`WhatsApp media upload failed (Green-API): ${data.description ?? "HTTP " + res.status}`);
    }
    return data.idMessage;
  }

  async downloadMedia(mediaUrl: string): Promise<DownloadedMedia> {
    // Green API provides direct download URLs in webhooks
    const fileRes = await fetch(mediaUrl);
    if (!fileRes.ok) {
      throw new Error(`WhatsApp media download failed (Green-API): HTTP ${fileRes.status}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const mimeType = fileRes.headers.get("content-type") ?? "application/octet-stream";
    logger.info("Downloaded media from WhatsApp (Green-API)", { sizeBytes: buffer.length });
    return {
      buffer,
      mimeType,
      fileSize: buffer.length,
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    // Green-API marks incoming messages as read automatically, or can be configured to do so.
  }
}
