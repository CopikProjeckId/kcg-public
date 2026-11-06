# Certik

> **Status:** Full report PDF is **not publicly published** due to distribution restrictions.  
> This page provides a **detailed public mapping** of the audit timeline, scope, deployed contract alignment, findings summary, and our implemented governance controls.

### 1) Report Access & Distribution Notice (Important)

The CertiK report is subject to distribution terms and is **not uploaded** to this public GitBook.

* ✅ We provide **scope, alignment evidence, and findings summary** publicly.
* ✅ We provide **implementation evidence** (on-chain links, governance docs, official registry) publicly.
* ✅ We can provide the full report to **verified parties** (exchanges/partners/auditors) upon request through an approved channel and under the applicable terms.

**Request channel:** (예: business email / official telegram / partner form)  
**Verification requirement:** requesting party identity + purpose + acknowledgment of distribution terms.

***

### 2) Audit Snapshot (Facts)

* Auditor: **CertiK**
* Assessment title: **Korea Culture Game (KCG) Security Assessment**
* Final report date: **2025-12-01**
* Preliminary comments: **2025-11-18**
* Target type: **ERC-20**
* Ecosystem: **BNB Smart Chain (BSC)**
* Methods: **Formal Verification, Manual Review, Static Analysis**
* Total findings: **4**
  * Centralization: **2** (Acknowledged)
  * Informational: **2** (Acknowledged)
  * Critical: 0 / Major: 0 / Medium: 0 / Minor: 0
  * Resolved: 0 / Partially Resolved: 0 / Acknowledged: 4 / Declined: 0

**Interpretation note:**  
“Acknowledged” means the finding is recognized as **design/operational risk** rather than a code-level bug requiring a patch, and is addressed via governance and operational controls.

***

### 3) Scope (What was reviewed)

#### 3.1 In-Scope

* Contract file: `contracts/FixedSupplyToken.sol`
* Network context: **BSC mainnet**
* Scope reference: **BscScan verified token contract page** (source-based review)

#### 3.2 Out-of-Scope (Typical)

The audit scope does **not** include (unless explicitly stated in the report):

* Frontend/UI, backend servers, databases
* Private key custody procedures and staff access controls
* Exchange listing and market-making operations
* Cross-chain bridges and third-party integrations
* Business/legal/regulatory compliance

> We therefore document operational controls separately in Section 8 to mitigate non-code risks.

***

### 4) Production Deployment Mapping (On-Chain Source of Truth)

#### 4.1 Deployed Contract

