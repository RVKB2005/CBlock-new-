# 3-Minute Demo Script

1. Intro (30s)
- "Carbon Market Demo" — decentralized carbon credit marketplace using Ethereum (Sepolia testnet), IPFS, DAO-based verifier registry, and EIP-712 attestations for Gold Standard integration.

2. Governance & Verifier (45s)
- Show VerifierRegistry contract on Etherscan (deployed on Sepolia).
- Demonstrate adding a verifier (in demo, done by deployer/governance) and show isVerifier=true.

3. Attestation & Mint (45s)
- Verifier uploads GS sample PDF to web3.storage → shows CID.
- Verifier signs EIP-712 attestation (show signature).
- Project owner calls `mintWithAttestation` with signature → tokens minted (show tx & tokenId).

4. Trade & Retire (45s)
- List tokens on marketplace.
- Buyer purchases tokens (show balances & tx).
- Buyer retires a token → retirement certificate NFT minted with IPFS metadata (show tx & NFT).

5. Closing (15s)
- Emphasize decentralization: governance-controlled verifier list + cryptographic attestations + IPFS metadata = transparent, verifiable carbon credits.
