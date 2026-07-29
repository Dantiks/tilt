import { query, queryOne } from "../connection";

export interface WhatsAppPendingActionRow {
  id: number;
  wa_id: string;
  action_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  buffer: Buffer | null;
  created_at: Date;
}

export async function getWhatsAppPendingAction(waId: string): Promise<WhatsAppPendingActionRow | null> {
  return queryOne<WhatsAppPendingActionRow>(
    "SELECT * FROM whatsapp_pending_actions WHERE wa_id = $1",
    [waId]
  );
}

export async function setWhatsAppPendingAction(
  waId: string,
  actionId: string,
  actionType: string,
  payload: Record<string, unknown>,
  buffer?: Buffer
): Promise<WhatsAppPendingActionRow> {
  return queryOne<WhatsAppPendingActionRow>(
    `INSERT INTO whatsapp_pending_actions (wa_id, action_id, action_type, payload, buffer)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (wa_id)
     DO UPDATE SET action_id = EXCLUDED.action_id,
                   action_type = EXCLUDED.action_type,
                   payload = EXCLUDED.payload,
                   buffer = EXCLUDED.buffer,
                   created_at = NOW()
     RETURNING *`,
    [waId, actionId, actionType, JSON.stringify(payload), buffer ?? null]
  ) as Promise<WhatsAppPendingActionRow>;
}

export async function deleteWhatsAppPendingAction(waId: string): Promise<void> {
  await query("DELETE FROM whatsapp_pending_actions WHERE wa_id = $1", [waId]);
}

export async function listWhatsAppPendingActions(): Promise<WhatsAppPendingActionRow[]> {
  return query<WhatsAppPendingActionRow>("SELECT * FROM whatsapp_pending_actions");
}

export async function deleteExpiredWhatsAppPendingActions(ttlMs: number): Promise<void> {
  await query(
    "DELETE FROM whatsapp_pending_actions WHERE created_at < NOW() - INTERVAL '1 millisecond' * $1",
    [ttlMs]
  );
}
