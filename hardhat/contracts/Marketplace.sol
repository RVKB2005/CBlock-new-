// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./CarbonCredit.sol";
import "./RetirementCertificate.sol";

contract Marketplace is ReentrancyGuard, ERC1155Holder {
    CarbonCredit public carbon;
    RetirementCertificate public cert;
    address public admin;
    uint256 public feeBps = 100; // 1%

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 pricePerUnit; // in wei
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public feesAccrued;

    event Listed(uint256 listingId, address seller, uint256 tokenId, uint256 amount, uint256 price);
    event Bought(uint256 listingId, address buyer, uint256 amount);
    event Retired(address indexed account, uint256 tokenId, uint256 amount, uint256 certId);

    constructor(address _carbon, address _cert) {
        carbon = CarbonCredit(_carbon);
        cert = RetirementCertificate(_cert);
        admin = msg.sender;
    }

    function list(uint256 tokenId, uint256 amount, uint256 pricePerUnit) external {
        // transfer to marketplace (seller must approve first)
        carbon.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        nextListingId++;
        listings[nextListingId] = Listing(msg.sender, tokenId, amount, pricePerUnit);
        emit Listed(nextListingId, msg.sender, tokenId, amount, pricePerUnit);
    }

    function buy(uint256 listingId, uint256 amount) external payable nonReentrant {
        Listing storage l = listings[listingId];
        require(l.amount >= amount, "not enough amount");
        uint256 total = amount * l.pricePerUnit;
        require(msg.value >= total, "insufficient payment");

        uint256 fee = (total * feeBps) / 10000;
        uint256 sellerAmount = total - fee;
        feesAccrued[admin] += fee;

        // transfer ETH to seller
        payable(l.seller).transfer(sellerAmount);

        // transfer tokens to buyer
        carbon.safeTransferFrom(address(this), msg.sender, l.tokenId, amount, "");

        l.amount -= amount;
        emit Bought(listingId, msg.sender, amount);
    }

    function retire(uint256 tokenId, uint256 amount, string calldata metadataURI) external {
        // burn tokens from sender (marketplace must be approved)
        carbon.burn(msg.sender, tokenId, amount);

        // mint retirement certificate to sender (marketplace must be owner of cert)
        uint256 certId = cert.mintCertificate(msg.sender, metadataURI);
        emit Retired(msg.sender, tokenId, amount, certId);
    }

    function withdrawFees() external {
        uint256 amt = feesAccrued[admin];
        require(amt > 0, "no fees");
        feesAccrued[admin] = 0;
        payable(admin).transfer(amt);
    }
}
