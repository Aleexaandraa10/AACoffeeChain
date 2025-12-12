// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoffeeBadge is ERC721, Ownable {
    // reward = 1 COF token = 1 * 10^18 unitati interne
    uint256 public nextTokenId = 1;

    uint256 public constant MAX_BADGES = 4;


    // adresa contractului CoffeeReviews care are voie să mintuiască
    address public reviewerContract;

    // fiecare user → lista de tokenId-uri ale badge-urilor
    mapping(address => uint256[]) private _ownedBadges;

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

        // Dacă are deja 4 badge-uri → NU mai mintăm, doar ieșim
        if (_ownedBadges[to].length >= MAX_BADGES) {
            return;
        }

        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _ownedBadges[to].push(tokenId);
        nextTokenId++;
    }



    /**
        pe langa tokenId unic al NFT, mai au si:
            - URI de metadate = link catre info despre NFT
            - URI = baseURI + tokenId
     */
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeibwlszj5dejolcjlj6qdnhdovsla3uonb5eo2vghg4bpo7xni5k6i/";
    }

    function tokenURI(uint256 tokenId) public view override
        returns (string memory){
            return string(
                abi.encodePacked(
                    _baseURI(),
                    Strings.toString(tokenId),
                    ".json"
                )
            );
        }



    // funcție pe care o va apela frontend-ul 
    function getBadgesOf(address user)
        external
        view
        returns (uint256[] memory)
    {
        return _ownedBadges[user];
    }
}