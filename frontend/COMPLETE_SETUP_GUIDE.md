# 🚀 Complete Setup & Troubleshooting Guide

## 📋 **Quick Setup Checklist**

### **1. Prerequisites**

- ✅ Node.js 18+ installed
- ✅ MetaMask browser extension installed
- ✅ Git installed

### **2. Installation**

```bash
# Clone and install dependencies
git clone <repository>
cd carbon-market-demo-full

# Install backend dependencies
cd hardhat
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### **3. Environment Configuration**

#### **Backend (.env in hardhat folder)**

```bash
cd hardhat
cp .env.example .env
# Edit .env with your Sepolia RPC URL and private key
```

#### **Frontend (.env in frontend folder)**

```bash
cd frontend
cp .env.example .env
# Contract addresses are already configured for Sepolia testnet
```

### **4. MetaMask Setup**

1. **Install MetaMask**: https://metamask.io/
2. **Add Sepolia Network**:

   - Network Name: Sepolia Test Network
   - RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
   - Chain ID: 11155111
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.etherscan.io/

3. **Get Test ETH**: https://sepoliafaucet.com/

### **5. Start the Application**

```bash
# Start frontend
cd frontend
npm run dev

# Open browser to http://localhost:5173
```

## 🔧 **Troubleshooting Common Issues**

### **Issue 1: "Object" Errors During Minting**

**✅ FIXED**: Enhanced error handling now provides clear messages.

**Diagnostic Steps**:

1. Open `frontend/debug-blockchain-connection.html`
2. Run full diagnostics
3. Check each section for specific issues

**Common Solutions**:

- **Wallet not connected**: System now auto-connects
- **Wrong network**: Switch to Sepolia in MetaMask
- **Insufficient funds**: Add test ETH from faucet
- **Contract issues**: Verify contract deployment

### **Issue 2: "Document attestation data is missing"**

**✅ FIXED**: Added nonce storage and detailed error reporting.

**Solutions**:

1. **For new documents**: Re-attest after the fix
2. **For existing documents**: Check console for missing fields
3. **Debug helper**: Run `checkAttestationData()` in browser console

### **Issue 3: Parameter Mismatch Errors**

**✅ FIXED**: Added backward compatibility for amount/quantity parameters.

**What was fixed**:

- `amount` vs `quantity` parameter mismatch
- `ipfsCid` vs `ipfsHash` parameter mismatch
- Safe parameter handling with fallbacks

### **Issue 4: Blockchain Connection Problems**

**Diagnostic Tool**: `frontend/debug-blockchain-connection.html`

**Check List**:

- ✅ MetaMask installed and connected
- ✅ Connected to Sepolia testnet (Chain ID: 11155111)
- ✅ Contracts deployed and accessible
- ✅ Contract methods callable
- ✅ Sufficient ETH for gas fees

## 🧪 **Testing Your Setup**

### **Test 1: Blockchain Connection**

```bash
# Open the diagnostic tool
open frontend/debug-blockchain-connection.html

# Expected results:
✅ MetaMask connected
✅ Sepolia network active
✅ All contracts deployed
✅ Contract methods accessible
✅ Minting function available
```

### **Test 2: Complete Workflow**

1. **Connect Wallet**: Click "Connect Wallet" in the app
2. **Upload Document**: Upload a test document as Individual/Business user
3. **Switch Role**: Change to Verifier role
4. **Attest Document**: Fill attestation form and sign
5. **Verify Minting**: Check that credits are automatically minted
6. **Manual Mint**: Try manual minting on attested documents

### **Test 3: Error Handling**

1. **Disconnect wallet** and try minting → Should auto-reconnect
2. **Switch to wrong network** → Should show clear error
3. **Try with insufficient funds** → Should show clear error message

## 📊 **Expected Console Output**

### **Successful Attestation + Minting**

```
🔍 Attesting document: doc123
✅ Attestation successful: { ... }
🪙 Starting automatic credit minting...
🔗 Signer not available, connecting wallet...
🪙 Minting carbon credits: { recipient: "0x123...", quantity: "100" }
⛓️ Minting transaction submitted: 0xabc123...
✅ Credits minted successfully: { ... }
```

### **Error with Clear Messages**

```
❌ Error minting carbon credits: {
  message: "insufficient funds for intrinsic transaction cost",
  code: "INSUFFICIENT_FUNDS",
  reason: "insufficient funds for intrinsic transaction cost"
}
User-friendly error: "Insufficient funds for transaction. Please add more ETH to your wallet."
```

## 🎯 **Feature Status**

### **✅ Fully Working Features**

- ✅ **Document Upload**: IPFS storage with Pinata
- ✅ **Role-Based Access**: Individual, Business, Verifier roles
- ✅ **Document Attestation**: EIP-712 signatures
- ✅ **Automatic Minting**: Credits minted after attestation
- ✅ **Manual Minting**: Mint button for attested documents
- ✅ **Credit Allocation**: Automatic allocation to uploaders
- ✅ **Error Handling**: Clear, actionable error messages
- ✅ **Wallet Management**: Auto-connection and network switching

### **🔧 Recent Fixes Applied**

- ✅ **Parameter Mismatch**: Fixed amount/quantity mapping
- ✅ **Attestation Data**: Added missing nonce storage
- ✅ **Error Messages**: Enhanced error reporting
- ✅ **Wallet Connection**: Auto-connect functionality
- ✅ **Contract Initialization**: Proper signer setup

## 📁 **Key Files & Documentation**

### **Setup & Configuration**

- `SETUP.md` - Main setup instructions
- `frontend/.env` - Environment configuration
- `hardhat/.env` - Blockchain configuration

### **Fix Documentation**

- `frontend/BLOCKCHAIN_CONNECTION_FIX.md` - Blockchain error fixes
- `frontend/ATTESTATION_DATA_MISSING_FIX.md` - Attestation data fixes
- `frontend/MINTING_PARAMETER_FIX.md` - Parameter mismatch fixes
- `frontend/AUTOMATIC_MINTING_COMPLETE.md` - Complete minting implementation

### **Diagnostic Tools**

- `frontend/debug-blockchain-connection.html` - Blockchain diagnostics
- `frontend/test-attestation-data-fix.html` - Attestation data testing
- `frontend/test-automatic-minting.html` - Minting workflow testing

## 🚀 **Production Readiness**

### **✅ Ready for Demo/Testing**

- All core functionality working
- Comprehensive error handling
- User-friendly interface
- Detailed diagnostics available

### **🔄 Recommended Next Steps**

1. **Test thoroughly** with the diagnostic tools
2. **Verify all workflows** end-to-end
3. **Check error scenarios** to ensure proper handling
4. **Review console logs** for any remaining issues

## 🆘 **Getting Help**

### **If You Encounter Issues**:

1. **Run Diagnostics**: Use `debug-blockchain-connection.html`
2. **Check Console**: Look for detailed error messages
3. **Verify Setup**: Ensure all environment variables are set
4. **Test Network**: Confirm Sepolia testnet connection
5. **Check Funds**: Ensure sufficient test ETH

### **Common Commands**:

```bash
# Check if contracts are accessible
npm run test

# Rebuild frontend
npm run build

# Start with fresh state
localStorage.clear() # In browser console
```

## 🎉 **Success Indicators**

You'll know everything is working when:

- ✅ Diagnostic tool shows all green checkmarks
- ✅ Document upload and attestation work smoothly
- ✅ Automatic minting occurs after attestation
- ✅ Manual minting works for attested documents
- ✅ Error messages are clear and actionable
- ✅ Credits are allocated to the correct users

The carbon credit system is now fully functional and ready for use! 🚀
