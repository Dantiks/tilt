import { Router } from "express";
import { handleTelegramWebhook } from "../controllers/telegramController";
import { 
  handleWhatsAppWebhook, 
  handleWhatsAppVerify,
  handleTwilioWebhook,
  handleGreenApiWebhook 
} from "../controllers/whatsappController";

const router = Router();

router.post("/telegram", handleTelegramWebhook);

// WhatsApp Cloud API (Meta)
router.get("/whatsapp", handleWhatsAppVerify);
router.post("/whatsapp", handleWhatsAppWebhook);

// WhatsApp Twilio
router.post("/whatsapp/twilio", handleTwilioWebhook);

// WhatsApp Green-API
router.post("/whatsapp/greenapi", handleGreenApiWebhook);

export default router;
