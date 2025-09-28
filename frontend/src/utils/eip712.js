/**
 * EIP-712 signature utilities for document attestation
 */

// EIP-712 Domain for CarbonCredit contract
export const EIP712_DOMAIN = {
  name: "CarbonCredit",
  version: "1",
  chainId: 1337, // Local hardhat network - should be configurable
  verifyingContract: null, // Will be set from contract address
};

// EIP-712 Types for attestation
export const ATTESTATION_TYPES = {
  Attestation: [
    { name: "gsProjectId", type: "string" },
    { name: "gsSerial", type: "string" },
    { name: "ipfsCid", type: "string" },
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
};

/**
 * Generate EIP-712 signature for document attestation
 * @param {Object} attestationData - Attestation data
 * @param {string} attestationData.gsProjectId - Gold Standard Project ID
 * @param {string} attestationData.gsSerial - Gold Standard Serial Number
 * @param {string} attestationData.ipfsCid - IPFS CID of the document
 * @param {number} attestationData.amount - Amount of credits to mint
 * @param {string} attestationData.recipient - Address to receive the credits
 * @param {number} attestationData.nonce - Nonce for replay protection
 * @param {string} contractAddress - CarbonCredit contract address
 * @param {Object} signer - Ethers signer object
 * @returns {Promise<string>} EIP-712 signature
 */
export async function signAttestation(
  attestationData,
  contractAddress,
  signer
) {
  try {
    if (!attestationData || !contractAddress || !signer) {
      throw new Error("Missing required parameters for signature generation");
    }

    // Validate attestation data
    const { gsProjectId, gsSerial, ipfsCid, amount, recipient, nonce } =
      attestationData;

    if (!gsProjectId || !gsSerial || !ipfsCid || !recipient) {
      throw new Error("Missing required attestation data fields");
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    if (typeof nonce !== "number" || nonce < 0) {
      throw new Error("Nonce must be a non-negative number");
    }

    // Create domain with contract address
    const domain = {
      ...EIP712_DOMAIN,
      verifyingContract: contractAddress,
    };

    // Get chain ID from signer if available
    try {
      const network = await signer.provider?.getNetwork();
      if (network?.chainId) {
        domain.chainId = Number(network.chainId);
      }
    } catch (error) {
      console.warn(
        "Could not get chain ID from signer, using default:",
        error.message
      );
    }

    console.log("🔐 Generating EIP-712 signature for attestation:", {
      domain,
      types: ATTESTATION_TYPES,
      value: attestationData,
    });

    // Generate signature using EIP-712
    const signature = await signer.signTypedData(
      domain,
      ATTESTATION_TYPES,
      attestationData
    );

    console.log("✅ EIP-712 signature generated successfully");
    return signature;
  } catch (error) {
    console.error("❌ Failed to generate EIP-712 signature:", error);

    // Provide user-friendly error messages
    if (error.message.includes("user rejected")) {
      throw new Error("Signature was rejected by user");
    }

    if (error.message.includes("Missing required")) {
      throw error;
    }

    throw new Error(`Failed to generate signature: ${error.message}`);
  }
}

/**
 * Validate attestation data before signing
 * @param {Object} attestationData - Attestation data to validate
 * @throws {Error} If validation fails
 */
export function validateAttestationData(attestationData) {
  const { gsProjectId, gsSerial, ipfsCid, amount, recipient, nonce } =
    attestationData;

  // Required fields
  if (
    !gsProjectId ||
    typeof gsProjectId !== "string" ||
    gsProjectId.trim() === ""
  ) {
    throw new Error("Gold Standard Project ID is required");
  }

  if (!gsSerial || typeof gsSerial !== "string" || gsSerial.trim() === "") {
    throw new Error("Gold Standard Serial Number is required");
  }

  if (!ipfsCid || typeof ipfsCid !== "string" || ipfsCid.trim() === "") {
    throw new Error("IPFS CID is required");
  }

  if (!recipient || typeof recipient !== "string" || recipient.trim() === "") {
    throw new Error("Recipient address is required");
  }

  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("Invalid recipient address format");
  }

  // Validate amount
  if (typeof amount !== "number" || amount <= 0 || amount > 1000000) {
    throw new Error("Amount must be a positive number between 1 and 1,000,000");
  }

  // Validate nonce
  if (typeof nonce !== "number" || nonce < 0) {
    throw new Error("Nonce must be a non-negative number");
  }

  // Validate Gold Standard Project ID format (basic validation)
  if (gsProjectId.length < 3 || gsProjectId.length > 50) {
    throw new Error(
      "Gold Standard Project ID must be between 3 and 50 characters"
    );
  }

  // Validate Gold Standard Serial Number format (basic validation)
  if (gsSerial.length < 3 || gsSerial.length > 50) {
    throw new Error(
      "Gold Standard Serial Number must be between 3 and 50 characters"
    );
  }

  // Validate IPFS CID format (flexible validation for various CID formats)
  const validCidPrefixes = ["Qm", "bafy", "baf", "k51", "z", "f01"];
  const isValidCid =
    validCidPrefixes.some((prefix) => ipfsCid.startsWith(prefix)) ||
    /^[a-zA-Z0-9]{46,}$/.test(ipfsCid); // Basic length and character check

  if (!isValidCid) {
    console.error("Invalid IPFS CID format:", {
      cid: ipfsCid,
      length: ipfsCid.length,
      startsWithValidPrefix: validCidPrefixes.some((prefix) =>
        ipfsCid.startsWith(prefix)
      ),
      matchesPattern: /^[a-zA-Z0-9]{46,}$/.test(ipfsCid),
    });
    throw new Error(
      `Invalid IPFS CID format: ${ipfsCid} (length: ${ipfsCid.length})`
    );
  }

  return true;
}

/**
 * Create attestation data object from form inputs
 * @param {Object} formData - Form data from attestation form
 * @param {string} document - Document being attested
 * @param {number} nonce - Nonce for replay protection
 * @returns {Object} Formatted attestation data
 */
export function createAttestationData(formData, document, nonce) {
  // Ensure document has required properties
  if (!document) {
    throw new Error("Document object is required for attestation");
  }

  // Try to get CID from multiple possible properties
  const ipfsCid =
    document.cid || document.ipfsCid || document.hash || document.id;

  if (!ipfsCid) {
    console.error("❌ Document missing IPFS CID:", {
      document: {
        id: document.id,
        cid: document.cid,
        ipfsCid: document.ipfsCid,
        hash: document.hash,
        allProperties: Object.keys(document),
      },
    });
    throw new Error(
      "Document is missing IPFS CID. Please ensure the document was uploaded correctly."
    );
  }

  return {
    gsProjectId: formData.gsProjectId.trim(),
    gsSerial: formData.gsSerial.trim(),
    ipfsCid: ipfsCid,
    amount: Number(formData.amount || document.estimatedCredits || 0),
    recipient: document.uploadedBy,
    nonce: Number(nonce),
  };
}
