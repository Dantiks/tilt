import { config } from "../../config";
import { MetaWhatsAppProvider } from "./metaProvider";
import { TwilioWhatsAppProvider } from "./twilioProvider";
import { GreenApiWhatsAppProvider } from "./greenApiProvider";
import type { IWhatsAppProvider } from "./types";

let provider: IWhatsAppProvider;

switch (config.WHATSAPP_PROVIDER) {
  case "twilio":
    provider = new TwilioWhatsAppProvider();
    break;
  case "greenapi":
    provider = new GreenApiWhatsAppProvider();
    break;
  case "meta":
  default:
    provider = new MetaWhatsAppProvider();
    break;
}

export const whatsappProvider = provider;
export * from "./types";
