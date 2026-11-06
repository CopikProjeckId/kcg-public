# Privileged Roles & Governance

#### 1) Authority Model (Ownable Only)

The current token contract uses **OpenZeppelin ERC20 + Ownable**.  
Therefore, the contract has **one privileged authority**:

* **Owner (Admin-equivalent):** the only address that can perform privileged actions.

> There is **no role-based access control** (e.g., no `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE`) in the current contract.

#### 2) What the Owner Can Do (Privileged Functions)

The Owner can execute the following privileged actions:

1. **Update project metadata URI**

* Function: `setMetadataURI(string newURI)`
* Effect: updates `metadataURI` and emits `MetadataURIUpdated(oldURI, newURI)`
* Notes: this may affect how wallets/apps display token metadata.

2. **Transfer ownership (change admin)**

* Function: `changeAdmin(address newAdmin)`
* Effect: transfers ownership to `newAdmin` (must be non-zero).

3. **Transfer ownership at launch**

* Function: `transferOwnershipAtLaunch(address newOwner)`
* Effect: calls `changeAdmin(newOwner)` (same outcome: ownership transfer).

Additionally, the standard Ownable functions exist:

* `transferOwnership(address newOwner)`
* `renounceOwnership()`

#### 3) What the Owner Cannot Do (Supply & Control Limits)

**Fixed Supply / No Further Minting**

* Token minting occurs **only in the constructor** via `_mint(_initialOwner, _initialSupply)` if `_initialSupply > 0`.
* The contract has **no external/public mint function**, therefore **no additional KCG can be minted after deployment**.

**No Pause / No Freeze / No Blacklist**

* The current contract does **not** include `Pausable`, blacklisting, freezing, or transfer restrictions.

#### 4) User-Level Burning (Non-Privileged)

Any holder can reduce supply by burning tokens:

* `burn(uint256 amount)`: burns the caller’s tokens.
* `burnFrom(address account, uint256 amount)`: burns from `account` using ERC20 allowance (requires sufficient allowance).

#### 5) Multisig Governance for Owner & Major Wallets (Implemented)

We confirm the privileged Owner authority and major treasury wallets are governed via **Safe (SafeGlobal) multisig** to prevent unilateral control:

* **Signers:** CEO / CTO / CFO (3 signers)
* **Threshold:** **2-of-3 approvals** required for execution
* This corresponds to \~**66.7%**, treated and disclosed as the **“≥ 67% threshold”** governance standard for critical actions.

#### 6) How to Verify On-Chain

Anyone can verify these facts on the explorer:

* **Owner address:** `owner()`
* **Total supply:** `totalSupply()`
* **Metadata URI:** `metadataURI()`
* **Owner-only actions:** check transactions calling `setMetadataURI` and ownership transfers (`transferOwnership` / `changeAdmin` / `transferOwnershipAtLaunch`)
* **No mint after deployment:** confirm there is no callable mint function in the verified source.
