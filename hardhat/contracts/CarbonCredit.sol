// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IVerifierRegistry { function isVerifier(address) external view returns (bool); }

contract CarbonCredit is ERC1155, ERC1155Supply {
    using ECDSA for bytes32;

    IVerifierRegistry public verifierRegistry;

    struct GSAttestation {
        string gsProjectId;
        string gsSerial;
        string ipfsCid;
        uint256 amount;
        address verifier;
    }

    mapping(uint256 => GSAttestation) public attestations;
    uint256 public nextTokenId;

    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256("Attestation(string gsProjectId,string gsSerial,string ipfsCid,uint256 amount,address recipient,uint256 nonce)");

    mapping(address => uint256) public nonces;
    mapping(uint256 => string) private _tokenURIs;

    event MintedWithAttestation(uint256 indexed tokenId, address indexed recipient, uint256 amount, address verifier);

    constructor(address _verifierRegistry) ERC1155("") {
        verifierRegistry = IVerifierRegistry(_verifierRegistry);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("CarbonCredit")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function mintWithAttestation(
        string calldata gsProjectId,
        string calldata gsSerial,
        string calldata ipfsCid,
        uint256 amount,
        address recipient,
        bytes calldata signature
    ) external {
        uint256 nonce = nonces[recipient]++;
        bytes32 structHash = keccak256(abi.encode(
            ATTESTATION_TYPEHASH,
            keccak256(bytes(gsProjectId)),
            keccak256(bytes(gsSerial)),
            keccak256(bytes(ipfsCid)),
            amount,
            recipient,
            nonce
        ));

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = digest.recover(signature);

        require(verifierRegistry.isVerifier(signer), "attestation not signed by registered verifier");

        nextTokenId++;
        uint256 tokenId = nextTokenId;
        _mint(recipient, tokenId, amount, "");
        _setTokenURI(tokenId, ipfsCid);

        attestations[tokenId] = GSAttestation({
            gsProjectId: gsProjectId,
            gsSerial: gsSerial,
            ipfsCid: ipfsCid,
            amount: amount,
            verifier: signer
        });

        emit MintedWithAttestation(tokenId, recipient, amount, signer);
    }

    function _setTokenURI(uint256 id, string memory uri_) internal {
        _tokenURIs[id] = uri_;
        emit URI(uri_, id);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _tokenURIs[id];
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal override(ERC1155, ERC1155Supply)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    // Add burn function for retirement
    function burn(address from, uint256 id, uint256 amount) external {
        require(msg.sender == from || isApprovedForAll(from, msg.sender), "not approved");
        _burn(from, id, amount);
    }
}
