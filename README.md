# Carbon Market Demo (Hackathon)
A ready-to-demo prototype for a decentralized Carbon Credit Marketplace (ERC-1155 tokens, ERC-721 retirement certificates),
DAO-based verifier registry, EIP-712 attestations for Gold Standard integration, and a simple marketplace + frontend.

## What is included
- Hardhat project with:
  - `GovernanceToken.sol` (ERC20Votes)
  - `CarbonGovernor.sol` (Governor)
  - `VerifierRegistry.sol`
  - `CarbonCredit.sol` (ERC-1155 with mintWithAttestation)
  - `RetirementCertificate.sol` (ERC-721)
  - `Marketplace.sol` (basic listing/buy/retire)
  - Deployment scripts (Sepolia)
  - Tests (basic)
- Frontend (React + Vite) with pages:
  - Connect Wallet
  - Create Project (upload to web3.storage)
  - Mint with attestation (simulate verifier signature)
  - Marketplace (listings, buy)
  - Retire tokens -> mint certificate

## Zero-cost notes
- Uses Sepolia testnet (no real $). Use faucets to get SepoliaETH.
- Use Alchemy (free tier) or public Sepolia RPC for deployment.
- Use web3.storage (free) for IPFS storage of metadata.
- MetaMask for signing; no paid services required.

## Setup (high-level)
1. Install dependencies:
   - Node.js >= 18
   - npm
2. Clone repo locally and run:
```bash
cd hardhat
npm install
cd ../frontend
npm install
```
3. Create `.env` files as instructed in `hardhat/.env.example` and `frontend/.env.example`
   - You will need `SEPOLIA_RPC_URL` (Alchemy free key), `DEPLOYER_PRIVATE_KEY` (use a test wallet), and `WEB3_STORAGE_TOKEN`.
4. Run tests and deploy to Sepolia:
```bash
cd hardhat
npx hardhat test
npx hardhat run scripts/deploy_sepolia.js --network sepolia
```
5. Frontend:
```bash
cd frontend
npm run dev
```

## Files of interest
- `hardhat/contracts/*` — Solidity contracts
- `hardhat/scripts/*` — deployment & helper scripts
- `frontend/src/*` — React frontend code

## Demo script
1. Deploy contracts to Sepolia (or run local node).
2. Mint governance tokens to multiple wallets, create a proposal to add verifier, vote & execute.
3. Verifier uploads GS PDF to web3.storage, signs an attestation message (EIP-712) and gives signature to project owner.
4. Project owner calls `mintWithAttestation`, tokens minted.
5. Buy tokens, retire tokens, show retirement certificate NFT with IPFS metadata.

For more details, open the contracts and scripts. Good luck!
---

# Step-by-step: Run the full demo locally (detailed)

This section walks you through **every step** from downloading the zip to running your full decentralized demo on Sepolia — including how to create wallets, obtain API keys, get test ETH, deploy contracts, wire the frontend, and run the UI demo with exact clicks.

## 0) Download & extract
1. Download `carbon-market-demo-full.zip` (or `carbon-market-demo-complete.zip` if provided).
2. Extract it somewhere convenient, e.g. `~/projects/carbon-market-demo`.

## 1) Prerequisites (install)
- Install Node.js (v18 or later) and npm.
- Install Git (optional).
- Install MetaMask extension in your browser.
- (Optional) Install `jq` for JSON CLI helpers.

## 2) Create test wallets (MetaMask)
You will create four accounts in MetaMask (use separate profiles or lock/unlock one extension and create multiple accounts):
- **Deployer** — used to deploy contracts and act as governance executor for the demo.
- **Verifier** — represents Gold Standard or a verifier; will sign attestations.
- **ProjectOwner** — receives minted carbon tokens.
- **Buyer** — will buy and retire tokens.

How to create them:
1. Open MetaMask, create a new wallet if you don't already have one. Save the seed phrase safely.
2. In MetaMask, use the account menu -> "Create Account" to create additional accounts. Rename them accordingly ("Deployer", "Verifier", ...).
3. For each account, click the account icon -> "Account details" -> "Export Private Key" if you need to paste it into `.env` for deployment. **Warning:** Never use a mainnet real wallet private key here. Use test accounts and keep keys secure offline.

## 3) Get Sepolia RPC (Alchemy) & web3.storage token
1. Alchemy (RPC):
   - Sign up at https://www.alchemy.com (free).
   - Create an app, choose **Sepolia** as the network and copy the **HTTP RPC URL**. It looks like `https://eth-sepolia.g.alchemy.com/v2/yourKey`.
