import { Router } from "express";
import { handleTelegramWebhook } from "../controllers/telegramController";
import { handleWhatsAppWebhook, handleWhatsAppVerify } from "../controllers/whatsappController";

const router = Router();

router.post("/telegram", handleTelegramWebhook);

// WhatsApp Cloud API: GET is Meta's subscription handshake, POST carries the
// actual messages and delivery statuses.
router.get("/whatsapp", handleWhatsAppVerify);
router.post("/whatsapp", handleWhatsAppWebhook);

export default router;
