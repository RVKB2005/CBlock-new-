// Enhanced BlockchainService with Proper Contract Initialization
import { ethers } from "ethers";
import DocumentRegistryABI from "../abis/DocumentRegistry.json";

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
  }

  // Initialize blockchain service
  async initialize() {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);

      // Initialize read-only contracts
      await this.initializeContracts();
      this.isInitialized = true;

      console.log("✅ Blockchain service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize blockchain service:", error);
      throw error;
    }
  }

  // Get signer and initialize contracts with write access
  async getSigner() {
    try {
      if (!this.provider) {
        await this.initialize();
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      // Initialize contracts with signer for transactions
      await this.initializeContractsWithSigner();

      console.log("✅ Wallet connected:", address);

      return {
        address,
        provider: this.provider,
        signer: this.signer,
      };
    } catch (error) {
      console.error("❌ Failed to connect wallet:", error);
      throw error;
    }
  }

  // Initialize read-only contracts
  async initializeContracts() {
    const addresses = {
      documentRegistry: import.meta.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS,
    };

    // Validate contract addresses
    if (
      !addresses.documentRegistry ||
      addresses.documentRegistry ===
        "0x0000000000000000000000000000000000000000"
    ) {
      console.warn("⚠️ DocumentRegistry contract address not configured");
      return;
    }

    // Initialize read-only contract
    this.contracts.documentRegistry = new ethers.Contract(
      addresses.documentRegistry,
      DocumentRegistryABI,
      this.provider
    );

    console.log("📋 Read-only contracts initialized");
  }

  // Initialize contracts with signer for transactions
  async initializeContractsWithSigner() {
    if (!this.signer) {
      throw new Error("Signer not available. Please connect wallet first.");
    }

    const addresses = {
      documentRegistry: import.meta.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS,
    };

    // Validate contract addresses
    if (
      !addresses.documentRegistry ||
      addresses.documentRegistry ===
        "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error(
        "DocumentRegistry contract address not configured in environment variables"
      );
    }

    // Initialize contract with signer
    this.contracts.documentRegistrySigner = new ethers.Contract(
      addresses.documentRegistry,
      DocumentRegistryABI,
      this.signer
    );

    console.log("✅ Contracts initialized with signer for transactions");
  }

  // Register document on blockchain
  async registerDocument(documentData) {
    try {
      console.log("📝 Attempting to register document on blockchain...");

      // Ensure wallet is connected and contracts are initialized
      if (!this.contracts.documentRegistrySigner) {
        console.log("🔗 Wallet not connected, attempting to connect...");

        try {
          await this.getSigner();

          // Double-check after initialization
          if (!this.contracts.documentRegistrySigner) {
            throw new Error(
              "DocumentRegistry contract could not be initialized. Please check contract deployment."
            );
          }
        } catch (walletError) {
          throw new Error(
            `Wallet connection required for blockchain registration: ${walletError.message}`
          );
        }
      }

      const {
        cid,
        projectName,
        projectType,
        description,
        location,
        estimatedCredits,
      } = documentData;

      // Validate required fields
      if (!cid || !projectName) {
        throw new Error(
          "CID and project name are required for blockchain registration"
        );
      }

      console.log("📋 Registering document with data:", {
        cid,
        projectName,
        projectType: projectType || "",
        description: description || "",
        location: location || "",
        estimatedCredits: Number(estimatedCredits || 0),
      });

      // Call smart contract
      const tx = await this.contracts.documentRegistrySigner.registerDocument(
        cid,
        projectName,
        projectType || "",
        description || "",
        location || "",
        Number(estimatedCredits || 0)
      );

      console.log("⏳ Transaction submitted:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt.hash);

      // Extract document ID from events
      let documentId = null;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          const parsedLog =
            this.contracts.documentRegistrySigner.interface.parseLog(
              receipt.logs[0]
            );
          documentId = parsedLog.args.documentId?.toString();
        } catch (parseError) {
          console.warn("Could not parse document ID from transaction logs");
        }
      }

      return {
        success: true,
        hash: receipt.hash,
        documentId: documentId || `blockchain_${Date.now()}`,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    } catch (error) {
      console.error("❌ Blockchain registration failed:", error);

      // Enhanced error messages
      if (error.message.includes("user rejected")) {
        throw new Error("Transaction was rejected by user");
      } else if (error.message.includes("insufficient funds")) {
        throw new Error(
          "Insufficient funds for transaction. Please add ETH to your wallet."
        );
      } else if (error.message.includes("Wallet connection required")) {
        throw error; // Re-throw wallet connection errors as-is
      } else {
        throw new Error(`Blockchain registration failed: ${error.message}`);
      }
    }
  }

  // Get all documents from blockchain
  async getAllDocuments() {
    try {
      if (!this.contracts.documentRegistry) {
        console.warn(
          "DocumentRegistry contract not initialized. Using empty array."
        );
        return [];
      }

      console.log("📋 Fetching all documents from registry...");

      const documents = await this.contracts.documentRegistry.getAllDocuments();

      // Convert the struct array to a more usable format
      const formattedDocuments = documents.map((doc, index) => ({
        id: index + 1,
        cid: doc.cid,
        uploader: doc.uploader,
        projectName: doc.projectName,
        projectType: doc.projectType,
        description: doc.description,
        location: doc.location,
        estimatedCredits: Number(doc.estimatedCredits),
        timestamp: Number(doc.timestamp),
        isAttested: doc.isAttested,
        verifier: doc.verifier,
        attestedAt: Number(doc.attestedAt),
        uploadedAt: new Date(Number(doc.timestamp) * 1000).toISOString(),
        attestedAtFormatted:
          doc.attestedAt > 0
            ? new Date(Number(doc.attestedAt) * 1000).toISOString()
            : null,
      }));

      console.log(
        `📋 Retrieved ${formattedDocuments.length} documents from blockchain`
      );
      return formattedDocuments;
    } catch (error) {
      console.error("❌ Error getting documents from blockchain:", error);

      if (error.message.includes("not initialized")) {
        return [];
      }

      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
  }

  // Check if wallet is connected
  isWalletConnected() {
    return !!this.signer;
  }

  // Get current wallet address
  async getCurrentAddress() {
    if (!this.signer) {
      return null;
    }

    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error("Failed to get current address:", error);
      return null;
    }
  }

  // Get contract address for UI display
  getContractAddress(contractName) {
    const addresses = {
      documentRegistry: import.meta.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS,
    };

    return addresses[contractName] || null;
  }
}

// Export singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;
