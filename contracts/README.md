# KCG token contract

| | |
|---|---|
| Name / symbol | Korea Culture Game / `KCG` |
| Network | BNB Smart Chain mainnet (chain id 56) |
| Address | [`0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5`](https://bscscan.com/token/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5) |
| Standard | ERC-20 (BEP-20), OpenZeppelin `ERC20` + `Ownable` |
| Source file | `FixedSupplyToken.sol` — source verified on BscScan ([contract tab](https://bscscan.com/address/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5#code)) |
| Supply | 500,000,000,000 KCG minted once at deployment; **no mint function** |
| Decimals | see BscScan token page |
| Owner | Safe multisig — see [`docs/security/multisig.md`](../docs/security/multisig.md) |
| Audit | CertiK security assessment, final 2025-12-01 — see [`docs/audits/certik.md`](../docs/audits/certik.md) |

## Source

The Solidity source in this folder mirrors the code verified on BscScan. **The on-chain verified source is authoritative**; if this folder and BscScan ever differ, trust BscScan and open an issue.

- `FixedSupplyToken.sol` — the token (to be added from the verified source)
- `abi.json` — ABI as published by BscScan (to be added)

## Privileged functions

The only privileged role is the contract owner. What the owner can and cannot do, and how those actions are governed, is documented in [`docs/security/privileged-roles-and-governance.md`](../docs/security/privileged-roles-and-governance.md).

## Official addresses

Treasury, ecosystem, development, marketing, team, investor and advisor wallets are listed in the [official address registry](../docs/addresses/mainnet.md). Addresses published anywhere else are not official.
