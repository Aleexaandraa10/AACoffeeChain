// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Library.sol";

// in solidity interfata este doar pt a putea apela fct pe un contract extern
interface ICoffeeToken {
    function rewardUser(address user) external;
}

interface ICoffeeBadge {
    function mintBadge(address to) external;
}

contract CoffeeReviews {
    // toate var de tip uint256 pot folosi fct din CoffeeLibrary 
    //ca si cum ar fi metode ale tipului uint256
    using CoffeeLibrary for uint256;

    struct Review {
        address reviewer;
        bytes32 coffeeCode;
        uint8 rating;
        string text;
        uint256 timestamp;
    }

    // Dependențe = referinte catre contractele externe
    ICoffeeToken public coffeeToken; 
    ICoffeeBadge public coffeeBadge;


    // Prag pentru a primi un NFT badge
    // adica un user primeste NFT badge dupa 5 review-uri
    uint256 public constant BADGE_THRESHOLD = 5;


    Review[] public reviews;

    // Ținem evidența numărului de recenzii per utilizator
    mapping(address => uint256) public reviewCount;


    event ReviewPosted(
        address indexed reviewer,
        bytes32 indexed coffeeCode,
        uint8 rating,
        string text,
        uint256 timestamp
    );
    event BadgeAwarded(address indexed user, uint256 timestamp);



    constructor(address _coffeeToken, address _coffeeBadge) {
        require(_coffeeToken != address(0), "Invalid token address");
        require(_coffeeBadge != address(0), "Invalid badge address");

        coffeeToken = ICoffeeToken(_coffeeToken);
        coffeeBadge = ICoffeeBadge(_coffeeBadge);
    }

    /**
        Posteaza o recenzie, acorda token si eventual badge.
     */
    function postReview(bytes32 coffeeCode, uint8 rating, string calldata text) external {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");

        reviews.push(Review({
            reviewer: msg.sender,
            coffeeCode: coffeeCode,
            rating: rating,
            text: text,
            timestamp: block.timestamp
        }));
        reviewCount[msg.sender]++;

        // pt fiecare recenzie userul primeste 1 COF(moneda virtuala interna) token
        coffeeToken.rewardUser(msg.sender);


        // Emit event pentru review nou
        emit ReviewPosted(msg.sender, coffeeCode, rating, text, block.timestamp);


        // Dacă utilizatorul atinge pragul → primește badge
        if (reviewCount[msg.sender].checkRewardEligibility()) {
            coffeeBadge.mintBadge(msg.sender);
            reviewCount[msg.sender] = 0;
            emit BadgeAwarded(msg.sender, block.timestamp);
        }
}


    /**
        Returneaza numărul total de recenzii.
     */
    function getTotalReviews() external view returns (uint256) {
        return reviews.length;
    }

    /**
         Returneaza o recenzie dupa index.
     */
    function getReview(uint256 index)
        external
        view
        returns (
            address reviewer,
            bytes32 coffeeCode,
            uint8 rating,
            string memory text,
            uint256 timestamp
        )
    {
        Review memory r = reviews[index];
        return (r.reviewer, r.coffeeCode, r.rating, r.text, r.timestamp);
    }
}
