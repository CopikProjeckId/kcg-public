<p align="center"><img src="brand/kcg_symbol_512.png" width="96" alt="KCG"></p>

<h1 align="center">Korea Culture Game (KCG)</h1>

<p align="center"><b>Reviving classic games, rewarding every play.</b><br>
Korean playground classics — Red Light Green Light, Glass Bridge, Dalgona, Tug of War and more — playable instantly on Telegram and in the KCG Android app, with a shared in-game currency (KCG) and the on-chain KCG token (BEP-20).</p>

<p align="center">
<a href="https://korea-culture-game.gitbook.io/koreaculturegame-docs">Docs (GitBook)</a> ·
<a href="https://koreaculturegame.com">Web</a> ·
<a href="https://t.me/korea_culture_game_bot">Telegram bot</a> ·
<a href="https://bscscan.com/token/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5">KCG on BscScan</a>
</p>

---

This repository is the **public reference** for the KCG project: token facts, official addresses, security and governance, product documentation, the public API surface, legal documents and the parts of our game code that are open source. The game servers and apps themselves are closed source.

## Token at a glance

| | |
|---|---|
| Symbol | `KCG` |
| Chain | BNB Smart Chain (BEP-20) |
| Contract | [`0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5`](https://bscscan.com/token/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5) |
| Max supply | 500,000,000,000 KCG, fixed — no minting |
| Standard | OpenZeppelin ERC20 + Ownable (`FixedSupplyToken.sol`) |
| Audit | CertiK, final report 2025-12-01 — [official summary](https://korea-culture-game.gitbook.io/koreaculturegame-docs/audits/certik) · [note](docs/audits/certik.md) |
| Treasury control | Safe multisig — [details](docs/security/multisig.md) |

Official addresses are listed **only** in [docs/addresses/mainnet.md](docs/addresses/mainnet.md). Any token not listed there is not KCG. See also the [SMG (TON) prototype disclosure](docs/disclosures/smg-ton.md).

## Repository map

| Path | What it is |
|---|---|
| [`docs/tokenomics/`](docs/tokenomics/kcg-token.md) | Supply, allocation, vesting schedule, circulating-supply model |
| [`docs/addresses/`](docs/addresses/mainnet.md) | Official contract and treasury wallet registry |
| [`docs/security/`](docs/security/) | Privileged-role model, multisig controls |
| [`docs/audits/`](docs/audits/certik.md) | Pointer to the official CertiK summary (full report available to verified parties) |
| [`docs/product/`](docs/product/games.md) | The games, how KCG is earned and spent, screenshots |
| [`docs/legal/`](docs/legal/) | Privacy policy, terms of service |
| [`contracts/`](contracts/README.md) | Token contract reference (source as verified on BscScan) |
| [`api/`](api/README.md) | Public, unauthenticated API surface (OpenAPI) |
| [`packages/dalgona-judge/`](packages/dalgona-judge/README.md) | **Open source**: the deterministic judge that scores Dalgona traces on client and server |
| [`brand/`](brand/) | Logo, symbol, store graphics |

## Products

- **Telegram Mini Apps** — every game runs inside Telegram via `@korea_culture_game_bot`.
- **KCG Android app** — one Google sign-in, all games in-app, a shared Cash wallet for cosmetics (Google Play, internal testing).
- **Games live today**: Red Light Green Light (single + 456-player live battle), Tug of War, Younghee, Glass Bridge (3D), Spinning Top (idle), Dalgona (3D carving, 14 stamp shapes), Rock Paper Scissors (daily event).

## Status

| Area | State |
|---|---|
| Token contract | Deployed on BSC mainnet, source verified, CertiK assessed |
| Games | Live in Telegram; Android app in Google Play internal testing |
| In-app Cash (Google Play billing) | In development |
| Docs | The [GitBook](https://korea-culture-game.gitbook.io/koreaculturegame-docs) is the primary source; this repo mirrors it with versioned history |

## Contact & community

- Official documentation: [korea-culture-game.gitbook.io/koreaculturegame-docs](https://korea-culture-game.gitbook.io/koreaculturegame-docs)
- Channels and social media: [Docs › Channel](https://korea-culture-game.gitbook.io/koreaculturegame-docs/social-media/channel)
- Business / listings: ceo@koreaculturegame.com
- Security disclosures: see [SECURITY.md](SECURITY.md)

## License

Documentation in `docs/` and `brand/` is © Korea Culture Game, provided for reference. Code under `packages/` is released under the [MIT License](LICENSE).
