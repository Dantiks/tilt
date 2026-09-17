import "dotenv/config";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";

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

/**
 * Only one poller may consume the notification queue. Two of them race for the
 * same notifications, so each message is delivered twice and the burst of
 * replies trips the provider's rate limit — from the outside the bot just goes
 * quiet. A stale file from a killed process is reclaimed.
 */
const LOCK_FILE = "greenapi-poller.lock";

function claimLock(): void {
  if (existsSync(LOCK_FILE)) {
    const pid = Number(readFileSync(LOCK_FILE, "utf-8").trim());
    let alive = false;
    try {
      process.kill(pid, 0); // signal 0 only tests for existence
      alive = true;
    } catch {
      alive = false;
    }
    if (alive) {
      console.error(`[WA Poller] Already running as pid ${pid}. Refusing to start a second one.`);
      process.exit(1);
    }
    console.warn(`[WA Poller] Reclaiming lock left by dead pid ${pid}.`);
  }
  writeFileSync(LOCK_FILE, String(process.pid));
  const release = () => {
    try {
      if (existsSync(LOCK_FILE) && readFileSync(LOCK_FILE, "utf-8").trim() === String(process.pid)) {
        unlinkSync(LOCK_FILE);
      }
    } catch {
      // Nothing useful to do while exiting.
    }
  };
  process.on("exit", release);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => {
      release();
      process.exit(0);
    });
  }
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
  claimLock();
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

      let reached = true;
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
        // The server is down, restarting, or otherwise unreachable. Deleting now
        // would throw the message away: Green-API holds it for us, so leave it
        // queued and try again once the server answers. Only a notification the
        // server has actually seen is safe to drop.
        reached = false;
        console.error("[WA Poller] Server unreachable, keeping message in the queue:", (err as Error).message);
      }

      if (!reached) {
        // Not a stuck notification, just a stopped server — do not count this
        // toward the repeat guard, which is there to catch undeletable ones.
        repeats = 0;
        lastReceiptId = 0;
        await sleep(10000);
        continue;
      }

      // Delivered: drop it. A notification left in the queue is redelivered
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
