class IPFSService {
  constructor() {
    this.web3StorageToken = import.meta.env.VITE_WEB3_STORAGE_TOKEN;
  }

  // Upload file to IPFS via Web3.Storage
  async uploadFile(file) {
    try {
      if (!this.web3StorageToken) {
        throw new Error('Web3.Storage token not configured');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.web3StorageToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        cid: result.cid,
        url: `https://w3s.link/ipfs/${result.cid}`,
        name: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      // Fallback to mock data for demo
      const mockCid = `baf${Math.random().toString(36).slice(2, 15)}`;
      return {
        cid: mockCid,
        url: `https://w3s.link/ipfs/${mockCid}`,
        name: file.name,
        size: file.size,
        type: file.type,
        isMock: true
      };
    }
  }

  // Upload JSON metadata to IPFS
  async uploadJSON(data) {
    try {
      if (!this.web3StorageToken) {
        throw new Error('Web3.Storage token not configured');
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const file = new File([blob], 'metadata.json', {
        type: 'application/json'
      });

      return await this.uploadFile(file);
    } catch (error) {
      console.error('JSON upload error:', error);
      // Fallback to mock data for demo
      const mockCid = `json${Math.random().toString(36).slice(2, 15)}`;
      return {
        cid: mockCid,
        url: `https://w3s.link/ipfs/${mockCid}`,
        name: 'metadata.json',
        size: JSON.stringify(data).length,
        type: 'application/json',
        isMock: true
      };
    }
  }

  // Create carbon credit metadata
  createCarbonCreditMetadata(data) {
    const {
      projectName,
      projectDescription,
      methodology,
      vintage,
      quantity,
      gsProjectId,
      gsSerial,
      verifier,
      documentCid
    } = data;

    return {
      name: `Carbon Credit - ${projectName}`,
      description: projectDescription,
      image: 'https://w3s.link/ipfs/bafkreiabvdjwclwujxgbqfpqzq5x3mdjmdx3qk3fqiepvyqm3bkm7rldlm', // Generic carbon credit image
      attributes: [
        {
          trait_type: 'Project ID',
          value: gsProjectId
        },
        {
          trait_type: 'Serial Number',
          value: gsSerial
        },
        {
          trait_type: 'Vintage',
          value: vintage
        },
        {
          trait_type: 'Quantity',
          value: quantity,
          display_type: 'number'
        },
        {
          trait_type: 'Methodology',
          value: methodology
        },
        {
          trait_type: 'Verifier',
          value: verifier
        },
        {
          trait_type: 'Standard',
          value: 'Gold Standard'
        }
      ],
      properties: {
        projectName,
        methodology,
        vintage,
        quantity,
        gsProjectId,
        gsSerial,
        verifier,
        documentCid,
        createdAt: new Date().toISOString(),
        standard: 'Gold Standard',
        status: 'active'
      }
    };
  }

  // Create retirement certificate metadata
  createRetirementCertificateMetadata(data) {
    const {
      tokenId,
      amount,
      beneficiary,
      retirementMessage,
      retiredBy,
      carbonCreditData
    } = data;

    return {
      name: `Retirement Certificate - ${amount} Credits`,
      description: `Certificate for retirement of ${amount} carbon credits${beneficiary ? ` on behalf of ${beneficiary}` : ''}`,
      image: 'https://w3s.link/ipfs/bafkreiahvdjwclwujxgbqfpqzq5x3mdjmdx3qk3fqiepvyqm3bkm7rldlm', // Generic certificate image
      attributes: [
        {
          trait_type: 'Amount Retired',
          value: amount,
          display_type: 'number'
        },
        {
          trait_type: 'Token ID',
          value: tokenId,
          display_type: 'number'
        },
        {
          trait_type: 'Retired By',
          value: retiredBy
        },
        {
          trait_type: 'Beneficiary',
          value: beneficiary || 'Self'
        },
        {
          trait_type: 'Retirement Date',
          value: new Date().toLocaleDateString()
        }
      ],
      properties: {
        tokenId,
        amount,
        beneficiary,
        retirementMessage,
        retiredBy,
        retiredAt: new Date().toISOString(),
        carbonCreditData,
        certificateType: 'Carbon Credit Retirement'
      }
    };
  }

  // Fetch metadata from IPFS
  async fetchMetadata(cid) {
    try {
      const response = await fetch(`https://w3s.link/ipfs/${cid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching IPFS metadata:', error);
      return null;
    }
  }

  // Get IPFS URL from CID
  getIPFSUrl(cid) {
    return `https://w3s.link/ipfs/${cid}`;
  }

  // Extract CID from IPFS URL
  extractCID(url) {
    const match = url.match(/\/ipfs\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  // Validate file type for carbon credit documents
  validateDocumentFile(file) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    return true;
  }

  // Check if Web3.Storage is configured
  isConfigured() {
    return !!this.web3StorageToken;
  }

  // Get upload status (for UI feedback)
  getUploadStatus() {
    if (!this.isConfigured()) {
      return {
        status: 'error',
        message: 'IPFS service not configured'
      };
    }
    
    return {
      status: 'ready',
      message: 'Ready to upload files'
    };
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
export default ipfsService;
