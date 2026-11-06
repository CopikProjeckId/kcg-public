# KCG in the games

This page explains how the in-game currency relates to the on-chain KCG token.

## Two layers

1. **In-game KCG (game currency)** — earned by playing, stored in our game database, spent on in-game items, boosts and cosmetics. It is granted only after the server validates the play (for example, the Dalgona server re-judges the full needle trace before paying).
2. **On-chain KCG (BEP-20 token)** — the fixed-supply token on BNB Smart Chain documented in [tokenomics](../tokenomics/kcg-token.md). It lives in users' wallets and on exchanges.

## The app

The KCG Android app keeps KCG strictly as **game currency**: there is no wallet connection, exchange, swap or airdrop feature in the app, and the servers reject such requests for app accounts (`403 APP_FEATURE_DISABLED`). Cosmetics in the app are bought with **Cash**, a separate virtual currency purchased through Google Play billing and shared across all games. Nothing in the app is a way to acquire the on-chain token.

## On-chain token programmes

Any programme that connects in-game activity with on-chain KCG (reward campaigns, community distributions) is announced on the [official channels](https://korea-culture-game.gitbook.io/koreaculturegame-docs/social-media/channel) with its own rules, limits and eligibility, and runs outside the app. Official contract and treasury addresses are only those in the [address registry](../addresses/mainnet.md).

## Fairness

- Rewards per game are deterministic and published in the game UI (e.g. the Dalgona shape picker shows base reward and time limit).
- Server-side validation: traces, steps and taps are verified against the same rules the client shows. The Dalgona judge is open source in [`packages/dalgona-judge`](../../packages/dalgona-judge/).
- Energy and time limits bound the maximum earnable amount per account per day.
