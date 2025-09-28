import { ethers } from "ethers";
import errorHandler from "./errorHandler.js";
import toastNotifications from "../components/ToastNotifications.jsx";
import retryService from "./retryService.js";

// Import ABI files
import CarbonCreditABI from "../abis/CarbonCredit.json";
import MarketplaceABI from "../abis/Marketplace.json";
import RetirementCertificateABI from "../abis/RetirementCertificate.json";
import VerifierRegistryABI from "../abis/VerifierRegistry.json";
import DocumentRegistryABI from "../abis/DocumentRegistry.json";

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.isInitialized = false;
  }

  // Initialize the blockchain service
  async initialize() {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this application");
      }

      // Create provider
      this.provider = new ethers.BrowserProvider(window.ethereum);

      // Get network info
      const network = await this.provider.getNetwork();
      const expectedChainId = BigInt(import.meta.env.VITE_CHAIN_ID || 11155111);

      if (network.chainId !== expectedChainId) {
        await this.switchToSepoliaNetwork();
      }

      // Initialize contracts
      await this.initializeContracts();
      this.isInitialized = true;

      console.log("Blockchain service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize blockchain service:", error);
      throw error;
    }
  }

  // Switch to Sepolia network
  async switchToSepoliaNetwork() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia chain ID in hex
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia Test Network",
              nativeCurrency: {
                name: "SepoliaETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [
                import.meta.env.VITE_SEPOLIA_RPC_URL ||
                  "https://sepolia.infura.io/v3/",
              ],
              blockExplorerUrls: ["https://sepolia.etherscan.io/"],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  // Initialize smart contracts
  async initializeContracts() {
    const addresses = {
      carbon: import.meta.env.VITE_CONTRACT_CARBON_ADDRESS,
      marketplace: import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS,
      retirementCert: import.meta.env
        .VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS,
      verifierRegistry: import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS,
      documentRegistry: import.meta.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS,
    };

    // Check if addresses are configured
    const hasValidAddresses = Object.values(addresses).some(
      (addr) => addr && addr !== "0x0000000000000000000000000000000000000000"
    );

    if (!hasValidAddresses) {
      console.warn(
        "Smart contract addresses not configured. Please deploy contracts and update .env file."
      );
      return;
    }

    try {
      if (
        addresses.carbon &&
        addresses.carbon !== "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.carbon = new ethers.Contract(
          addresses.carbon,
          CarbonCreditABI,
          this.provider
        );
      }

      if (
        addresses.marketplace &&
        addresses.marketplace !== "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.marketplace = new ethers.Contract(
          addresses.marketplace,
          MarketplaceABI,
          this.provider
        );
      }

      if (
        addresses.retirementCert &&
        addresses.retirementCert !==
          "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.retirementCert = new ethers.Contract(
          addresses.retirementCert,
          RetirementCertificateABI,
          this.provider
        );
      }

      if (
        addresses.verifierRegistry &&
        addresses.verifierRegistry !==
          "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.verifierRegistry = new ethers.Contract(
          addresses.verifierRegistry,
          VerifierRegistryABI,
          this.provider
        );
      }

      if (
        addresses.documentRegistry &&
        addresses.documentRegistry !==
          "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.documentRegistry = new ethers.Contract(
          addresses.documentRegistry,
          DocumentRegistryABI,
          this.provider
        );
      }
    } catch (error) {
      console.error("Error initializing contracts:", error);
    }
  }

  // Connect wallet and get signer
  async connectWallet() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      // Reinitialize contracts with signer
      await this.initializeContractsWithSigner();

      return {
        address,
        provider: this.provider,
        signer: this.signer,
      };
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  // Get current wallet address
  async getCurrentAddress() {
    try {
      if (!this.signer) {
        // Try to connect wallet if signer is not available
        const connection = await this.connectWallet();
        return connection.address;
      }

      return await this.signer.getAddress();
    } catch (error) {
      console.error("Failed to get current address:", error);
      throw new Error(
        "Unable to get wallet address. Please connect your wallet."
      );
    }
  }

  // Initialize contracts with signer for transactions
  async initializeContractsWithSigner() {
    if (!this.signer) return;

    const addresses = {
      carbon: import.meta.env.VITE_CONTRACT_CARBON_ADDRESS,
      marketplace: import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS,
      retirementCert: import.meta.env
        .VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS,
      verifierRegistry: import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS,
      documentRegistry: import.meta.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS,
    };

    try {
      if (
        addresses.carbon &&
        addresses.carbon !== "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.carbonSigner = new ethers.Contract(
          addresses.carbon,
          CarbonCreditABI,
          this.signer
        );
      }

      if (
        addresses.marketplace &&
        addresses.marketplace !== "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.marketplaceSigner = new ethers.Contract(
          addresses.marketplace,
          MarketplaceABI,
          this.signer
        );
      }

      if (
        addresses.retirementCert &&
        addresses.retirementCert !==
          "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.retirementCertSigner = new ethers.Contract(
          addresses.retirementCert,
          RetirementCertificateABI,
          this.signer
        );
      }

      if (
        addresses.verifierRegistry &&
        addresses.verifierRegistry !==
          "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.verifierRegistrySigner = new ethers.Contract(
          addresses.verifierRegistry,
          VerifierRegistryABI,
          this.signer
        );
      }

      if (
        addresses.documentRegistry &&
        addresses.documentRegistry !==
          "0x0000000000000000000000000000000000000000"
      ) {
        this.contracts.documentRegistrySigner = new ethers.Contract(
          addresses.documentRegistry,
          DocumentRegistryABI,
          this.signer
        );
      }
    } catch (error) {
      console.error("Error initializing contracts with signer:", error);
    }
  }

  // Get user's carbon credit balance for a specific token ID
  async getTokenBalance(userAddress, tokenId) {
    try {
      if (!this.contracts.carbon) {
        throw new Error("Carbon contract not initialized");
      }

      const balance = await this.contracts.carbon.balanceOf(
        userAddress,
        tokenId
      );
      return Number(balance.toString());
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }

  // Get all tokens owned by user
  async getUserTokens(userAddress) {
    try {
      if (!this.contracts.carbon) {
        return [];
      }

      const nextTokenId = await this.contracts.carbon.nextTokenId();
      const tokens = [];

      for (let i = 1; i < Number(nextTokenId); i++) {
        const balance = await this.getTokenBalance(userAddress, i);
        if (balance > 0) {
          const tokenURI = await this.contracts.carbon.uri(i);
          tokens.push({
            tokenId: i,
            balance,
            uri: tokenURI,
            metadata: null, // Will be fetched separately if needed
          });
        }
      }

      return tokens;
    } catch (error) {
      console.error("Error getting user tokens:", error);
      return [];
    }
  }

  // Mint carbon credits with verifier attestation
  async mintCarbonCredits(attestationData) {
    try {
      // Ensure wallet is connected and contracts are initialized
      if (!this.signer) {
        console.log("🔗 Signer not available, connecting wallet...");
        await this.connectWallet();
      }

      if (!this.contracts.carbonSigner) {
        throw new Error(
          "Carbon contract with signer not initialized. Please connect your wallet."
        );
      }

      const {
        recipient,
        gsProjectId,
        gsSerial,
        vintage,
        amount,
        quantity = amount, // Support both amount and quantity for backward compatibility
        ipfsCid,
        ipfsHash = ipfsCid, // Support both ipfsCid and ipfsHash for backward compatibility
        nonce,
        signature,
      } = attestationData;

      console.log("🪙 Minting carbon credits:", {
        recipient,
        gsProjectId,
        gsSerial,
        ipfsHash: ipfsHash || ipfsCid,
        quantity: (quantity || amount).toString(),
      });

      // Show transaction pending notification
      const pendingToastId = toastNotifications.transactionPending(
        "credit minting",
        "verifier"
      );

      try {
        const tx = await retryService.retryBlockchainTransaction(
          (gasPrice) =>
            this.contracts.carbonSigner.mintWithAttestation(
              gsProjectId,
              gsSerial,
              ipfsHash || ipfsCid,
              BigInt(quantity || amount), // Use raw quantity/amount as BigInt - not parseEther
              recipient,
              signature,
              gasPrice ? { gasPrice } : {}
            ),
          {
            maxRetries: 3,
            initialGasPrice: null,
          }
        );

        console.log("⛓️ Minting transaction submitted:", tx.hash);

        // Show success notification
        toastNotifications.transactionSuccess(
          "credit minting",
          "verifier",
          tx.hash
        );

        return {
          hash: tx.hash,
          transaction: tx,
        };
      } catch (error) {
        // Show error notification
        toastNotifications.transactionError(
          "credit minting",
          error.message,
          "verifier"
        );

        // Use enhanced error handler
        throw errorHandler.handleBlockchainError(error, "credit_minting", {
          recipient,
          gsProjectId,
          quantity: quantity.toString(),
          retryAction: () => this.mintCarbonCredits(attestationData),
        });
      }
    } catch (error) {
      console.error("Error minting carbon credits:", {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data,
        stack: error.stack,
      });

      // Provide more user-friendly error messages
      let userMessage = error.message;
      if (error.code === "CALL_EXCEPTION") {
        userMessage =
          "Contract call failed. Please check if the contract is deployed and your wallet is connected.";
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        userMessage =
          "Insufficient funds for transaction. Please add more ETH to your wallet.";
      } else if (error.code === "USER_REJECTED") {
        userMessage = "Transaction was rejected by user.";
      } else if (error.message.includes("signer")) {
        userMessage =
          "Wallet not connected. Please connect your wallet and try again.";
      }

      const enhancedError = new Error(userMessage);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Mint carbon credits with document tracking and automatic allocation
   * @param {Object} attestationData - Attestation data for minting
   * @param {string} documentId - Document ID for tracking
   * @param {Object} documentData - Document information for allocation tracking
   * @returns {Promise<Object>} Minting result with document tracking and allocation
   */
  async mintCarbonCreditsWithDocumentTracking(
    attestationData,
    documentId,
    documentData = null
  ) {
    try {
      console.log("🪙 Minting carbon credits with document tracking:", {
        documentId,
        recipient: attestationData.recipient,
        amount: attestationData.amount || attestationData.quantity,
      });

      // First, mint the credits using existing method
      const mintingResult = await this.mintCarbonCredits(attestationData);

      // Wait for transaction to be mined to get token ID
      const receipt = await mintingResult.transaction.wait();

      // Try to extract token ID from events
      let tokenId = null;
      try {
        for (const log of receipt.logs) {
          try {
            const parsedLog = this.contracts.carbon.interface.parseLog(log);
            if (
              parsedLog.name === "TransferSingle" &&
              parsedLog.args.to === attestationData.recipient
            ) {
              tokenId = Number(parsedLog.args.id);
              break;
            }
          } catch (e) {
            // Skip logs that can't be parsed
            continue;
          }
        }
      } catch (eventError) {
        console.warn("Could not extract token ID from events:", eventError);
      }

      const enhancedResult = {
        ...mintingResult,
        receipt,
        tokenId,
        documentId,
        recipient: attestationData.recipient,
        amount: attestationData.quantity,
      };

      // Process automatic credit allocation if document data is provided
      if (documentData) {
        try {
          // Import credit allocation service dynamically to avoid circular dependencies
          const { default: creditAllocationService } = await import(
            "./creditAllocation.js"
          );

          console.log("💰 Processing automatic credit allocation...");
          const allocationResult =
            await creditAllocationService.processAutomaticAllocation(
              enhancedResult,
              documentData
            );

          enhancedResult.allocation = allocationResult;
          console.log("✅ Automatic credit allocation completed successfully");
        } catch (allocationError) {
          console.error(
            "⚠️ Credit allocation failed, but minting was successful:",
            allocationError
          );
          // Don't fail the entire minting process if allocation fails
          enhancedResult.allocationError = allocationError.message;
        }
      }

      return enhancedResult;
    } catch (error) {
      console.error("Error minting carbon credits with document tracking:", {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data,
        documentId,
        recipient: attestationData.recipient,
      });

      // Provide more user-friendly error messages
      let userMessage = error.message;
      if (error.message && error.message.includes("signer")) {
        userMessage =
          "Wallet not connected. Please connect your wallet and try again.";
      } else if (
        error.message &&
        error.message.includes("Contract call failed")
      ) {
        userMessage =
          "Contract interaction failed. Please check your network connection and try again.";
      }

      const enhancedError = new Error(userMessage);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  // Get marketplace listings
  async getMarketplaceListings() {
    try {
      if (!this.contracts.marketplace) {
        return [];
      }

      const nextListingId = await this.contracts.marketplace.nextListingId();
      const listings = [];

      // Start from 1 because listings are 1-indexed
      // Be conservative: check up to nextListingId (inclusive) but handle errors gracefully
      const maxId = Number(nextListingId);
      for (let i = 1; i <= maxId; i++) {
        try {
          const listing = await this.contracts.marketplace.listings(i);
          // Check if listing has amount > 0 (active)
          if (Number(listing.amount) > 0) {
            listings.push({
              id: i,
              seller: listing.seller,
              tokenId: Number(listing.tokenId),
              amount: Number(listing.amount),
              pricePerToken: Number(ethers.formatEther(listing.pricePerUnit)),
              active: true,
            });
          }
        } catch (e) {
          // Skip invalid listings
          continue;
        }
      }

      return listings;
    } catch (error) {
      console.error("Error getting marketplace listings:", error);
      return [];
    }
  }

  // List carbon credits for sale
  async listCarbonCredits(tokenId, amount, priceInETH) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error("Marketplace contract with signer not initialized");
      }

      // First approve marketplace to transfer tokens
      const approveTx = await this.contracts.carbonSigner.setApprovalForAll(
        import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS,
        true
      );
      await approveTx.wait();

      // List the tokens
      const listTx = await this.contracts.marketplaceSigner.list(
        tokenId,
        amount,
        ethers.parseEther(priceInETH.toString())
      );

      return {
        hash: listTx.hash,
        transaction: listTx,
      };
    } catch (error) {
      console.error("Error listing carbon credits:", error);
      throw error;
    }
  }

  // Buy carbon credits from marketplace
  async buyCarbonCredits(listingId, amount) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error("Marketplace contract with signer not initialized");
      }

      // Get listing details to calculate total cost
      const listing = await this.contracts.marketplace.listings(listingId);
      const totalCost = BigInt(listing.pricePerUnit) * BigInt(amount);

      console.log("🛒 Buying tokens:", {
        listingId,
        amount,
        pricePerUnit: listing.pricePerUnit.toString(),
        totalCost: totalCost.toString(),
      });

      const buyTx = await this.contracts.marketplaceSigner.buy(
        listingId,
        amount,
        {
          value: totalCost,
          gasLimit: 500000, // Add gas limit
        }
      );

      return {
        hash: buyTx.hash,
        transaction: buyTx,
      };
    } catch (error) {
      console.error("Error buying carbon credits:", error);
      throw error;
    }
  }

  // Retire carbon credits
  async retireCarbonCredits(tokenId, amount, retirementData) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error("Marketplace contract with signer not initialized");
      }

      const { beneficiary, retirementMessage, ipfsHash } = retirementData;

      const retireTx = await this.contracts.marketplaceSigner.retire(
        tokenId,
        amount,
        beneficiary || "",
        retirementMessage || "",
        ipfsHash || ""
      );

      return {
        hash: retireTx.hash,
        transaction: retireTx,
      };
    } catch (error) {
      console.error("Error retiring carbon credits:", error);
      throw error;
    }
  }

  // Get retirement certificates for a user
  async getRetirementCertificates(userAddress) {
    try {
      if (!this.contracts.retirementCert) {
        return [];
      }

      // This is a simplified approach - in a production app you'd want to use events
      const balance = await this.contracts.retirementCert.balanceOf(
        userAddress
      );
      const certificates = [];

      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId =
            await this.contracts.retirementCert.tokenOfOwnerByIndex(
              userAddress,
              i
            );
          const tokenURI = await this.contracts.retirementCert.tokenURI(
            tokenId
          );
          certificates.push({
            tokenId: Number(tokenId),
            uri: tokenURI,
          });
        } catch (e) {
          // Skip if method doesn't exist or fails
          continue;
        }
      }

      return certificates;
    } catch (error) {
      console.error("Error getting retirement certificates:", error);
      return [];
    }
  }

  // Check if contract addresses are configured
  isConfigured() {
    const addresses = [
      import.meta.env.VITE_CONTRACT_CARBON_ADDRESS,
      import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS,
    ];

    return addresses.some(
      (addr) => addr && addr !== "0x0000000000000000000000000000000000000000"
    );
  }

  // Get current network
  async getNetwork() {
    if (!this.provider) return null;
    return await this.provider.getNetwork();
  }

  // Format address for display
  formatAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Take down a listing by buying the full amount (for listing owners)
  async takeDownListing(listingId) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error("Marketplace contract with signer not initialized");
      }

      // Get listing details
      const listing = await this.contracts.marketplace.listings(listingId);
      const fullAmount = Number(listing.amount);
      const totalCost = BigInt(listing.pricePerUnit) * BigInt(fullAmount);

      console.log("🗑️ Taking down listing:", {
        listingId,
        fullAmount,
        pricePerUnit: listing.pricePerUnit.toString(),
        totalCost: totalCost.toString(),
      });

      // Buy the full amount to take down the listing
      const buyTx = await this.contracts.marketplaceSigner.buy(
        listingId,
        fullAmount,
        {
          value: totalCost,
          gasLimit: 500000,
        }
      );

      return {
        hash: buyTx.hash,
        transaction: buyTx,
      };
    } catch (error) {
      console.error("Error taking down listing:", error);
      throw error;
    }
  }

  // Wait for transaction confirmation
  async waitForTransaction(txHash, confirmations = 1) {
    if (!this.provider) throw new Error("Provider not initialized");
    return await this.provider.waitForTransaction(txHash, confirmations);
  }

  // Document Registry Methods

  /**
   * Register a new document in the DocumentRegistry contract
   * @param {Object} documentData - Document metadata
   * @param {string} documentData.cid - IPFS Content Identifier
   * @param {string} documentData.projectName - Name of the carbon credit project
   * @param {string} documentData.projectType - Type of project (e.g., "reforestation")
   * @param {string} documentData.description - Project description
   * @param {string} documentData.location - Project location
   * @param {number} documentData.estimatedCredits - Estimated number of credits
   * @returns {Promise<Object>} Transaction result with hash and documentId
   */
  async registerDocument(documentData) {
    try {
      // Ensure wallet is connected and contracts are initialized
      if (!this.contracts.documentRegistrySigner) {
        console.log(
          "📝 DocumentRegistry signer not initialized, connecting wallet..."
        );

        try {
          await this.getSigner();

          // Double-check after initialization
          if (!this.contracts.documentRegistrySigner) {
            throw new Error(
              "DocumentRegistry contract could not be initialized. Please check contract deployment and wallet connection."
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
        throw new Error("CID and project name are required");
      }

      console.log("📄 Registering document:", {
        cid,
        projectName,
        projectType: projectType || "",
        description: description || "",
        location: location || "",
        estimatedCredits: estimatedCredits || 0,
      });

      const tx = await this.contracts.documentRegistrySigner.registerDocument(
        cid,
        projectName,
        projectType || "",
        description || "",
        location || "",
        BigInt(estimatedCredits || 0)
      );

      // Wait for transaction to be mined to get the document ID
      const receipt = await tx.wait();

      // Find the DocumentRegistered event to get the document ID
      let documentId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog =
            this.contracts.documentRegistry.interface.parseLog(log);
          if (parsedLog.name === "DocumentRegistered") {
            documentId = Number(parsedLog.args.documentId);
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
          continue;
        }
      }

      return {
        hash: tx.hash,
        transaction: tx,
        receipt,
        documentId,
      };
    } catch (error) {
      console.error("Error registering document:", error);

      // Provide user-friendly error messages
      if (error.message.includes("EmptyCID")) {
        throw new Error("Document CID cannot be empty");
      }
      if (error.message.includes("EmptyProjectName")) {
        throw new Error("Project name cannot be empty");
      }
      if (error.message.includes("not initialized")) {
        throw error; // Pass through our custom error message
      }

      throw new Error(`Failed to register document: ${error.message}`);
    }
  }

  /**
   * Get all documents from the DocumentRegistry (for verifier dashboard)
   * @returns {Promise<Array>} Array of all registered documents
   */
  async getAllDocuments() {
    try {
      if (!this.contracts.documentRegistry) {
        console.warn(
          "DocumentRegistry contract not initialized. Please ensure the contract is deployed and configured."
        );
        return [];
      }

      console.log("📋 Fetching all documents from registry...");

      const documents = await this.contracts.documentRegistry.getAllDocuments();

      // Convert the struct array to a more usable format
      const formattedDocuments = documents.map((doc, index) => ({
        id: index + 1, // Document IDs start from 1
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
        // Add formatted date for easier display
        uploadedAt: new Date(Number(doc.timestamp) * 1000).toISOString(),
        attestedAtFormatted:
          doc.attestedAt > 0
            ? new Date(Number(doc.attestedAt) * 1000).toISOString()
            : null,
      }));

      console.log(`📋 Retrieved ${formattedDocuments.length} documents`);
      return formattedDocuments;
    } catch (error) {
      console.error("Error getting all documents:", error);

      if (error.message.includes("not initialized")) {
        return []; // Return empty array if contract not configured
      }

      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
  }

  /**
   * Get documents uploaded by a specific user
   * @param {string} userAddress - Address of the user
   * @returns {Promise<Array>} Array of documents uploaded by the user
   */
  async getUserDocuments(userAddress) {
    try {
      if (!this.contracts.documentRegistry) {
        console.warn(
          "DocumentRegistry contract not initialized. Please ensure the contract is deployed and configured."
        );
        return [];
      }

      if (!userAddress) {
        throw new Error("User address is required");
      }

      console.log(`📋 Fetching documents for user: ${userAddress}`);

      const documents =
        await this.contracts.documentRegistry.getUserDocumentsWithDetails(
          userAddress
        );

      // Convert the struct array to a more usable format
      const formattedDocuments = documents.map((doc, index) => ({
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
        // Add formatted date for easier display
        uploadedAt: new Date(Number(doc.timestamp) * 1000).toISOString(),
        attestedAtFormatted:
          doc.attestedAt > 0
            ? new Date(Number(doc.attestedAt) * 1000).toISOString()
            : null,
      }));

      console.log(
        `📋 Retrieved ${formattedDocuments.length} documents for user`
      );
      return formattedDocuments;
    } catch (error) {
      console.error("Error getting user documents:", error);

      if (error.message.includes("not initialized")) {
        return []; // Return empty array if contract not configured
      }

      throw new Error(`Failed to fetch user documents: ${error.message}`);
    }
  }

  /**
   * Get documents by attestation status (for filtering)
   * @param {boolean} attested - Whether to get attested (true) or unattested (false) documents
   * @returns {Promise<Array>} Array of documents matching the attestation status
   */
  async getDocumentsByStatus(attested = false) {
    try {
      if (!this.contracts.documentRegistry) {
        console.warn(
          "DocumentRegistry contract not initialized. Please ensure the contract is deployed and configured."
        );
        return [];
      }

      console.log(
        `📋 Fetching ${attested ? "attested" : "unattested"} documents...`
      );

      const documents =
        await this.contracts.documentRegistry.getDocumentsByStatus(attested);

      // Convert the struct array to a more usable format
      const formattedDocuments = documents.map((doc, index) => ({
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
        // Add formatted date for easier display
        uploadedAt: new Date(Number(doc.timestamp) * 1000).toISOString(),
        attestedAtFormatted:
          doc.attestedAt > 0
            ? new Date(Number(doc.attestedAt) * 1000).toISOString()
            : null,
      }));

      console.log(
        `📋 Retrieved ${formattedDocuments.length} ${
          attested ? "attested" : "unattested"
        } documents`
      );
      return formattedDocuments;
    } catch (error) {
      console.error("Error getting documents by status:", error);

      if (error.message.includes("not initialized")) {
        return []; // Return empty array if contract not configured
      }

      throw new Error(`Failed to fetch documents by status: ${error.message}`);
    }
  }

  /**
   * Get the current signer
   * @returns {Promise<Object>} Ethers signer object
   */
  async getSigner() {
    try {
      if (!this.signer) {
        await this.connectWallet();
      }
      return this.signer;
    } catch (error) {
      console.error("Error getting signer:", error);
      throw new Error("Failed to get wallet signer");
    }
  }

  /**
   * Get nonce for an address (for EIP-712 signatures)
   * @param {string} address - Address to get nonce for
   * @returns {Promise<number>} Current nonce
   */
  async getNonce(address) {
    try {
      if (!address) {
        console.error("Error getting nonce: Address is required");
        throw new Error("Address is required for nonce lookup");
      }

      if (!this.contracts.carbon) {
        throw new Error("Carbon contract not initialized");
      }

      const nonce = await this.contracts.carbon.nonces(address);
      return Number(nonce);
    } catch (error) {
      console.error("Error getting nonce:", error);
      // Return 0 as fallback only for contract errors, not validation errors
      if (error.message.includes("Address is required")) {
        throw error;
      }
      return 0;
    }
  }

  /**
   * Get contract address by name
   * @param {string} contractName - Name of the contract
   * @returns {string} Contract address
   */
  getContractAddress(contractName) {
    const addressMap = {
      carbonCredit:
        this.contracts.carbon?.target || this.contracts.carbon?.address,
      documentRegistry:
        this.contracts.documentRegistry?.target ||
        this.contracts.documentRegistry?.address,
      verifierRegistry:
        this.contracts.verifierRegistry?.target ||
        this.contracts.verifierRegistry?.address,
      marketplace:
        this.contracts.marketplace?.target ||
        this.contracts.marketplace?.address,
    };

    return addressMap[contractName] || null;
  }

  /**
   * Attest a document (verifier only)
   * @param {number} documentId - ID of the document to attest
   * @returns {Promise<Object>} Transaction result
   */
  async attestDocument(documentId) {
    try {
      if (!this.contracts.documentRegistrySigner) {
        throw new Error(
          "DocumentRegistry contract with signer not initialized. Please ensure the contract is deployed and configured."
        );
      }

      if (!documentId || documentId <= 0) {
        throw new Error("Valid document ID is required");
      }

      console.log(`✅ Attesting document ID: ${documentId}`);

      const tx = await this.contracts.documentRegistrySigner.attestDocument(
        documentId
      );

      return {
        hash: tx.hash,
        transaction: tx,
      };
    } catch (error) {
      console.error("Error attesting document:", error);

      // Provide user-friendly error messages
      if (error.message.includes("NotVerifier")) {
        throw new Error("Only registered verifiers can attest documents");
      }
      if (error.message.includes("DocumentNotFound")) {
        throw new Error("Document not found");
      }
      if (error.message.includes("DocumentAlreadyAttested")) {
        throw new Error("Document has already been attested");
      }
      if (error.message.includes("not initialized")) {
        throw error; // Pass through our custom error message
      }

      throw new Error(`Failed to attest document: ${error.message}`);
    }
  }

  /**
   * Get a specific document by ID
   * @param {number} documentId - ID of the document
   * @returns {Promise<Object>} Document details
   */
  async getDocument(documentId) {
    try {
      if (!this.contracts.documentRegistry) {
        throw new Error(
          "DocumentRegistry contract not initialized. Please ensure the contract is deployed and configured."
        );
      }

      if (!documentId || documentId <= 0) {
        throw new Error("Valid document ID is required");
      }

      console.log(`📄 Fetching document ID: ${documentId}`);

      const doc = await this.contracts.documentRegistry.getDocument(documentId);

      // Convert the struct to a more usable format
      const formattedDocument = {
        id: documentId,
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
        // Add formatted date for easier display
        uploadedAt: new Date(Number(doc.timestamp) * 1000).toISOString(),
        attestedAtFormatted:
          doc.attestedAt > 0
            ? new Date(Number(doc.attestedAt) * 1000).toISOString()
            : null,
      };

      return formattedDocument;
    } catch (error) {
      console.error("Error getting document:", error);

      if (error.message.includes("DocumentNotFound")) {
        throw new Error("Document not found");
      }
      if (error.message.includes("not initialized")) {
        throw error; // Pass through our custom error message
      }

      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  /**
   * Get total number of registered documents
   * @returns {Promise<number>} Total number of documents
   */
  async getTotalDocuments() {
    try {
      if (!this.contracts.documentRegistry) {
        console.warn(
          "DocumentRegistry contract not initialized. Please ensure the contract is deployed and configured."
        );
        return 0;
      }

      const total = await this.contracts.documentRegistry.getTotalDocuments();
      return Number(total);
    } catch (error) {
      console.error("Error getting total documents:", error);

      if (error.message.includes("not initialized")) {
        return 0; // Return 0 if contract not configured
      }

      throw new Error(`Failed to get total documents: ${error.message}`);
    }
  }

  /**
   * Check if DocumentRegistry contract is configured and available
   * @returns {boolean} Whether the DocumentRegistry is available
   */
  isDocumentRegistryAvailable() {
    const address = import.meta.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS;
    return !!(
      address &&
      address !== "0x0000000000000000000000000000000000000000" &&
      this.contracts.documentRegistry
    );
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;
