/**
 * Meta WhatsApp Cloud API webhook payloads.
 *
 * Only the fields TilTap actually reads are typed. The Graph API sends more
 * (context, referral, pricing details on statuses); anything not listed here is
 * ignored on purpose rather than being missing.
 */

export interface WhatsAppWebhookBody {
  object: string;
  entry?: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes?: WhatsAppChange[];
}

export interface WhatsAppChange {
  field: string; // "messages"
  value: WhatsAppChangeValue;
}

export interface WhatsAppChangeValue {
  messaging_product: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  errors?: { code: number; title: string; message?: string }[];
}

export interface WhatsAppContact {
  wa_id: string;
  profile?: { name?: string };
}

export type WhatsAppMessageType =
  | "text"
  | "audio"
  | "voice"
  | "video"
  | "document"
  | "image"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "button"
  | "reaction"
  | "order"
  | "system"
  | "unsupported";

export interface WhatsAppMessage {
  id: string;
  from: string; // wa_id of the sender
  timestamp: string;
  type: WhatsAppMessageType;
  text?: { body: string };
  audio?: WhatsAppMedia;
  voice?: WhatsAppMedia;
  video?: WhatsAppMedia;
  document?: WhatsAppMedia;
  image?: WhatsAppMedia;
  interactive?: WhatsAppInteractiveReply;
  button?: { text?: string; payload?: string };
  errors?: { code: number; title: string; message?: string }[];
}

export interface WhatsAppMedia {
  id: string;
  mime_type?: string;
  sha256?: string;
  filename?: string;
  caption?: string;
  voice?: boolean;
}

export interface WhatsAppInteractiveReply {
  type: "button_reply" | "list_reply" | string;
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
}

export interface WhatsAppStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message?: string }[];
}

/** Reply button as accepted by the interactive `button` message type. */
export interface WhatsAppButton {
  id: string;
  title: string;
}

/** Row of an interactive `list` message. */
export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}
