# Carbon Market Demo - Complete & Fixed

A complete carbon credit marketplace demo built with Ethereum smart contracts and React frontend. All compilation errors fixed and ready to run.

## ✅ What's Fixed

- ✅ Fixed all Solidity compilation errors
- ✅ Updated to modern Hardhat/Ethers v6 syntax  
- ✅ Fixed React component imports and dependencies
- ✅ Added proper Vite configuration
- ✅ Fixed governance contracts compilation
- ✅ Updated deployment scripts
- ✅ Fixed test files
- ✅ Simplified IPFS storage for demo purposes

## Features

- **Carbon Credit Minting**: Mint carbon credits with verifier attestation (EIP-712)
- **Marketplace**: List and buy carbon credits
- **Retirement**: Retire carbon credits with certificate minting
- **IPFS Storage**: Simulated document storage (can be upgraded to real IPFS)
- **DAO Governance**: Token-based governance for verifier management

## Architecture

- **Smart Contracts**: Hardhat + Solidity 0.8.18
- **Frontend**: React + Vite + Ethers.js v6
- **Storage**: Mock IPFS (easily upgradeable)
- **Network**: Ethereum Sepolia Testnet

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd hardhat
npm install

# Frontend  
cd ../frontend
npm install
```

### 2. Test & Compile

```bash
# Test contracts
cd hardhat
npm test

# Compile contracts
npm run compile
```

### 3. Environment Setup

```bash
# Hardhat
cd hardhat
cp .env.example .env
# Edit .env with your Sepolia RPC URL and private key

# Frontend
cd ../frontend  
cp .env.example .env
# Edit .env with contract addresses after deployment
```

### 4. Deploy Contracts

```bash
cd hardhat
npm run deploy:sepolia
```

Copy the deployed contract addresses to your frontend `.env` file.

### 5. Run Frontend

```bash
cd frontend
npm run dev
```

## Contract Architecture

1. **GovernanceToken** - ERC20Votes token for DAO governance
2. **CarbonGovernor** - OpenZeppelin Governor for DAO voting
3. **VerifierRegistry** - Manages authorized verifiers (controlled by Governor)
4. **CarbonCredit** - ERC1155 carbon credits with EIP-712 attestation
5. **Marketplace** - Trading and retirement marketplace
6. **RetirementCertificate** - ERC721 certificates for retired credits

## Usage Flow

1. **Connect Wallet**: Connect MetaMask to Sepolia testnet
2. **Get Test ETH**: Use Sepolia faucet to get test ETH
3. **Upload Document**: Upload project document (simulated for demo)
4. **Sign Attestation**: Sign verifier attestation (EIP-712)
5. **Mint Credits**: Mint carbon credits with attestation
6. **List on Market**: List credits for sale on marketplace
7. **Buy Credits**: Purchase credits from marketplace
8. **Retire Credits**: Retire credits to get retirement certificate

## Testing

All tests pass successfully:

```bash
cd hardhat
npm test
```

Output:
```
✓ Attestation flow - signs EIP-712 attestation and mints token
✓ Basic flow - deploys and mints with attestation (simulated)

2 passing
```

## Development Notes

### Compilation
- Uses Solidity 0.8.18 with optimizer enabled
- `viaIR: true` enabled to handle complex contracts
- All OpenZeppelin contracts properly configured

### Frontend
- Uses Vite for fast development
- Modern React 18 with hooks
- Ethers.js v6 for blockchain interaction
- Mock IPFS storage for simplicity (can be upgraded)

### Governance
- Governor uses 1% quorum for demo purposes
- Verifier management through DAO proposals
- ERC20Votes for snapshot-based voting

## Environment Variables

### Hardhat (.env)
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

### Frontend (.env)
```bash
# Contract addresses (set after deployment)
VITE_CONTRACT_CARBON_ADDRESS=0x...
VITE_CONTRACT_MARKETPLACE_ADDRESS=0x...
VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS=0x...
VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS=0x...
VITE_CONTRACT_GOVERNANCE_TOKEN_ADDRESS=0x...
VITE_CONTRACT_CARBON_GOVERNOR_ADDRESS=0x...
```

## Troubleshooting

### Common Issues

1. **"Stack too deep" compilation error**
   - ✅ Fixed: Added optimizer settings and viaIR to hardhat.config.js

2. **"Function has override specified but does not override"**
   - ✅ Fixed: Updated GovernanceToken contract

3. **"_signTypedData is not a function"**
   - ✅ Fixed: Updated to `signTypedData` in tests

4. **"Invalid contract specified in override list"**
   - ✅ Fixed: Corrected override specifications in Governor

5. **Import path errors**
   - ✅ Fixed: Corrected all ABI import paths

6. **Deprecated web3.storage**
   - ✅ Fixed: Replaced with mock storage for demo

## Next Steps

1. **Upgrade IPFS**: Replace mock storage with real IPFS/Arweave
2. **Add Governance UI**: Create frontend for DAO proposals
3. **Enhanced Metadata**: Add richer carbon credit metadata
4. **Batch Operations**: Support batch minting/trading
5. **Price Discovery**: Add AMM or auction mechanisms

## License

MIT License