* Network: **BSC**
* Token contract address: `0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5`
* Explorer (verified code):  
  [https://bscscan.com/token/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5#code](https://bscscan.com/token/0x1a5093B6f1ef2fc4f45Cb651cb2fb9Ce14eb79A5#code)

#### 4.2 Verified Source / Compilation Context (Alignment Evidence)

BscScan shows the contract is **Source Code Verified (Exact Match)** and provides compilation context.

Key details visible on BscScan:

* Contract name: `FixedSupplyToken`
* Compiler: `v0.8.28+commit.7893614a`
* Optimizer: **Disabled**
* Verified file includes the privileged functions referenced in audit findings (see Section 6).

#### 4.3 Alignment Statement (Audit ↔ Deployment)

Because (i) the audit scope references the **BscScan verified code page**, and (ii) the deployed address is **Exact Match verified**, we map the audited scope to the production deployment using the explorer’s verified source reference.

**If future deployments occur:**  
Any redeployments or migrations MUST be documented here with a new address, date, and alignment note.

***

### 5) Privileged Authority Model (Contract-Accurate Governance Surface)

This contract uses **OpenZeppelin ERC20 + Ownable** and therefore exposes a **single privileged authority**:

* `owner` (onlyOwner)

There is **no** AccessControl role system (no Admin/Minter/Pauser roles).

#### 5.1 Owner-Only Capabilities (Privileged Functions)

The `owner` can execute:

* `setMetadataURI(string newURI)`
* `changeAdmin(address newAdmin)` (ownership transfer)
* `transferOwnershipAtLaunch(address newOwner)` (ownership transfer via `changeAdmin`)

#### 5.2 Non-Owner Capabilities (Public Functions)

Any holder can:

* `burn(uint256 amount)`
* `burnFrom(address account, uint256 amount)` (allowance-based burn)

#### 5.3 Supply Behavior (Clarification)

* **Minting:** occurs only during deployment (constructor). There is no callable mint after deployment.
* **Burning:** supported, therefore `totalSupply()` can **decrease** over time.
* **Fixed supply definition (public):** “Fixed supply” means **no additional minting** (maximum issuance is capped), not that totalSupply can never decrease.

***

### 6) Findings Summary (Public)

The report identified 4 issues:

#### 6.1 Centralization (2) — Acknowledged

* **KCG-01: Initial Token Distribution** — Centralization — Acknowledged
* **KCG-02: Centralization Risk in FixedSupplyToken (Owner privileges)** — Centralization — Acknowledged

#### 6.2 Informational (2) — Acknowledged

* **KCG-03: Local Variable Shadowing** — Informational — Acknowledged
* **KCG-04: “Fixed Supply” naming may mislead due to burning** — Informational — Acknowledged

***

### 7) Findings-to-Controls Mapping (Detailed)

This table connects each finding to our current disclosure and governance controls.

| ID     | Category       | Status       | What the finding implies                                                                      | Why it’s “Acknowledged”                                                | Our implemented mitigation / disclosure                                                                                                                 | Where to verify                                                  |
| ------ | -------------- | ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| KCG-01 | Centralization | Acknowledged | Concentration risk if initial tokens are controlled by one/few keys; key compromise risk      | Initial distribution is a tokenomics/governance design; not a code bug | **Public tokenomics allocation** + **vesting schedule disclosure** + **purpose-based wallet segregation** + **Safe multisig control for major wallets** | Tokenomics page + Official Address Registry + on-chain transfers |
| KCG-02 | Centralization | Acknowledged | Owner key compromise could lead to misuse of owner-only actions (metadata/ownership transfer) | Owner existence is by design in Ownable                                | **Owner controlled by Safe multisig** (2-of-3 \~ ≥67% standard) + governance policy page that enumerates owner-only actions                             | Explorer: `owner()` + Safe execution history + governance docs   |
| KCG-03 | Informational  | Acknowledged | Variable shadowing may reduce clarity and increase future maintenance risk                    | Code-style, typically not exploitable by itself                        | Tracked as a **code-quality improvement** item for future revision; current deployment remains stable                                                   | Verified source review                                           |
| KCG-04 | Informational  | Acknowledged | Name “FixedSupplyToken” can be misunderstood since burning reduces supply                     | Naming/documentation mismatch                                          | Public definition updated: **no further minting**; **supply can decrease via burning**                                                                  | This page + token docs                                           |

> **Key point:** Centralization findings are addressed primarily through **multisig governance, disclosure, and operational controls**, not by changing core token logic.

***

### 8) Operational Security Controls (Public Commitments)

Because audits are code-scoped, we document key operational controls that mitigate real-world risks:

#### 8.1 Multisig Owner Governance (Implemented)

We operate the token owner authority and major treasury wallets via **Safe (SafeGlobal) multisig**:

* Signers: **CEO / CTO / CFO (3)**
* Threshold: **2-of-3 approvals** (two-thirds ≈ **≥ 67% standard**)
* Rule: No single individual may unilaterally execute owner-only actions.

**Owner-only actions executed via multisig include:**

* ownership transfer (admin change)
* metadata URI update (if needed)

#### 8.2 Purpose-Based Wallet Segregation (Implemented)

We maintain separate wallets by purpose:

* Reserve / Ecosystem / Development / Marketing / Team / Private Investors / Advisor  
  This reduces blast radius and improves auditability.

#### 8.3 Single Source of Truth (Official Registry)

All official addresses (token, owner, and major wallets) MUST be listed on the **Official Address Registry** page with explorer links.  
Any address not listed there MUST be treated as unofficial.

***

### 9) Reproducibility & Internal Integrity (Non-public, Internal Practice)

Even though the PDF is not published, we maintain internal artifacts to ensure integrity and reproducibility:

* Original report PDF stored securely
* File hash (SHA256) stored internally
* Evidence bundle for verified parties (report + hash + mapping page + on-chain links)

> Hashes are for integrity verification and do **not** replace access control.

***

### 10) Verified Party Report Request (Process)

If a verified party requires the full report:

1. Submit request with identity + purpose
2. Accept distribution terms
3. Receive report through an approved channel
4. Optional: verify PDF integrity using provided SHA256 hash
