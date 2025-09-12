# CBlock - Carbon Credit Marketplace 🌱

## Overview

A blockchain-powered carbon credit marketplace with an immersive landing page, full authentication system, and Ethereum Sepolia testnet integration. Trade verified carbon credits, generate retirement certificates, and track your climate impact through a transparent, decentralized platform.

## 🚀 Key Features

### Frontend Features
- **Immersive Landing Page**: Modern, animated welcome page with testimonials and interactive elements
- **Full Authentication System**: Complete login/signup flow with different account types (Individual, Business, Verifier)
- **Blockchain Wallet Integration**: MetaMask wallet connection for Ethereum transactions
- **Responsive Design**: Mobile-first approach with smooth animations and modern UI
- **Account Types**: Support for Individual, Business, and Verifier accounts with different features

### Blockchain Features
- **Ethereum Sepolia Testnet**: Fully integrated with Ethereum testnet for safe testing
- **Smart Contract Integration**: 
  - Carbon Credit ERC-1155 tokens with Gold Standard verification
  - Marketplace for buying/selling credits
  - Retirement certificates as ERC-721 NFTs
  - Verifier registry with DAO governance
- **IPFS Integration**: Decentralized storage for documents and metadata
- **Real-time Blockchain Data**: Live transaction monitoring and portfolio tracking

## 🛠 Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **MetaMask** browser extension
4. **Git** (optional)

### Required API Keys & Services

You'll need to obtain the following API keys and services (all free for development):

