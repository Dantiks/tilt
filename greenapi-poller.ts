import "dotenv/config";

// Green-API counterpart of poller.ts: pulls queued notifications over the HTTP
// API and replays them against the local webhook route, so the WhatsApp bot can
// be developed without exposing a public callback URL.
//
// Requires the instance settings incomingWebhook/outgoingMessageWebhook = "yes"
// with an EMPTY webhookUrl — that is what makes Green-API queue notifications
// for receiveNotification instead of pushing them somewhere.
const ID_INSTANCE = process.env.GREEN_API_ID_INSTANCE ?? "";
const API_TOKEN = process.env.GREEN_API_API_TOKEN_INSTANCE ?? "";
const WEBHOOK_URL = process.env.TILTAP_WHATSAPP_WEBHOOK_URL ?? "http://localhost:3200/webhook/whatsapp/greenapi";
const BASE = "https://api.green-api.com";

if (!ID_INSTANCE || !API_TOKEN) {
  console.error("[WA Poller] GREEN_API_ID_INSTANCE and GREEN_API_API_TOKEN_INSTANCE must be set in .env.");
  process.exit(1);
}

function apiUrl(method: string): string {
  return `${BASE}/waInstance${ID_INSTANCE}/${method}/${API_TOKEN}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface Notification {
  receiptId: number;
  body: { typeWebhook?: string };
}

async function deleteNotification(receiptId: number): Promise<void> {
  // Note the argument order: unlike every other method, deleteNotification takes
  // the receipt id AFTER the token. Getting it wrong returns 401 and the
  // notification stays at the head of the queue, blocking every message behind
  // it, so a failure here has to be loud.
  try {
    const res = await fetch(`${BASE}/waInstance${ID_INSTANCE}/deleteNotification/${API_TOKEN}/${receiptId}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error("[WA Poller] Failed to delete notification", receiptId, "- HTTP", res.status, await res.text());
    }
  } catch (err) {
    console.error("[WA Poller] Failed to delete notification", receiptId, (err as Error).message);
  }
}

async function main() {
  const state = await fetch(apiUrl("getStateInstance"), { signal: AbortSignal.timeout(15000) })
    .then((r) => r.json() as Promise<{ stateInstance?: string }>)
    .catch(() => ({ stateInstance: undefined }));

  if (state.stateInstance !== "authorized") {
    console.warn(`[WA Poller] Instance state is "${state.stateInstance}". Scan the QR in the Green-API console first; polling anyway.`);
  }

  console.log("[WA Poller] Started. Forwarding to", WEBHOOK_URL);

  // A notification that cannot be deleted is redelivered forever and replays the
  // same message at the bot on every pass, so bail out rather than spin.
  let lastReceiptId = 0;
  let repeats = 0;

  while (true) {
    try {
      // receiveNotification long-polls for up to ~20s and returns null when idle.
      const res = await fetch(apiUrl("receiveNotification"), { signal: AbortSignal.timeout(40000) });
      const notification = (await res.json().catch(() => null)) as Notification | null;

      if (!notification?.receiptId) {
        continue;
      }

      const { receiptId, body } = notification;

      repeats = receiptId === lastReceiptId ? repeats + 1 : 0;
      lastReceiptId = receiptId;
      if (repeats >= 3) {
        console.error(`[WA Poller] Notification ${receiptId} keeps coming back — it is not being deleted. Stopping instead of replaying it at the bot.`);
        process.exit(1);
      }

      console.log("[WA Poller] Notification", receiptId, body?.typeWebhook);

      try {
        const forwardRes = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });
        if (!forwardRes.ok) {
          console.error("[WA Poller] Forward failed:", forwardRes.status, await forwardRes.text());
        }
      } catch (err) {
        console.error("[WA Poller] Forward error:", (err as Error).message);
      }

      // Drop it either way: a notification left in the queue is redelivered
      // forever and blocks everything behind it.
      await deleteNotification(receiptId);
    } catch (err) {
      console.error("[WA Poller] Poll error:", (err as Error).message);
      await sleep(5000);
    }
  }
}

main().catch((err) => {
  console.error("[WA Poller] Fatal error:", err);
  process.exit(1);
});
