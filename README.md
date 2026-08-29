# TilTap Backend

AI-powered multilingual transcription and translation backend for Telegram and WhatsApp bots.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/janatlk/tiltap)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your keys
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/BotFather) |
| `OPENAI_API_KEY` | Yes | From [OpenAI Platform](https://platform.openai.com) |
| `OPENAI_STT_MODEL` | No | OpenAI STT model (default: `whisper-1`) |
| `TILTAB_STT_PROVIDER` | No | `auto`, `openai`, or `local` (default: `auto`) |
| `TRANSLATION_MODULE_URL` | No | Daniel's translation module endpoint (leave empty for GPT fallback) |
| `WHATSAPP_ACCESS_TOKEN` | No | Meta permanent access token; empty disables the WhatsApp bot |
| `WHATSAPP_PHONE_NUMBER_ID` | No | Phone number ID of the WhatsApp sender |
| `WHATSAPP_VERIFY_TOKEN` | No | Echoed back during the webhook handshake |
| `WHATSAPP_APP_SECRET` | No | Verifies `X-Hub-Signature-256` on incoming webhooks |
| `TELEGRAM_BOT_USERNAME` | No | Shows the Telegram button on the website |
| `WHATSAPP_CONTACT_PHONE` | No | Shows the WhatsApp button on the website |
| `LOG_LEVEL` | No | `error`, `warn`, `info`, `debug` |

## Public website

The marketing site and the web app are static pages in `public/site`, served by
the same Express process:

| Path | What it is |
|------|------------|
| `/` | Landing page: what TilTap does, supported languages, links to both bots |
| `/app` | Web app: upload / media link / text translation, live progress, timecoded segments, TXT–SRT–VTT export |
| `/web/` | The original internal tool, unchanged |
| `/web/admin.html` | Admin panel |

Both pages speak the same five interface languages as the bots and follow the
system light/dark preference. `GET /api/site/config` tells the page which
channels are configured — set `TELEGRAM_BOT_USERNAME` and
`WHATSAPP_CONTACT_PHONE` to advertise the bots, or leave them empty to hide
those buttons.

## Setting up the Telegram Bot Webhook

1. Expose your local server (e.g., via [ngrok](https://ngrok.com)):
   ```bash
   ngrok http 3000
   ```

2. Set the webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://<your-ngrok-url>/webhook/telegram"}'
   ```

## Setting up the WhatsApp Bot

The WhatsApp bot uses the official **Meta WhatsApp Cloud API**. You need a Meta
Business account, a WhatsApp Business Account (WABA), and a sender phone number.

1. In the [Meta App Dashboard](https://developers.facebook.com/apps), create an
   app of type **Business** and add the **WhatsApp** product.
2. From *WhatsApp → API Setup*, copy the **Phone number ID** and generate a
   **permanent access token** for a system user (the 24-hour test token is fine
   for a first run, but it expires).
3. Fill in `.env`:
   ```
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_VERIFY_TOKEN=any-string-you-choose
   WHATSAPP_APP_SECRET=<App Dashboard → Settings → Basic → App secret>
   ```
4. Expose the server (ngrok locally, or your production domain) and register the
   callback URL under *WhatsApp → Configuration → Webhook*:
   - **Callback URL**: `https://<your-host>/webhook/whatsapp`
   - **Verify token**: the same `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **messages** field.
5. Message the sender number from your own WhatsApp to start a chat.

Leaving `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` empty keeps the bot
switched off: the webhook still answers `200`, and nothing else happens.

**What the bot does:** send a voice message, audio, video, document or a
YouTube/TikTok/Instagram Reels link. It asks for the spoken language (list),
shows a confirmation card with the language pair (Start / Languages / Cancel),
reports each processing phase with a Stop button, and returns the transcript —
inline when short, as a `.txt` when long — followed by 👍/👎/🛠 rating buttons.
Typing `menu`, `help`, `settings` or `stop` works in all five languages.

**Worth knowing:** WhatsApp allows at most 3 reply buttons and 10 list rows per
message, and sent messages cannot be edited — so progress arrives as a small
number of new messages rather than the Telegram bot's animated status line. The
usual 24-hour customer-service window applies: the bot can only reply freely
within 24 hours of the user's last message.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/site/config` | Which channels are configured (used by the website) |
| POST | `/webhook/telegram` | Receives Telegram updates |
| GET | `/webhook/whatsapp` | WhatsApp webhook verification handshake |
| POST | `/webhook/whatsapp` | Receives WhatsApp messages and statuses |
| POST | `/api/translate` | Translation proxy (for Ernan's integration) |

## Demo Flow

1. Send a **video** or **voice message** to your Telegram bot.
2. Bot replies with transcribed subtitles including timecodes.
3. Tap a language button to get the full text translated.

## Docker

```bash
docker build -t tiltab-backend .
docker run -p 3000:3000 --env-file .env tiltab-backend
```

## Deploy to Render

1. Click the **Deploy to Render** button above or create a new Blueprint from `render.yaml` in the Render dashboard.
2. Fill in the secret environment variables when prompted:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - Optional: `ELEVENLABS_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `TRANSLATION_MODULE_URL`
3. After the first deploy, set the Telegram webhook to your Render URL:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://tiltap.onrender.com/webhook/telegram"}'
   ```
4. (Optional) For automatic deploys on every push to `main`, add a Render deploy hook URL to your GitHub repository as `RENDER_DEPLOY_HOOK_URL`.

Production builds use the OpenAI Whisper API for STT, so the Docker image does not include local ML models.

## Project Structure

```
src/
  config/         # Environment validation
  controllers/    # HTTP request handlers (telegram, whatsapp, web, admin, site)
  db/             # Schema, migrations, repositories
  middleware/     # Express middleware
  routes/         # Route definitions
  services/       # Business logic (STT, translation, Telegram API, WhatsApp API)
  types/          # TypeScript interfaces
  utils/          # Logger, progress bar, shared media errors
public/
  site/           # Public landing page + web app
  web/            # Original internal web tool and admin panel
```

## License

Confidential — see project contract.
# tiltap
# j
# denchik
