import { ethers } from 'ethers';

// Import ABI files
import CarbonCreditABI from '../abis/CarbonCredit.json';
import MarketplaceABI from '../abis/Marketplace.json';
import RetirementCertificateABI from '../abis/RetirementCertificate.json';
import VerifierRegistryABI from '../abis/VerifierRegistry.json';

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
        throw new Error('Please install MetaMask to use this application');
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
      
      console.log('Blockchain service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  // Switch to Sepolia network
  async switchToSepoliaNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Test Network',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
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
      retirementCert: import.meta.env.VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS,
      verifierRegistry: import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS,
    };

    // Check if addresses are configured
    const hasValidAddresses = Object.values(addresses).some(addr => 
      addr && addr !== '0x0000000000000000000000000000000000000000'
    );

    if (!hasValidAddresses) {
      console.warn('Smart contract addresses not configured. Please deploy contracts and update .env file.');
      return;
    }

    try {
      if (addresses.carbon && addresses.carbon !== '0x0000000000000000000000000000000000000000') {
        this.contracts.carbon = new ethers.Contract(addresses.carbon, CarbonCreditABI, this.provider);
      }
      
      if (addresses.marketplace && addresses.marketplace !== '0x0000000000000000000000000000000000000000') {
        this.contracts.marketplace = new ethers.Contract(addresses.marketplace, MarketplaceABI, this.provider);
      }
      
      if (addresses.retirementCert && addresses.retirementCert !== '0x0000000000000000000000000000000000000000') {
        this.contracts.retirementCert = new ethers.Contract(addresses.retirementCert, RetirementCertificateABI, this.provider);
      }
      
      if (addresses.verifierRegistry && addresses.verifierRegistry !== '0x0000000000000000000000000000000000000000') {
        this.contracts.verifierRegistry = new ethers.Contract(addresses.verifierRegistry, VerifierRegistryABI, this.provider);
      }
    } catch (error) {
      console.error('Error initializing contracts:', error);
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
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      // Reinitialize contracts with signer
      await this.initializeContractsWithSigner();

      return {
        address,
        provider: this.provider,
        signer: this.signer
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Initialize contracts with signer for transactions
  async initializeContractsWithSigner() {
    if (!this.signer) return;

    const addresses = {
      carbon: import.meta.env.VITE_CONTRACT_CARBON_ADDRESS,
      marketplace: import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS,
      retirementCert: import.meta.env.VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS,
      verifierRegistry: import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS,
    };

    try {
      if (addresses.carbon && addresses.carbon !== '0x0000000000000000000000000000000000000000') {
        this.contracts.carbonSigner = new ethers.Contract(addresses.carbon, CarbonCreditABI, this.signer);
      }
      
      if (addresses.marketplace && addresses.marketplace !== '0x0000000000000000000000000000000000000000') {
        this.contracts.marketplaceSigner = new ethers.Contract(addresses.marketplace, MarketplaceABI, this.signer);
      }
      
      if (addresses.retirementCert && addresses.retirementCert !== '0x0000000000000000000000000000000000000000') {
        this.contracts.retirementCertSigner = new ethers.Contract(addresses.retirementCert, RetirementCertificateABI, this.signer);
      }
      
      if (addresses.verifierRegistry && addresses.verifierRegistry !== '0x0000000000000000000000000000000000000000') {
        this.contracts.verifierRegistrySigner = new ethers.Contract(addresses.verifierRegistry, VerifierRegistryABI, this.signer);
      }
    } catch (error) {
      console.error('Error initializing contracts with signer:', error);
    }
  }

  // Get user's carbon credit balance for a specific token ID
  async getTokenBalance(userAddress, tokenId) {
    try {
      if (!this.contracts.carbon) {
        throw new Error('Carbon contract not initialized');
      }
      
      const balance = await this.contracts.carbon.balanceOf(userAddress, tokenId);
      return Number(balance.toString());
    } catch (error) {
      console.error('Error getting token balance:', error);
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
            metadata: null // Will be fetched separately if needed
          });
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error getting user tokens:', error);
      return [];
    }
  }

  // Mint carbon credits with verifier attestation
  async mintCarbonCredits(attestationData) {
    try {
      if (!this.contracts.carbonSigner) {
        throw new Error('Carbon contract with signer not initialized');
      }

      const {
        recipient,
        gsProjectId,
        gsSerial,
        vintage,
        quantity,
        ipfsHash,
        nonce,
        signature
      } = attestationData;

      const tx = await this.contracts.carbonSigner.mintWithAttestation(
        gsProjectId,
        gsSerial,
        ipfsHash,
        BigInt(quantity), // Use raw quantity as BigInt - not parseEther
        recipient,
        signature
      );

      return {
        hash: tx.hash,
        transaction: tx
      };
    } catch (error) {
      console.error('Error minting carbon credits:', error);
      throw error;
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
              active: true
            });
          }
        } catch (e) {
          // Skip invalid listings
          continue;
        }
      }

      return listings;
    } catch (error) {
      console.error('Error getting marketplace listings:', error);
      return [];
    }
  }

  // List carbon credits for sale
  async listCarbonCredits(tokenId, amount, priceInETH) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error('Marketplace contract with signer not initialized');
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
        transaction: listTx
      };
    } catch (error) {
      console.error('Error listing carbon credits:', error);
      throw error;
    }
  }

  // Buy carbon credits from marketplace
  async buyCarbonCredits(listingId, amount) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error('Marketplace contract with signer not initialized');
      }

      // Get listing details to calculate total cost
      const listing = await this.contracts.marketplace.listings(listingId);
      const totalCost = BigInt(listing.pricePerUnit) * BigInt(amount);

      console.log('🛒 Buying tokens:', {
        listingId,
        amount,
        pricePerUnit: listing.pricePerUnit.toString(),
        totalCost: totalCost.toString()
      });

      const buyTx = await this.contracts.marketplaceSigner.buy(listingId, amount, {
        value: totalCost,
        gasLimit: 500000 // Add gas limit
      });

      return {
        hash: buyTx.hash,
        transaction: buyTx
      };
    } catch (error) {
      console.error('Error buying carbon credits:', error);
      throw error;
    }
  }

  // Retire carbon credits
  async retireCarbonCredits(tokenId, amount, retirementData) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error('Marketplace contract with signer not initialized');
      }

      const { beneficiary, retirementMessage, ipfsHash } = retirementData;

      const retireTx = await this.contracts.marketplaceSigner.retire(
        tokenId,
        amount,
        beneficiary || '',
        retirementMessage || '',
        ipfsHash || ''
      );

      return {
        hash: retireTx.hash,
        transaction: retireTx
      };
    } catch (error) {
      console.error('Error retiring carbon credits:', error);
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
      const balance = await this.contracts.retirementCert.balanceOf(userAddress);
      const certificates = [];

      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await this.contracts.retirementCert.tokenOfOwnerByIndex(userAddress, i);
          const tokenURI = await this.contracts.retirementCert.tokenURI(tokenId);
          certificates.push({
            tokenId: Number(tokenId),
            uri: tokenURI
          });
        } catch (e) {
          // Skip if method doesn't exist or fails
          continue;
        }
      }

      return certificates;
    } catch (error) {
      console.error('Error getting retirement certificates:', error);
      return [];
    }
  }

  // Check if contract addresses are configured
  isConfigured() {
    const addresses = [
      import.meta.env.VITE_CONTRACT_CARBON_ADDRESS,
      import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS,
    ];

    return addresses.some(addr => addr && addr !== '0x0000000000000000000000000000000000000000');
  }

  // Get current network
  async getNetwork() {
    if (!this.provider) return null;
    return await this.provider.getNetwork();
  }

  // Format address for display
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Take down a listing by buying the full amount (for listing owners)
  async takeDownListing(listingId) {
    try {
      if (!this.contracts.marketplaceSigner) {
        throw new Error('Marketplace contract with signer not initialized');
      }

      // Get listing details
      const listing = await this.contracts.marketplace.listings(listingId);
      const fullAmount = Number(listing.amount);
      const totalCost = BigInt(listing.pricePerUnit) * BigInt(fullAmount);

      console.log('🗑️ Taking down listing:', {
        listingId,
        fullAmount,
        pricePerUnit: listing.pricePerUnit.toString(),
        totalCost: totalCost.toString()
      });

      // Buy the full amount to take down the listing
      const buyTx = await this.contracts.marketplaceSigner.buy(listingId, fullAmount, {
        value: totalCost,
        gasLimit: 500000
      });

      return {
        hash: buyTx.hash,
        transaction: buyTx
      };
    } catch (error) {
      console.error('Error taking down listing:', error);
      throw error;
    }
  }

  // Wait for transaction confirmation
  async waitForTransaction(txHash, confirmations = 1) {
    if (!this.provider) throw new Error('Provider not initialized');
    return await this.provider.waitForTransaction(txHash, confirmations);
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;
