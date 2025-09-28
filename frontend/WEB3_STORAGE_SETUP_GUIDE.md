# Web3.Storage Setup Guide

## Overview

This guide will help you set up real IPFS uploads using Web3.Storage instead of mock data, and enable verifiers to view documents stored on the blockchain.

## Step 1: Get a Web3.Storage API Token

### Option A: Web3.Storage (Recommended)

1. Go to [web3.storage](https://web3.storage)
2. Sign up for a free account
3. Go to your account settings
4. Create a new API token
5. Copy the token (it should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Option B: Alternative IPFS Services

#### Pinata

1. Go to [pinata.cloud](https://pinata.cloud)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Copy both the API Key and Secret Key

#### NFT.Storage

1. Go to [nft.storage](https://nft.storage)
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key

## Step 2: Update Environment Variables

Update your `frontend/.env` file:

```env
# Replace the current DID key with a real Web3.Storage API token
VITE_WEB3_STORAGE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Optional: Add alternative IPFS services for redundancy
VITE_PINATA_API_KEY="your_pinata_api_key"
VITE_PINATA_SECRET_KEY="your_pinata_secret_key"
VITE_NFT_STORAGE_TOKEN="your_nft_storage_token"
```

## Step 3: Test IPFS Upload

Use the built-in test functionality:

```javascript
// In browser console or test file
import ipfsService from "./src/services/ipfs.js";

// Test the upload
const testResult = await ipfsService.testUpload();
console.log("Test result:", testResult);
```

## Step 4: Verify Document Viewing

1. Upload a document as a regular user
2. Login as a verifier
3. Go to Verifier Dashboard
4. Click on a document to view details
5. The DocumentViewer should show:
   - Document accessibility status
   - Multiple IPFS gateway options
   - Preview (for PDFs and images)
   - Download functionality

## Features Implemented

### Enhanced IPFS Service

- ✅ Real Web3.Storage uploads
- ✅ Multiple IPFS gateway fallbacks
- ✅ Alternative service support (Pinata, NFT.Storage)
- ✅ Upload verification and testing
- ✅ No mock fallbacks (throws errors instead)

### Document Viewer Component

- ✅ Document accessibility checking
- ✅ Multiple IPFS gateway selection
- ✅ PDF and image preview
- ✅ Download functionality
- ✅ Technical details display
- ✅ Error handling and retry

### Verifier Dashboard Integration

- ✅ Document viewer embedded in details modal
- ✅ Real-time accessibility checking
- ✅ Gateway switching for reliability

## Troubleshooting

### Upload Fails

1. **Check API Token**: Ensure your Web3.Storage token is valid
2. **Check File Size**: Web3.Storage has file size limits
3. **Check File Type**: Ensure file type is supported
4. **Network Issues**: Try alternative IPFS services

### Document Not Accessible

1. **Wait for Propagation**: IPFS content may take time to propagate
2. **Try Different Gateways**: Use the gateway selector in DocumentViewer
3. **Check CID Format**: Ensure CID is valid IPFS format

### Common Error Messages

#### "Web3.Storage token not configured"

- Solution: Add valid `VITE_WEB3_STORAGE_TOKEN` to your `.env` file

#### "IPFS upload failed"

- Solution: Check your API token and try alternative services

#### "Document Not Accessible"

- Solution: Wait a few minutes for IPFS propagation, then try different gateways

## Testing Commands

### Test IPFS Upload

```bash
# In browser console
ipfsService.testUpload().then(console.log)
```

### Check Document Accessibility

```bash
# In browser console
ipfsService.verifyCIDAccessibility('your_cid_here').then(console.log)
```

### Get Gateway URLs

```bash
# In browser console
console.log(ipfsService.getGatewayUrls('your_cid_here'))
```

## File Size Limits

- **Web3.Storage**: 32GB per file
- **Pinata**: 1GB per file (free tier)
- **NFT.Storage**: 32GB per file
- **Application Limit**: 10MB (configurable in ipfs.js)

## Supported File Types

- PDF documents
- Microsoft Word (.doc, .docx)
- Text files (.txt)
- Images (JPEG, PNG)

## Security Considerations

1. **API Keys**: Keep your API keys secure and don't commit them to version control
2. **File Validation**: All files are validated before upload
3. **Content Verification**: Uploaded content is verified by fetching it back
4. **Gateway Diversity**: Multiple gateways provide redundancy and censorship resistance

## Next Steps

1. Set up your Web3.Storage account and API token
2. Update your `.env` file with the real token
3. Test document upload and viewing
4. Consider setting up alternative IPFS services for redundancy
5. Monitor upload success rates and gateway performance

## Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify your API tokens are correct
3. Test with small files first
4. Try different IPFS gateways
5. Check Web3.Storage service status
