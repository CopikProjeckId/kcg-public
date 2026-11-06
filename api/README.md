# Public API

Each game is served by its own HTTPS endpoint. The endpoints below are **public and unauthenticated**; they exist so wallets, aggregators and partners can read platform configuration. Everything else under `/v1/` requires a signed-in app user (a Google ID token issued to the KCG app) and is not part of the public surface.

| Game | Base URL |
|---|---|
| Red Light Green Light + lobby | `https://koreaculturegame.com` |
| Tug of War | `https://tug.koreaculturegame.com` |
| Younghee | `https://younghee.koreaculturegame.com` |
| Glass Bridge | `https://glass.koreaculturegame.com` |
| Spinning Top | `https://paengi.koreaculturegame.com` |
| Dalgona | `https://dalgona.koreaculturegame.com` |

## Endpoints

- `GET /config` — platform name/version, API path map, token name, point↔KCG ratio, referral/ad reward amounts, exchange open flag.
- `GET /config_to_lobby` (main server only) — lobby banner, the game list (name, image, open flag, `game_key`, modes, orientation), social links.

Full schema: [`openapi.yaml`](openapi.yaml).

## Conventions

- JSON over HTTPS; `Cache-Control: no-cache` on HTML, immutable caching on hashed assets.
- Unknown API paths return `404 text/plain`; the SPA fallback serves HTML only for page navigations.
- Authenticated routes answer `401` without a valid token and `403 {"code":"APP_FEATURE_DISABLED"}` when an account calls a feature that is not available in the app.