2. web3.storage (IPFS):
   - Sign up at https://web3.storage (free).
   - In dashboard, get your API token (called "Token" under API tokens).

## 4) Fund test wallets with Sepolia ETH (faucet)
- Use Sepolia faucet(s) such as Alchemy faucet (in your Alchemy dashboard) or other public faucets. Paste each account address (Deployer, Verifier, ProjectOwner, Buyer) and request small amounts (0.05 - 0.2 ETH each) to cover gas for demo transactions. Wait for tokens to arrive (Sepolia txs are fast).

## 5) Prepare project files and env values
Open the extracted folder structure. Two main folders: `hardhat` and `frontend`.

A. Hardhat `.env` (hardhat/.env):
- Create `.env` by copying `.env.example` and filling:
  - `SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"`
  - `DEPLOYER_PRIVATE_KEY="0x<private key of Deployer account>"` (only for test wallets)
  - `WEB3_STORAGE_TOKEN="your_web3.storage token"`

B. Frontend `.env` (frontend/.env):
- Create `.env` by copying `.env.example` and set:
  - `VITE_SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"`
  - `VITE_CONTRACT_CARBON_ADDRESS=""` (will fill after deploy)
  - `VITE_CONTRACT_MARKETPLACE_ADDRESS=""` (will fill after deploy)
  - `VITE_WEB3_STORAGE_TOKEN="your_web3.storage token"`

## 6) Install deps and run tests locally
In the `hardhat` folder:
```bash
cd hardhat
npm install
npx hardhat compile
npx hardhat test
```
Tests run on the local Hardhat network and should pass (some tests check EIP-712 flows).

## 7) Deploy to Sepolia
In `hardhat` folder (with `.env` filled):
```bash
npx hardhat run scripts/deploy_sepolia.js --network sepolia
```
This will deploy:
- VerifierRegistry
- CarbonCredit
- RetirementCertificate
- Marketplace

Keep the printed addresses and transaction hashes. Note: the script transfers ownership of the RetirementCertificate to the Marketplace so that retirement minting works from the marketplace contract.

## 8) Wire frontend to deployed addresses
Open `frontend/.env` and set:
```
VITE_CONTRACT_CARBON_ADDRESS="0x...address printed for CarbonCredit..."
VITE_CONTRACT_MARKETPLACE_ADDRESS="0x...address printed for Marketplace..."
VITE_WEB3_STORAGE_TOKEN="your_web3.storage token"
```
Save, then:
```bash
cd ../frontend
npm install
npm run dev
```
Open the URL (usually `http://localhost:5173`) in the browser where MetaMask is installed.

## 9) On-chain setup: add verifier (demo governance step)
Because the deploy script sets `governanceExecutor` to the deployer for the hackathon, the deployer can call the registry to add a verifier easily (in production this would be done by a Governor contract after voting). To add verifier using Hardhat script:
```bash
# from hardhat folder
npx hardhat run scripts/addVerifier.js --network sepolia
```
Make sure `scripts/addVerifier.js` has the correct addresses filled. Alternatively use Etherscan "Write Contract" with deployer account to call `addVerifier` with the Verifier address.

## 10) Demo exact UI walkthrough (exact clicks)
Follow the "Step-by-step UI walkthrough" in DEMO_SCRIPT.md or use the in-app flow:
1. Open the frontend and click "Mint". Connect MetaMask with the **Verifier** account.
2. In Upload, choose your sample Gold Standard PDF and click **Upload**.
3. Click "Sign Attestation" and complete the signer MetaMask signature (select Verifier account).
4. Switch MetaMask to the **ProjectOwner** account. Go to Mint, paste details + signature, click **Mint** and confirm transaction.
5. Switch to ProjectOwner, My Tokens -> Approve Marketplace -> List tokens in Marketplace.
6. Switch to Buyer, Marketplace -> Buy listing -> confirm transaction.
7. Switch to Buyer, Retire -> upload retirement metadata (optional) -> Retire 1 -> confirm.
8. Show Etherscan events: `MintedWithAttestation`, `Listed`, `Bought`, `Retired`, and verify IPFS metadata links.

## 11) Troubleshooting
- If signatures fail, ensure the signer used the same recipient address and the nonce matched the contract nonce for that recipient (frontend SignAttestation now fetches nonce automatically).
- If a transfer or retire fails, ensure `setApprovalForAll(marketplace, true)` has been called by the token holder.
- Use the Hardhat console or scripts to inspect contract state if UI shows unexpected values.

---
