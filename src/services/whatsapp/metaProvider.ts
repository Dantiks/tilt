import { logger } from "../../utils/logger";
import { config } from "../../config";
import type { WhatsAppButton, WhatsAppListRow } from "../../types/whatsapp";
import type { DownloadedMedia, IWhatsAppProvider } from "./types";

const WA_MAX_MESSAGE_LENGTH = 4000;
const BUTTON_TITLE_MAX = 20;
const LIST_ROW_TITLE_MAX = 24;
const LIST_ROW_DESCRIPTION_MAX = 72;
const LIST_BUTTON_LABEL_MAX = 20;
const MAX_BUTTONS = 3;
const MAX_LIST_ROWS = 10;

function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

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

interface SendResponse {
  messages?: { id: string }[];
  error?: { message?: string; type?: string; code?: number; error_data?: { details?: string } };
}

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  isConfigured(): boolean {
    return Boolean(config.WHATSAPP_ACCESS_TOKEN && config.WHATSAPP_PHONE_NUMBER_ID);
  }

  private graphUrl(path: string): string {
    return `${config.WHATSAPP_GRAPH_URL}/${config.WHATSAPP_API_VERSION}/${path}`;
  }

  private async callGraph(body: Record<string, unknown>): Promise<string | undefined> {
    if (!this.isConfigured()) {
      logger.warn("WhatsApp send skipped: Meta bot is not configured");
      return undefined;
    }

    const res = await fetch(this.graphUrl(`${config.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });

    const data = (await res.json().catch(() => ({}))) as SendResponse;
    if (!res.ok || data.error) {
      const detail = data.error?.error_data?.details ?? data.error?.message ?? `HTTP ${res.status}`;
      logger.error("WhatsApp send failed (Meta)", { status: res.status, detail, type: body.type });
      throw new Error(`WhatsApp API error: ${detail}`);
    }
    return data.messages?.[0]?.id;
  }

  async sendText(waId: string, text: string, previewUrl = false): Promise<string | undefined> {
    let lastId: string | undefined;
    for (const chunk of splitMessage(text)) {
      lastId = await this.callGraph({
        to: waId,
        type: "text",
        text: { preview_url: previewUrl, body: chunk },
      });
    }
    return lastId;
  }

  async sendButtons(
    waId: string,
    body: string,
    buttons: WhatsAppButton[],
    options: { header?: string; footer?: string } = {}
  ): Promise<string | undefined> {
    if (buttons.length > MAX_BUTTONS) {
      logger.warn("Too many WhatsApp buttons, extra ones dropped", { count: buttons.length });
    }
    const trimmed = buttons.slice(0, MAX_BUTTONS).map((b) => ({
      type: "reply",
      reply: { id: b.id.slice(0, 256), title: truncate(b.title, BUTTON_TITLE_MAX) },
    }));

    return this.callGraph({
      to: waId,
      type: "interactive",
      interactive: {
        type: "button",
        ...(options.header ? { header: { type: "text", text: truncate(options.header, 60) } } : {}),
        body: { text: truncate(body, 1024) },
        ...(options.footer ? { footer: { text: truncate(options.footer, 60) } } : {}),
        action: { buttons: trimmed },
      },
    });
  }

  async sendList(
    waId: string,
    body: string,
    buttonLabel: string,
    rows: WhatsAppListRow[],
    options: { header?: string; footer?: string; sectionTitle?: string } = {}
  ): Promise<string | undefined> {
    if (rows.length > MAX_LIST_ROWS) {
      logger.warn("Too many WhatsApp list rows, extra ones dropped", { count: rows.length });
    }
    const trimmed = rows.slice(0, MAX_LIST_ROWS).map((row) => ({
      id: row.id.slice(0, 200),
      title: truncate(row.title, LIST_ROW_TITLE_MAX),
      ...(row.description ? { description: truncate(row.description, LIST_ROW_DESCRIPTION_MAX) } : {}),
    }));

    return this.callGraph({
      to: waId,
      type: "interactive",
      interactive: {
        type: "list",
        ...(options.header ? { header: { type: "text", text: truncate(options.header, 60) } } : {}),
        body: { text: truncate(body, 1024) },
        ...(options.footer ? { footer: { text: truncate(options.footer, 60) } } : {}),
        action: {
          button: truncate(buttonLabel, LIST_BUTTON_LABEL_MAX),
          sections: [{ title: truncate(options.sectionTitle ?? "TilTap", 24), rows: trimmed }],
        },
      },
    });
  }

  async uploadMedia(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mimeType);
    form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

    const res = await fetch(this.graphUrl(`${config.WHATSAPP_PHONE_NUMBER_ID}/media`), {
      method: "POST",
      headers: { Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}` },
      body: form,
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      throw new Error(`WhatsApp media upload failed (Meta): ${data.error?.message ?? "HTTP " + res.status}`);
    }
    return data.id;
  }

  async sendDocument(
    waId: string,
    buffer: Buffer,
    filename: string,
    caption?: string
  ): Promise<string | undefined> {
    const mediaId = await this.uploadMedia(buffer, filename, "text/plain");
    return this.callGraph({
      to: waId,
      type: "document",
      document: {
        id: mediaId,
        filename,
        ...(caption ? { caption: truncate(caption, 1024) } : {}),
      },
    });
  }

  async downloadMedia(mediaId: string): Promise<DownloadedMedia> {
    const metaRes = await fetch(this.graphUrl(mediaId), {
      headers: { Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}` },
    });
    const meta = (await metaRes.json().catch(() => ({}))) as {
      url?: string;
      mime_type?: string;
      file_size?: number;
      error?: { message?: string };
    };
    if (!metaRes.ok || !meta.url) {
      throw new Error(`WhatsApp media lookup failed (Meta): ${meta.error?.message ?? "HTTP " + metaRes.status}`);
    }

    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}` },
    });
    if (!fileRes.ok) {
      throw new Error(`WhatsApp media download failed (Meta): HTTP ${fileRes.status}`);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    logger.info("Downloaded media from WhatsApp (Meta)", { mediaId, sizeBytes: buffer.length });
    return {
      buffer,
      mimeType: meta.mime_type ?? "application/octet-stream",
      fileSize: meta.file_size ?? buffer.length,
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.callGraph({ status: "read", message_id: messageId });
    } catch (err) {
      logger.debug("markAsRead failed (Meta)", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}
