# 🚀 LOCAL DEVELOPMENT SETUP

## 📋 **Available Scripts**

### Hardhat (Backend)
```bash
npm test                # Run all tests
npm run compile         # Compile contracts
npm run node           # Start local Hardhat node
npm run local-demo     # Deploy contracts to running local node
npm run update-abis    # Copy ABIs to frontend
npm run build          # Compile + update ABIs
```

### Frontend (React)
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
```

## 🔧 **Step-by-Step Setup**

### 1. **Start Local Hardhat Node**
```bash
cd hardhat
npm run node
```
Keep this terminal open! It will show:
- Account addresses and private keys
- Contract deployment logs
- Transaction logs

### 2. **Deploy Contracts (New Terminal)**
```bash
cd hardhat
npm run local-demo
```
This will:
- Deploy all contracts to the local node
- Set up relationships between contracts
- Add the deployer as a verifier
- Output contract addresses for your .env

### 3. **Update Frontend .env File**
Copy the contract addresses from step 2 output to `frontend/.env`:

```bash
VITE_CONTRACT_CARBON_ADDRESS=0x...
VITE_CONTRACT_MARKETPLACE_ADDRESS=0x...
VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS=0x...
VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS=0x...
VITE_CONTRACT_GOVERNANCE_TOKEN_ADDRESS=0x...
VITE_CONTRACT_CARBON_GOVERNOR_ADDRESS=0x...
```

### 4. **Setup MetaMask**
- Network: `http://localhost:8545`
- Chain ID: `31337` (Hardhat default)
- Currency: `ETH`

Import the first account from Hardhat node:
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- This account is the verifier and has 10,000 ETH for testing

### 5. **Start Frontend**
```bash
cd frontend
npm run dev
```
Open http://localhost:3000

## 🎯 **Using the Demo**

### For Minting (As Verifier):
1. Use the imported account (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
2. This account can sign attestations
3. Follow the 3-step process: Upload → Sign → Mint

### For Trading:
1. Switch to different accounts in MetaMask
2. Import additional accounts using other private keys from Hardhat node
3. Trade between accounts

## ⚠️ **Troubleshooting**

### "Could not decode result data" Error
This means contracts aren't deployed or node isn't running:
1. Make sure `npm run node` is running in hardhat directory
2. Deploy contracts with `npm run local-demo`
3. Check contract addresses in frontend/.env match deployment output

### MetaMask Connection Issues
1. Make sure MetaMask is connected to `http://localhost:8545`
2. Reset account in MetaMask if needed
3. Clear activity tab data in MetaMask settings

### Contract Not Found
1. Restart Hardhat node (`npm run node`)
2. Re-deploy contracts (`npm run local-demo`)
3. Update frontend .env with new addresses
4. Refresh browser

## 📱 **Default Accounts**

Hardhat provides 20 accounts with 10,000 ETH each:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Verifier)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## 🔄 **Quick Restart**

If you need to restart everything:
1. Stop Hardhat node (Ctrl+C)
2. `npm run node` (new blockchain state)
3. `npm run local-demo` (deploy contracts)
4. Update frontend .env with new addresses
5. Reset MetaMask account
6. Refresh browser

## ✅ **Verification**

The setup is working when:
- ✅ Hardhat node is running on port 8545
- ✅ Contracts are deployed (addresses in .env)
- ✅ MetaMask connected to localhost:8545
- ✅ Frontend shows "Connect Wallet" button
- ✅ No console errors about contract connection

**🎉 Happy Testing!**
