// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CoffeeBadge
 * @dev NFT oferit utilizatorilor fideli după un anumit număr de recenzii.
 * Acest contract poate mintui badge-uri doar la cererea contractului CoffeeReviews.
 */
contract CoffeeBadge is ERC721, Ownable {
    // ID-ul următorului NFT
    uint256 public nextTokenId = 1;

    // Adresa contractului CoffeeReviews care are dreptul să mintuiască badge-uri
    address public reviewerContract;

    // Event emis când se mintuiește un NFT nou
    event BadgeMinted(address indexed to, uint256 tokenId);

    /**
     * @dev Constructorul NFT-ului.
     */
    constructor() ERC721("CoffeeBadge", "CBADGE") Ownable(msg.sender) {}

    /**
     * @dev Setează contractul CoffeeReviews.
     * Poate fi apelat doar de owner (cel care a deployat contractul).
     */
    function setReviewerContract(address _reviews) external onlyOwner {
        reviewerContract = _reviews;
    }

    /**
     * @dev Mintuiește un badge pentru un utilizator fidel.
     * Poate fi apelat DOAR de contractul CoffeeReviews.
     */
    function mintBadge(address to) external {
        require(msg.sender == reviewerContract, "Not authorized to mint");

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _safeMint(to, tokenId);

        emit BadgeMinted(to, tokenId);
    }

    /**
     * @dev Returnează prefixul URI pentru metadatele NFT-ului.
     * Îl poți schimba ulterior cu un CID real din IPFS.
     */
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmCoffeeBadgeMetadataCID/";
    }
}
