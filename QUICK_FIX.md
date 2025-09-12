# 🚨 QUICK FIX - "Signature not from registered verifier"

## 📋 **IMMEDIATE SOLUTIONS**

### **OPTION 1: Use Demo Mode (30 seconds)**
1. In the mint page, click **"Demo Mint"** instead of "Mint Carbon Credits"
2. ✅ **This works immediately** and shows the complete workflow

### **OPTION 2: Add Your Wallet as Verifier (2 minutes)**

#### **Step 1: Get Your Wallet Address**
In MetaMask, copy your wallet address (starts with 0x...)

#### **Step 2: Add Yourself as Verifier**
```bash
cd hardhat

# If you have contracts deployed to Sepolia:
npm run add-verifier:sepolia YOUR_WALLET_ADDRESS

# If you're using local development:
npm run add-verifier:local YOUR_WALLET_ADDRESS
```

#### **Step 3: Try Minting Again**
Now "Mint Carbon Credits" will work!

### **OPTION 3: Quick Verifier Registration from Frontend**

1. **Go to the "Sign Attestation" step**
2. **Click "Demo Mode"** button to activate verifier status
3. **Complete the signing process**
4. **Return to minting** - it will now work!

## 🔧 **WHY THIS HAPPENS**

The error occurs because:
- Your wallet needs to be registered as an authorized verifier in the smart contract
- The smart contract checks `verifierRegistry.isVerifier(signer)` 
- If false, it rejects the transaction with "attestation not signed by registered verifier"

## ✅ **PERMANENT FIX**

To make this work permanently for all users:

1. **Deploy contracts with your wallet as the initial verifier**
2. **Use the governance system to add more verifiers**
3. **Or use demo mode for testing and presentations**

## 🎯 **RECOMMENDED APPROACH**

**For immediate testing:** Use Demo Mode
**For real blockchain:** Register your wallet as verifier first
**For production:** Set up proper governance and verifier onboarding

---

## 🚀 **TL;DR - IMMEDIATE ACTION**

**Click "Demo Mint" instead of "Mint Carbon Credits" - it works immediately!**

Or run:
```bash
cd hardhat
npm run add-verifier:sepolia YOUR_WALLET_ADDRESS
```

Then "Mint Carbon Credits" will work too!
