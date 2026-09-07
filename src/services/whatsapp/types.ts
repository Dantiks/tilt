import type { WhatsAppButton, WhatsAppListRow } from "../../types/whatsapp";

export interface DownloadedMedia {
  buffer: Buffer;
  mimeType: string;
  fileSize: number;
}

export interface IWhatsAppProvider {
  /** Check if the provider is fully configured via environment variables */
  isConfigured(): boolean;
  
  /** Send a plain text message. Long messages may be split by the provider. */
  sendText(waId: string, text: string, previewUrl?: boolean): Promise<string | undefined>;
  
  /** Send up to 3 interactive buttons. */
  sendButtons(
    waId: string,
    body: string,
    buttons: WhatsAppButton[],
    options?: { header?: string; footer?: string; numberedHint?: string }
  ): Promise<string | undefined>;
  
  /** Send a list menu with rows. */
  sendList(
    waId: string,
    body: string,
    buttonLabel: string,
    rows: WhatsAppListRow[],
    options?: { header?: string; footer?: string; sectionTitle?: string; numberedHint?: string }
  ): Promise<string | undefined>;
  
  /** Send a document file. */
  sendDocument(
    waId: string,
    buffer: Buffer,
    filename: string,
    caption?: string
  ): Promise<string | undefined>;
  
  /** Download media sent by a user. */
  downloadMedia(mediaIdOrUrl: string): Promise<DownloadedMedia>;
  
  /** Mark a received message as read. */
  markAsRead(messageId: string): Promise<void>;

  /**
   * Map a bare numeric reply ("2") back to the action id it stood for.
   *
   * Providers that cannot send real interactive buttons render them as a
   * numbered text list, so the user's choice arrives as an ordinary text
   * message with no id attached. Those providers implement this to close the
   * loop; providers with native buttons leave it undefined.
   */
  resolveNumberedChoice?(waId: string, text: string): string | undefined;
}
