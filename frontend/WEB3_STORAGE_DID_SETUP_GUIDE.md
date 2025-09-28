# Web3.Storage DID Setup Guide

## Overview

Web3.Storage now uses DID (Decentralized Identifier) keys instead of traditional API tokens. This guide will help you set up real IPFS uploads using the new DID-based authentication.

## Step 1: Get Your Web3.Storage DID Key

### New Web3.Storage (DID-based)

1. Go to [web3.storage](https://web3.storage)
2. Sign up for a free account or log in
3. Go to your account settings or API section
4. Look for "DID Key" or "Space DID"
5. Copy your DID key (format: `did:key:z6MkttyCL4Z5v56YRnc7fVvHZfyGDQXW922CgVBrBfMmcUM2`)

### What is a DID Key?

- **DID** = Decentralized Identifier
- **Format**: `did:key:z6Mk...` (starts with `did:key:`)
- **Purpose**: Cryptographic identity for decentralized authentication
- **Benefits**: No centralized API key management, more secure

## Step 2: Update Environment Variables

Update your `frontend/.env` file:

```env
# New DID-based Web3.Storage (preferred)
VITE_WEB3_STORAGE_DID="did:key:z6MkttyCL4Z5v56YRnc7fVvHZfyGDQXW922CgVBrBfMmcUM2"

# Legacy token support (if you have an old account)
# VITE_WEB3_STORAGE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Optional: Alternative IPFS services for redundancy
# VITE_PINATA_API_KEY="your_pinata_api_key"
# VITE_PINATA_SECRET_KEY="your_pinata_secret_key"
# VITE_NFT_STORAGE_TOKEN="your_nft_storage_token"
```

## Step 3: Test the Implementation

### Option A: Use the Test Page

1. Open `frontend/test-ipfs-upload.html` in your browser
2. Enter your DID key when prompted
3. Test file uploads and document accessibility
4. Verify uploads work correctly

### Option B: Use Browser Console

```javascript
// Test upload functionality
await ipfsService.testUpload();

// Check configuration
console.log(ipfsService.getUploadStatus());
```

## Implementation Details

### DID-based Upload Process

```javascript
// The service now tries multiple methods:
1. DID-based upload (preferred)
2. Legacy token-based upload (fallback)
3. Alternative IPFS services (Pinata, NFT.Storage)
```

### Authentication Headers

```javascript
// New DID authentication
Authorization: `DID ${didKey}`;

// Legacy token authentication
Authorization: `Bearer ${apiToken}`;
```

### Upload Methods Supported

1. **DID Upload** (Primary)

   ```javascript
   fetch("https://api.web3.storage/upload", {
     method: "POST",
     headers: { Authorization: `DID ${this.web3StorageDID}` },
     body: formData,
   });
   ```

2. **Token Upload** (Legacy)

   ```javascript
   fetch("https://api.web3.storage/upload", {
     method: "POST",
     headers: { Authorization: `Bearer ${this.web3StorageToken}` },
     body: formData,
   });
   ```

3. **Alternative Services** (Fallback)
   - Pinata Cloud
   - NFT.Storage
   - Other IPFS services

## Features Enhanced

### IPFS Service Updates

- ✅ **DID key support** - Primary authentication method
- ✅ **Legacy token support** - Backward compatibility
- ✅ **Multiple upload methods** - Tries DID first, then token, then alternatives
- ✅ **Better error messages** - Shows which method failed and why
- ✅ **Configuration detection** - Automatically detects available auth methods

### Document Viewer

- ✅ **Real IPFS content** - Views actual uploaded documents
- ✅ **Multiple gateways** - Tries different IPFS gateways for reliability
- ✅ **Download functionality** - Download documents from IPFS
- ✅ **Preview support** - PDF and image preview in browser

## Troubleshooting

### Common Issues

#### "IPFS service not configured"

- **Solution**: Add your DID key to `.env` file as `VITE_WEB3_STORAGE_DID`
- **Format**: `did:key:z6Mk...`

#### "DID upload failed: 401 Unauthorized"

- **Cause**: Invalid or expired DID key
- **Solution**: Get a new DID key from your Web3.Storage account

#### "DID upload failed: 403 Forbidden"

- **Cause**: DID key doesn't have upload permissions
- **Solution**: Check your Web3.Storage account permissions

#### Documents not accessible after upload

- **Cause**: IPFS propagation delay
- **Solution**: Wait 1-2 minutes, then try different gateways

### Debug Information

The service now provides detailed logging:

```javascript
console.log("🔄 Starting IPFS upload to Web3.Storage...", {
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type,
  hasDID: !!this.web3StorageDID,
  hasLegacyToken: !!this.web3StorageToken,
});
```

## Testing Your Setup

### Step 1: Check Configuration

```javascript
// In browser console
console.log(ipfsService.getUploadStatus());
```

### Step 2: Test Upload

```javascript
// In browser console
await ipfsService.testUpload();
```

### Step 3: Test Document Access

```javascript
// In browser console
await ipfsService.verifyCIDAccessibility("your_cid_here");
```

## Migration from Old API

### If you have an old Web3.Storage account:

1. **Keep your legacy token** in `VITE_WEB3_STORAGE_TOKEN`
2. **Get a new DID key** and add it as `VITE_WEB3_STORAGE_DID`
3. **The service will try DID first**, then fall back to token
4. **Eventually migrate fully to DID** for better security

### If you're setting up new:

1. **Only use DID key** - Set `VITE_WEB3_STORAGE_DID`
2. **Skip legacy token** - Leave `VITE_WEB3_STORAGE_TOKEN` empty
3. **Test thoroughly** - Use the test page to verify uploads work

## Benefits of DID-based Authentication

### Security

- ✅ **Decentralized identity** - No centralized API key management
- ✅ **Cryptographic security** - Based on public key cryptography
- ✅ **No expiration** - DID keys don't expire like API tokens

### Functionality

- ✅ **Better integration** - Works with Web3 ecosystem
- ✅ **Future-proof** - Aligned with decentralized web standards
- ✅ **Cross-platform** - Works across different Web3 services

## Next Steps

1. **Get your DID key** from Web3.Storage
2. **Update your `.env` file** with the DID key
3. **Test the upload** using the test page
4. **Upload a real document** and verify it works
5. **Check verifier can view** the uploaded document

## Files Updated

- `frontend/.env` - Updated with DID key configuration
- `frontend/src/services/ipfs.js` - Added DID authentication support
- `frontend/test-ipfs-upload.html` - Updated test page for DID keys
- `frontend/WEB3_STORAGE_DID_SETUP_GUIDE.md` - This guide

## Support

If you encounter issues:

1. **Check your DID key format** - Should start with `did:key:`
2. **Verify Web3.Storage account** - Ensure account is active
3. **Test with small files first** - Start with JSON or text files
4. **Check browser console** - Look for detailed error messages
5. **Try alternative gateways** - Use the gateway selector in DocumentViewer

Your DID key should now work with the enhanced IPFS service for real decentralized document storage! 🎯
