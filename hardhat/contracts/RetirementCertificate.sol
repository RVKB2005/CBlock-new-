// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RetirementCertificate is ERC721URIStorage, Ownable {
    uint256 public nextId;

    constructor() ERC721("RetirementCertificate","RCERT") {}

    function mintCertificate(address to, string calldata metadataURI) external onlyOwner returns (uint256) {
        nextId++;
        _mint(to, nextId);
        _setTokenURI(nextId, metadataURI);
        return nextId;
    }
}