#### 1. Alchemy API Key (Ethereum RPC)
- Go to [alchemy.com](https://alchemy.com)
- Create a free account
- Create a new app and select **Sepolia** testnet
- Copy the HTTP API key (format: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`)

#### 2. Web3.Storage Token (IPFS)
- Go to [web3.storage](https://web3.storage)
- Create a free account
- Generate an API token from the dashboard

#### 3. Sepolia Testnet ETH
- Use faucets like:
  - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
  - [Chainlink Sepolia Faucet](https://faucets.chain.link/)
- Get testnet ETH for multiple wallet addresses (deployer, verifier, users)

### 🏗 Installation & Setup

1. **Clone or Download the Project**
   ```bash
   cd carbon-market-demo-full
   ```

2. **Install Dependencies**
   ```bash
   # Install hardhat dependencies
   cd hardhat
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure Environment Variables**

   **For Hardhat (Smart Contracts):**
   ```bash
   cd hardhat
   cp .env.example .env
   ```
   
   Edit `hardhat/.env`:
   ```env
   SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
   DEPLOYER_PRIVATE_KEY="0xYOUR_WALLET_PRIVATE_KEY"
   WEB3_STORAGE_TOKEN="YOUR_WEB3_STORAGE_TOKEN"
   ```

   **For Frontend:**
   ```bash
   cd ../frontend
   cp .env.example .env
   ```
   
   Edit `frontend/.env`:
   ```env
   VITE_SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
   VITE_WEB3_STORAGE_TOKEN="YOUR_WEB3_STORAGE_TOKEN"
   VITE_CHAIN_ID=11155111
   
   # Contract addresses will be filled after deployment
   VITE_CONTRACT_CARBON_ADDRESS=""
   VITE_CONTRACT_MARKETPLACE_ADDRESS=""
   VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS=""
   VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS=""
   ```

4. **Deploy Smart Contracts to Sepolia**
   ```bash
   cd hardhat
   
   # Compile contracts
   npx hardhat compile
   
   # Run tests (optional but recommended)
   npx hardhat test
   
   # Deploy to Sepolia testnet
   npx hardhat run scripts/deploy_sepolia.js --network sepolia
   ```

   **Important:** Save the contract addresses printed after deployment!

5. **Update Frontend Configuration**
   
   After deployment, update your `frontend/.env` with the contract addresses:
   ```env
   VITE_CONTRACT_CARBON_ADDRESS="0xYOUR_CARBON_CONTRACT_ADDRESS"
   VITE_CONTRACT_MARKETPLACE_ADDRESS="0xYOUR_MARKETPLACE_ADDRESS"
   VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS="0xYOUR_RETIREMENT_CERTIFICATE_ADDRESS"
   VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS="0xYOUR_VERIFIER_REGISTRY_ADDRESS"
   ```

6. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

   Your application will be available at `http://localhost:5173`

### 🔧 Additional Setup for Full Functionality

#### Add a Verifier (Required for Minting)
```bash
cd hardhat
npx hardhat run scripts/addVerifier.js --network sepolia
```

#### Configure MetaMask
1. Add Sepolia testnet to MetaMask:
   - Network Name: `Sepolia Testnet`
   - RPC URL: `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`
   - Chain ID: `11155111`
   - Currency Symbol: `SepoliaETH`
   - Block Explorer: `https://sepolia.etherscan.io`

2. Import or create test accounts in MetaMask

3. Fund accounts with Sepolia ETH from faucets

## 🎯 How to Use the Application

### 1. Landing Page
- Visit the application URL
- Experience the immersive landing page with animations
- Click "Get Started" or "Sign In"

### 2. Account Creation
- Choose account type: Individual, Business, or Verifier
- Fill in personal/organization information
- Connect your MetaMask wallet
- Complete registration

### 3. Carbon Credit Workflow

**For Verifiers:**
1. Upload project documentation (PDF)
2. Sign attestations for projects
3. Provide signatures to project owners

**For Project Owners:**
1. Upload project documents
2. Get verifier attestation
3. Mint carbon credits using attestation

**For Traders:**
1. Browse marketplace
2. Buy/sell carbon credits
3. Retire credits for climate impact
4. Receive retirement certificates

### 4. Blockchain Features
- All transactions are recorded on Sepolia testnet
- View transaction history on Etherscan
- Track portfolio value in real-time
- Generate immutable retirement certificates

## 📁 Project Structure

```
carbon-market-demo-full/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── Welcome.jsx  # Landing page
│   │   │   ├── Login.jsx    # Login form
│   │   │   ├── Signup.jsx   # Registration form
│   │   │   └── Layout.jsx   # Main app layout
│   │   ├── abis/           # Smart contract ABIs
│   │   └── styles/         # CSS and styling
│   └── .env                # Frontend environment variables
├── hardhat/                # Smart contracts
│   ├── contracts/          # Solidity contracts
│   ├── scripts/            # Deployment scripts
│   └── .env               # Blockchain environment variables
└── README.md              # This file
```

## 🔐 Security Notes

- **Never use mainnet private keys** - This is for Sepolia testnet only
- **Keep private keys secure** - Store in secure environment variables
- **Testnet funds only** - Use only test ETH, never real ETH
- **Smart contract auditing** - Consider professional audit before mainnet deployment

## 🚀 Deployment to Production

### For Frontend (Vercel/Netlify)
1. Connect your repository to Vercel/Netlify
2. Set environment variables in the hosting platform
3. Deploy with automatic builds from main branch

### For Smart Contracts (Mainnet)
1. **Get a professional audit** before mainnet deployment
2. Use a secure hardware wallet for deployment
3. Fund deployer wallet with real ETH
4. Update RPC URLs to mainnet
5. Deploy with extra caution and testing

## 🛟 Troubleshooting

### Common Issues

**MetaMask Connection Issues:**
- Ensure MetaMask is installed and unlocked
- Switch to Sepolia testnet in MetaMask
- Clear browser cache if connection fails

**Transaction Failures:**
- Check Sepolia ETH balance
- Increase gas limit if needed
- Verify contract addresses in .env

**Build/Start Issues:**
- Clear node_modules and reinstall
- Check Node.js version (v18+ required)
- Verify all environment variables are set

### Getting Help
- Check browser console for error messages
- Use Sepolia Etherscan to verify transactions
- Ensure all API keys are correctly configured

## 📊 Features Included

### ✅ Completed Features
- [x] Immersive animated landing page
- [x] Complete authentication system with multiple account types
- [x] MetaMask wallet integration
- [x] Smart contract deployment scripts
- [x] IPFS document storage
- [x] Carbon credit minting with Gold Standard verification
- [x] Marketplace for trading credits
- [x] Retirement certificate generation
- [x] Real-time portfolio tracking
- [x] Transaction history and monitoring
- [x] Responsive design for all devices
- [x] Professional UI/UX with animations
- [x] Sepolia testnet integration

### 🚧 Future Enhancements
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support (Polygon, BSC)
- [ ] Mobile app development
- [ ] Advanced filtering and search
- [ ] Price prediction algorithms
- [ ] Batch operations for large trades
- [ ] Integration with more carbon standards

## 📄 License

This project is developed for educational and demonstration purposes. Please review and modify before production use.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Ready to revolutionize carbon trading?** 🌍✨

Start by setting up your environment variables and deploying the contracts. Join the fight against climate change with blockchain technology!
