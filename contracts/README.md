# KCG token contract

| | |
|---|---|
| Name / symbol | Korea Culture Game / `KCG` |
| Network | BNB Smart Chain mainnet (chain id 56) |
| Address | [`0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5`](https://bscscan.com/token/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5) |
| Contract | `FixedSupplyToken` — OpenZeppelin `ERC20` + `Ownable` (OpenZeppelin Contracts v5.0.0) |
| Source verification | BscScan **Exact Match**, Solidity Standard-JSON input ([contract tab](https://bscscan.com/address/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5#code)) |
| Compiler | solc `v0.8.28+commit.7893614a`, optimizer **off**, EVM `paris` ([settings.json](settings.json)) |
| Supply | 500,000,000,000 KCG minted once in the constructor; **no mint function** |
| Owner | Safe multisig — see [`docs/security/multisig.md`](../docs/security/multisig.md) |
| Audit | CertiK security assessment, final 2025-12-01 — [official summary](https://korea-culture-game.gitbook.io/koreaculturegame-docs/audits/certik) |

## Files

| Path | Role |
|---|---|
| [`FixedSupplyToken.sol`](FixedSupplyToken.sol) | The token (`contracts/FixedSupplyToken.sol` in the verified input) |
| [`@openzeppelin/contracts/`](@openzeppelin/contracts/) | The six OpenZeppelin v5.0.0 files exactly as submitted for verification |
| [`settings.json`](settings.json) | Compiler settings of the verified input |
| [`abi.json`](abi.json) | ABI (32 entries), compiled from this source with the settings above |

The source in this folder was taken from the BscScan verified input (2026-11-06) and checked: every file's content hash matches the verified copy, and compiling it with solc 0.8.28 reproduces the on-chain runtime bytecode byte for byte except for the 32-byte metadata hash in the trailer. **BscScan remains authoritative**; if this folder ever differs, trust BscScan and open an issue.

## What the contract can and cannot do

- Fixed supply: the only `_mint` is in the constructor. Holders can `burn` / `burnFrom` their own balance.
- `Ownable` with one privileged role. Owner-only functions: `setMetadataURI` (off-chain metadata pointer, emits `MetadataURIUpdated`), `changeAdmin` / `transferOwnershipAtLaunch` (ownership transfer), `renounceOwnership`.
- No pause, no blacklist, no fee, no transfer restrictions, no upgradeability.
- `deployer` is an immutable record of the deploying address; it carries no privilege.

How privileged actions are governed is documented in [`docs/security/privileged-roles-and-governance.md`](../docs/security/privileged-roles-and-governance.md). Official treasury wallets are listed in the [address registry](../docs/addresses/mainnet.md).
