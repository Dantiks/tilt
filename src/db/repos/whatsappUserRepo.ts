import { query, queryOne } from "../connection";

export interface WhatsAppUser {
  id: number;
  wa_id: string;
  profile_name: string | null;
  preferred_language: string | null;
  interface_language: string | null;
  target_language: string | null;
  /** When this chat first sent /start. NULL means the bot must stay silent. */
  started_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getWhatsAppUser(waId: string): Promise<WhatsAppUser | null> {
  return queryOne<WhatsAppUser>("SELECT * FROM whatsapp_users WHERE wa_id = $1", [waId]);
}

export async function ensureWhatsAppUser(
  waId: string,
  defaults?: Partial<Pick<WhatsAppUser, "profile_name" | "preferred_language" | "interface_language" | "target_language">>
): Promise<WhatsAppUser> {
  const existing = await getWhatsAppUser(waId);
  if (existing) return existing;
  return queryOne<WhatsAppUser>(
    `INSERT INTO whatsapp_users (wa_id, profile_name, preferred_language, interface_language, target_language)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      waId,
      defaults?.profile_name ?? null,
      defaults?.preferred_language ?? "ru",
      defaults?.interface_language ?? "ru",
      defaults?.target_language ?? null,
    ]
  ) as Promise<WhatsAppUser>;
}

export async function updateWhatsAppUserPreferences(
  waId: string,
  prefs: Partial<Pick<WhatsAppUser, "profile_name" | "preferred_language" | "interface_language" | "target_language">>
): Promise<WhatsAppUser | null> {
  const sets: string[] = [];
  const values: (string | null)[] = [];
  let idx = 1;

  for (const key of ["profile_name", "preferred_language", "interface_language", "target_language"] as const) {
    if (prefs[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(prefs[key] ?? null);
    }
  }
  if (sets.length === 0) return getWhatsAppUser(waId);

  sets.push("updated_at = NOW()");
  values.push(waId);

  const updated = await queryOne<WhatsAppUser>(
    `UPDATE whatsapp_users SET ${sets.join(", ")} WHERE wa_id = $${idx} RETURNING *`,
    values
  );
  if (updated) return updated;

  // The row may not exist yet when a preference is set before the profile was
  // created (e.g. a webhook replay). Create it with the requested values.
  return ensureWhatsAppUser(waId, prefs);
}

/** Record that this chat has opted in, so the bot may answer it from now on. */
export async function markWhatsAppUserStarted(waId: string): Promise<void> {
  await query(
    "UPDATE whatsapp_users SET started_at = NOW(), updated_at = NOW() WHERE wa_id = $1 AND started_at IS NULL",
    [waId]
  );
}

export async function countWhatsAppUsers(): Promise<number> {
  const rows = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM whatsapp_users");
  return Number(rows[0]?.count ?? 0);
}
