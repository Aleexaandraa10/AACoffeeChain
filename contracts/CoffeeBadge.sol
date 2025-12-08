// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoffeeBadge is ERC721, Ownable {
    // reward = 1 COF token = 1 * 10^18 unitati interne
    uint256 public nextTokenId = 1;
    // reward = 1 COF token = 1 * 10^18 unitati interne
    address public reviewerContract;

    /*
        ERC721 = standardul oficial pt NFT (Non-Fungible Tokens)
        - constructorul lui ERC721 primeste
            1. Numele colectiei NFT
            2. tickerul colectiei
    */
    constructor(address initialOwner)
        ERC721("CoffeeBadge", "CBADGE")
        Ownable(initialOwner)
    {}


    /**
        Seteaza contractul CoffeeReviews.
        Poate fi apelat doar de owner (cel care a deployat contractul).
    */
    function setReviewerContract(address _reviews) external onlyOwner {
        reviewerContract = _reviews;
    }


    /**
        Mintuieste un badge pentru un utilizator fidel.
        Poate fi apelat DOAR de contractul CoffeeReviews.
     */
    function mintBadge(address to) external {
        require(msg.sender == reviewerContract, "Not authorized to mint");

        _safeMint(to, nextTokenId);
        nextTokenId++;
    }

     /**
        pe langa tokenId unic al NFT, mai au si:
            - URI de metadate = link catre info despre NFT
            - URI = baseURI + tokenId
     */
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmCoffeeBadgeMetadataCID/";
    }
}

