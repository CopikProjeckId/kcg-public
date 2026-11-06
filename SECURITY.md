# Security Policy

## Reporting a vulnerability

Please report security issues **privately** to **ceo@koreaculturegame.com** with the subject `SECURITY`. Include steps to reproduce, affected component (token contract, game server, Telegram mini app, Android app), and impact. We acknowledge reports within 3 business days and keep you informed until resolution.

Do not open public issues for security problems, and do not test against production accounts other than your own.

## Scope

In scope:
- KCG token contract `0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5` (BSC)
- Game servers under `*.koreaculturegame.com`
- Telegram mini apps served by `@korea_culture_game_bot`
- KCG Android app (`kcg.koreaculturegame`)

Out of scope: denial of service, social engineering, issues in third-party services (Telegram, Google Play, BNB Chain, exchanges).

## Token security model (summary)

- Fixed supply; the contract has no mint function.
- Single privileged role (`Ownable`); the owner is a Safe multisig — see [docs/security/](docs/security/).
- Independent assessment by CertiK (2025-12-01): no critical/major/medium/minor findings; 2 centralization and 2 informational notes, acknowledged and mitigated operationally — see [docs/audits/certik.md](docs/audits/certik.md).

## Game integrity

Game results and rewards are validated server-side: clients send input traces, servers re-run the deterministic judge and grant rewards. The judge used for Dalgona is published in [`packages/dalgona-judge`](packages/dalgona-judge/) so its rules can be inspected.
