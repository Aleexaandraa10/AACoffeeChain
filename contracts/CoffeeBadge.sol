// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract CoffeeBadge is ERC721, Ownable {
    // in ERC721 fiecare are un tokenId unic
    uint256 public nextTokenId = 1;

    // adresa contractului CoffeeReviews care are dreptul sa mintuiasca badge-uri
    address public reviewerContract;


    event BadgeMinted(address indexed to, uint256 tokenId);

    /*
        ERC721 = standardul oficial pt NFT (Non-Fungible Tokens)
        - constructorul lui ERC721 primeste
            1. Numele colectiei NFT
            2. tickerul colectiei
    */
    constructor() ERC721("CoffeeBadge", "CBADGE") Ownable(msg.sender) {}


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

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _safeMint(to, tokenId);

        emit BadgeMinted(to, tokenId);
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
