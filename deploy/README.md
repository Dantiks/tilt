# Deploying the WhatsApp service

The WhatsApp bot runs on the Hetzner box (`tiltab-cx43-hel2`) as
`tiltap-whatsapp.service`, from `/opt/tiltap-wa`, on port 3200.

It is **not** the same program as the backend in `/opt/tiltap`. That one is a
different repository (`janatlk/tiltap`) and has no WhatsApp code at all; it
serves tiltap.kg, Telegram and the web app from port 3000. The two run side by
side and share the machine, Postgres and Cobalt, nothing else.

Keep them apart:

- **Separate database.** `tiltap_wa`, owned by its own role. PGlite is not used
  here — two processes opened the embedded copy at once on the laptop and
  corrupted it, losing the history.
- **No Telegram token.** `TELEGRAM_BOT_TOKEN` stays empty in
  `/opt/tiltap-wa/.env`. Two processes polling one bot would fight over every
  update.
- **Its own port.** 3200, reached only through nginx on the webhook path.

## Updating

```bash
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .keys --exclude .env \
  --exclude dist --exclude .pglite-data \
  ./ root@<host>:/opt/tiltap-wa/
ssh root@<host> 'cd /opt/tiltap-wa && npm ci && npm run build && systemctl restart tiltap-whatsapp'
```

## Pieces

| File | Installed as |
| --- | --- |
| `tiltap-whatsapp.service` | `/etc/systemd/system/tiltap-whatsapp.service` |
| `nginx-whatsapp.conf` | `/etc/nginx/snippets/tiltap-whatsapp.conf`, included from both HTTPS server blocks in `sites-enabled/tiltap` |

## Local services it depends on

| What | Where | Why not the public address |
| --- | --- | --- |
| Transcription module | `http://127.0.0.1:3000` | Served by the other backend. The raw STT container on 8000 does not expose `/api/web/*`. |
| Cobalt | `http://127.0.0.1:9011` | Our own instance, behind Cloudflare WARP, which is why YouTube resolves. Needs `COBALT_API_KEY`; its gate answers 401 without the `Api-Key` header. |

## Checking it

```bash
systemctl status tiltap-whatsapp
journalctl -u tiltap-whatsapp -n 50 --no-pager
# Meta's verification handshake; echoes the challenge back on success.
curl "https://tiltap.kg/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123"
```

WhatsApp stays disabled while `WHATSAPP_ACCESS_TOKEN` or
`WHATSAPP_PHONE_NUMBER_ID` is empty: the webhook answers 200 and does nothing.
That is deliberate, so the endpoint can be registered with Meta before the
number is live.
