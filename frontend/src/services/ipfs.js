class IPFSService {
  constructor() {
    // Pinata configuration
    this.pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
    this.pinataJWT = import.meta.env.VITE_PINATA_JWT;

    // Pinata API endpoints
    this.pinataApiUrl = "https://api.pinata.cloud";
    this.pinataGatewayUrl = "https://gateway.pinata.cloud/ipfs";
  }

  // Upload file to IPFS via Pinata
  async uploadFile(file) {
    console.log("🔄 Starting IPFS upload to Pinata...", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      hasApiKey: !!this.pinataApiKey,
      hasJWT: !!this.pinataJWT,
    });

    // Validate file before upload
    this.validateDocumentFile(file);

    // Try JWT-based upload first (recommended)
    if (this.pinataJWT) {
      try {
        return await this.uploadWithJWT(file);
      } catch (error) {
        console.warn(
          "⚠️ JWT-based upload failed, trying API key method:",
          error.message
        );
      }
    }

    // Try API key-based upload as fallback
    if (this.pinataApiKey && this.pinataSecretKey) {
      try {
        return await this.uploadWithApiKey(file);
      } catch (error) {
        console.warn("⚠️ API key-based upload failed:", error.message);
      }
    }

    // Final fallback to mock IPFS for development
    try {
      console.log(
        "⚠️ No Pinata credentials configured, using mock IPFS for development"
      );
      return await this.uploadViaMockIPFS(file);
    } catch (mockError) {
      console.error("❌ All upload methods failed:", mockError);
      throw new Error(
        `IPFS upload failed: Please check your Pinata configuration. Ensure you have either VITE_PINATA_JWT or VITE_PINATA_API_KEY configured.`
      );
    }
  }

  // Upload using Pinata JWT (recommended method)
  async uploadWithJWT(file) {
    console.log("📤 Uploading to Pinata with JWT...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Add metadata for better organization
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          fileType: file.type,
          fileSize: file.size.toString(),
          source: "carbon-credit-app",
        },
      });
      formData.append("pinataMetadata", metadata);

      // Add pinning options
      const options = JSON.stringify({
        cidVersion: 1,
        customPinPolicy: {
          regions: [
            { id: "FRA1", desiredReplicationCount: 1 },
            { id: "NYC1", desiredReplicationCount: 1 },
          ],
        },
      });
      formData.append("pinataOptions", options);

      const response = await fetch(
        `${this.pinataApiUrl}/pinning/pinFileToIPFS`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.pinataJWT}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Pinata JWT upload successful:", result);

        return {
          cid: result.IpfsHash,
          url: `${this.pinataGatewayUrl}/${result.IpfsHash}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          gateway: "pinata",
          method: "JWT",
          pinSize: result.PinSize,
          timestamp: result.Timestamp,
        };
      } else {
        const errorText = await response.text();
        console.error("Pinata JWT upload failed:", response.status, errorText);
        throw new Error(
          `Pinata JWT upload failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("❌ Pinata JWT upload error:", error);
      throw error;
    }
  }

  // Upload using Pinata API Key (fallback method)
  async uploadWithApiKey(file) {
    console.log("📤 Uploading to Pinata with API Key...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Add metadata for better organization
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          fileType: file.type,
          fileSize: file.size.toString(),
          source: "carbon-credit-app",
        },
      });
      formData.append("pinataMetadata", metadata);

      const response = await fetch(
        `${this.pinataApiUrl}/pinning/pinFileToIPFS`,
        {
          method: "POST",
          headers: {
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Pinata API Key upload successful:", result);

        return {
          cid: result.IpfsHash,
          url: `${this.pinataGatewayUrl}/${result.IpfsHash}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          gateway: "pinata",
          method: "API_KEY",
          pinSize: result.PinSize,
          timestamp: result.Timestamp,
        };
      } else {
        const errorText = await response.text();
        console.error(
          "Pinata API Key upload failed:",
          response.status,
          errorText
        );
        throw new Error(
          `Pinata API Key upload failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("❌ Pinata API Key upload error:", error);
      throw error;
    }
  }

  // Test Pinata connection and authentication
  async testConnection() {
    console.log("🔍 Testing Pinata connection...");

    try {
      const response = await fetch(
        `${this.pinataApiUrl}/data/testAuthentication`,
        {
          method: "GET",
          headers: this.pinataJWT
            ? {
                Authorization: `Bearer ${this.pinataJWT}`,
              }
            : {
                pinata_api_key: this.pinataApiKey,
                pinata_secret_api_key: this.pinataSecretKey,
              },
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Pinata connection successful:", result);
        return { success: true, message: result.message };
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Pinata connection failed:",
          response.status,
          errorText
        );
        return {
          success: false,
          error: `Connection failed: ${response.status}`,
        };
      }
    } catch (error) {
      console.error("❌ Pinata connection test error:", error);
      return { success: false, error: error.message };
    }
  }

  // Mock IPFS upload for development/testing
  async uploadViaMockIPFS(file) {
    console.log("🧪 Using mock IPFS upload for development");

    // Generate a mock CID based on file content
    const fileContent = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", fileContent);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const mockCid = `QmMock${hashHex.substring(0, 40)}`;

    // Store file in localStorage for retrieval
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        try {
          localStorage.setItem(`ipfs_mock_${mockCid}`, reader.result);
          console.log(`✅ Mock IPFS upload successful: ${mockCid}`);

          // Return object with same structure as real IPFS services
          resolve({
            cid: mockCid,
            url: `mock://ipfs/${mockCid}`,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            gateway: "mock",
            method: "mock",
            isMock: true,
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Get file from IPFS using CID
  async getFile(cid) {
    console.log(`📥 Retrieving file from IPFS: ${cid}`);

    // Try Pinata gateway first
    const gateways = [
      `${this.pinataGatewayUrl}/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway);
        if (response.ok) {
          console.log(`✅ File retrieved from: ${gateway}`);
          return {
            url: gateway,
            data: await response.blob(),
            gateway: gateway.includes("pinata") ? "pinata" : "public",
          };
        }
      } catch (error) {
        console.warn(`⚠️ Failed to retrieve from ${gateway}:`, error.message);
      }
    }

    // Check if it's a mock CID
    if (cid.startsWith("QmMock")) {
      const mockData = localStorage.getItem(`ipfs_mock_${cid}`);
      if (mockData) {
        console.log(`✅ Retrieved mock file: ${cid}`);
        return {
          url: `mock://ipfs/${cid}`,
          data: mockData,
          gateway: "mock",
        };
      }
    }

    throw new Error(`Failed to retrieve file from IPFS: ${cid}`);
  }

  // Upload JSON metadata to IPFS via Pinata
  async uploadJSON(data) {
    try {
      console.log("📤 Uploading JSON metadata to Pinata...");

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const file = new File([blob], "metadata.json", {
        type: "application/json",
      });

      return await this.uploadFile(file);
    } catch (error) {
      console.error("❌ JSON upload error:", error);
      // Fallback to mock data for development
      const mockCid = `QmMockJson${Math.random().toString(36).slice(2, 15)}`;

      // Store mock JSON in localStorage
      localStorage.setItem(
        `ipfs_mock_${mockCid}`,
        JSON.stringify(data, null, 2)
      );

      return {
        cid: mockCid,
        url: `mock://ipfs/${mockCid}`,
        name: "metadata.json",
        size: JSON.stringify(data).length,
        type: "application/json",
        uploadedAt: new Date().toISOString(),
        gateway: "mock",
        method: "mock",
        isMock: true,
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
      documentCid,
    } = data;

    return {
      name: `Carbon Credit - ${projectName}`,
      description: projectDescription,
      image: `${this.pinataGatewayUrl}/bafkreiabvdjwclwujxgbqfpqzq5x3mdjmdx3qk3fqiepvyqm3bkm7rldlm`, // Generic carbon credit image
      attributes: [
        {
          trait_type: "Project ID",
          value: gsProjectId,
        },
        {
          trait_type: "Serial Number",
          value: gsSerial,
        },
        {
          trait_type: "Vintage",
          value: vintage,
        },
        {
          trait_type: "Quantity",
          value: quantity,
          display_type: "number",
        },
        {
          trait_type: "Methodology",
          value: methodology,
        },
        {
          trait_type: "Verifier",
          value: verifier,
        },
        {
          trait_type: "Standard",
          value: "Gold Standard",
        },
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
        standard: "Gold Standard",
        status: "active",
      },
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
      carbonCreditData,
    } = data;

    return {
      name: `Retirement Certificate - ${amount} Credits`,
      description: `Certificate for retirement of ${amount} carbon credits${
        beneficiary ? ` on behalf of ${beneficiary}` : ""
      }`,
      image: `${this.pinataGatewayUrl}/bafkreiahvdjwclwujxgbqfpqzq5x3mdjmdx3qk3fqiepvyqm3bkm7rldlm`, // Generic certificate image
      attributes: [
        {
          trait_type: "Amount Retired",
          value: amount,
          display_type: "number",
        },
        {
          trait_type: "Token ID",
          value: tokenId,
          display_type: "number",
        },
        {
          trait_type: "Retired By",
          value: retiredBy,
        },
        {
          trait_type: "Beneficiary",
          value: beneficiary || "Self",
        },
        {
          trait_type: "Retirement Date",
          value: new Date().toLocaleDateString(),
        },
      ],
      properties: {
        tokenId,
        amount,
        beneficiary,
        retirementMessage,
        retiredBy,
        retiredAt: new Date().toISOString(),
        carbonCreditData,
        certificateType: "Carbon Credit Retirement",
      },
    };
  }

  // Fetch metadata from IPFS via Pinata gateway
  async fetchMetadata(cid) {
    try {
      // Try Pinata gateway first
      let response = await fetch(`${this.pinataGatewayUrl}/${cid}`);

      if (!response.ok) {
        // Fallback to public IPFS gateway
        console.warn("⚠️ Pinata gateway failed, trying public gateway");
        response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Error fetching IPFS metadata:", error);

      // Check if it's a mock CID
      if (cid.startsWith("QmMock")) {
        const mockData = localStorage.getItem(`ipfs_mock_${cid}`);
        if (mockData) {
          try {
            return JSON.parse(mockData);
          } catch (parseError) {
            console.error("❌ Error parsing mock metadata:", parseError);
          }
        }
      }

      return null;
    }
  }

  // Get IPFS URL from CID (using Pinata gateway)
  getIPFSUrl(cid) {
    return `${this.pinataGatewayUrl}/${cid}`;
  }

  // Extract CID from IPFS URL
  extractCID(url) {
    const match = url.match(/\/ipfs\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  // Validate file type for carbon credit documents
  validateDocumentFile(file) {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Invalid file type. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files."
      );
    }

    if (file.size > maxSize) {
      throw new Error("File too large. Maximum size is 10MB.");
    }

    return true;
  }

  // Check if Pinata is configured
  isConfigured() {
    return !!(this.pinataJWT || (this.pinataApiKey && this.pinataSecretKey));
  }

  // Get upload status (for UI feedback)
  getUploadStatus() {
    if (!this.isConfigured()) {
      return {
        status: "error",
        message:
          "Pinata IPFS service not configured - Please set VITE_PINATA_JWT or VITE_PINATA_API_KEY + VITE_PINATA_SECRET_KEY",
      };
    }

    const configType = this.pinataJWT
      ? "JWT"
      : this.pinataApiKey && this.pinataSecretKey
      ? "API_KEY"
      : "Mock";

    return {
      status: "ready",
      message: `Ready to upload files to IPFS via Pinata (using ${configType})`,
      configType,
      hasJWT: !!this.pinataJWT,
      hasApiKey: !!(this.pinataApiKey && this.pinataSecretKey),
      service: "Pinata",
    };
  }

  // Test IPFS upload with a small test file
  async testUpload() {
    try {
      const testContent = JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        message: "IPFS upload test",
      });

      const testFile = new File([testContent], "test.json", {
        type: "application/json",
      });

      console.log("🧪 Testing IPFS upload...");
      const result = await this.uploadFile(testFile);

      // Verify the upload by trying to fetch it back
      const fetchedContent = await this.fetchMetadata(result.cid);

      if (fetchedContent && fetchedContent.test === true) {
        console.log("✅ IPFS upload test successful!");
        return {
          success: true,
          cid: result.cid,
          url: result.url,
          message: "IPFS upload working correctly",
        };
      } else {
        throw new Error("Upload succeeded but content verification failed");
      }
    } catch (error) {
      console.error("❌ IPFS upload test failed:", error);
      return {
        success: false,
        error: error.message,
        message: "IPFS upload test failed",
      };
    }
  }

  // Get multiple gateway URLs for better reliability (Pinata first)
  getGatewayUrls(cid) {
    return [
      `${this.pinataGatewayUrl}/${cid}`, // Pinata gateway (primary)
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
      `https://gateway.ipfs.io/ipfs/${cid}`,
    ];
  }

  // Fetch file with multiple gateway fallbacks
  async fetchFileWithFallback(cid) {
    const gateways = this.getGatewayUrls(cid);

    for (const url of gateways) {
      try {
        console.log(`🔄 Trying to fetch from: ${url}`);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        });

        if (response.ok) {
          console.log(`✅ Successfully fetched from: ${url}`);
          return {
            success: true,
            url,
            response,
            blob: await response.blob(),
          };
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${url}:`, error.message);
        continue;
      }
    }

    throw new Error(
      `Failed to fetch file from all IPFS gateways for CID: ${cid}`
    );
  }

  // Check if a CID is accessible
  async verifyCIDAccessibility(cid) {
    try {
      const result = await this.fetchFileWithFallback(cid);
      return {
        accessible: true,
        url: result.url,
        size: result.blob.size,
      };
    } catch (error) {
      return {
        accessible: false,
        error: error.message,
      };
    }
  }

  // Get allowed file types for document uploads
  getAllowedFileTypes() {
    return [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
    ];
  }

  // Get maximum file size
  getMaxFileSize() {
    return 10 * 1024 * 1024; // 10MB
  }

  // Get Pinata service information
  getPinataInfo() {
    return {
      service: "Pinata",
      apiUrl: this.pinataApiUrl,
      gatewayUrl: this.pinataGatewayUrl,
      hasJWT: !!this.pinataJWT,
      hasApiKey: !!(this.pinataApiKey && this.pinataSecretKey),
      configured: this.isConfigured(),
    };
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
export default ipfsService;
