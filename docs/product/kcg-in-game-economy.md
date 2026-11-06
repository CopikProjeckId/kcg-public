# KCG in the games

This page explains how the in-game currency relates to the on-chain KCG token, and what differs between the Telegram and app versions.

## Two layers

1. **In-game KCG (game currency)** — earned by playing, stored in our game database, spent on in-game items, boosts and cosmetics. It is granted only after the server validates the play (for example, the Dalgona server re-judges the full needle trace before paying).
2. **On-chain KCG (BEP-20 token)** — the fixed-supply token on BNB Smart Chain documented in [tokenomics](../tokenomics/kcg-token.md). It lives in users' wallets and on exchanges.

## Telegram version

Telegram players can connect a wallet and use the exchange feature, which converts in-game KCG to on-chain KCG under published rates and limits (minimums, daily caps, anti-abuse checks). Rates and availability are operated by the project and shown in the app at the time of exchange; the **Exchange open/closed** state is exposed by the game server `GET /config` (`exchange_open`).

## Android app version

The Google Play version keeps KCG strictly as **game currency**: there is no wallet connection, exchange, TON/Stars or airdrop feature in the app, and the servers reject those endpoints for app accounts (`403 APP_FEATURE_DISABLED`). Cosmetics in the app are bought with **Cash**, a separate virtual currency purchased through Google Play billing and shared across all games.

## Fairness

- Rewards per game are deterministic and published in the game UI (e.g. the Dalgona shape picker shows base reward and time limit).
- Server-side validation: traces, steps and taps are verified against the same rules the client shows. The Dalgona judge is open source in [`packages/dalgona-judge`](../../packages/dalgona-judge/).
- Energy and time limits bound the maximum earnable amount per account per day.
