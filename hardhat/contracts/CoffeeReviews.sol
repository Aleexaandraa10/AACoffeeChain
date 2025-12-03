// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Library.sol";

interface ICoffeeToken {
    function rewardUser(address user) external;
}

interface ICoffeeBadge {
    function mintBadge(address to) external;
}

contract CoffeeReviews {
    using CoffeeLibrary for uint256;

    struct Review {
        address reviewer;
        bytes32 coffeeCode;
        uint8 rating;
        string text;
        uint256 timestamp;
    }

    // Dependențe
    ICoffeeToken public coffeeToken;
    ICoffeeBadge public coffeeBadge;

    // Prag pentru a primi un NFT badge
    uint256 public constant BADGE_THRESHOLD = 5;

    // Stocăm toate review-urile
    Review[] public reviews;

    // Ținem evidența numărului de recenzii per utilizator
    mapping(address => uint256) public reviewCount;

    // Evenimente
    event ReviewPosted(
        address indexed reviewer,
        bytes32 indexed coffeeCode,
        uint8 rating,
        string text,
        uint256 timestamp
    );

    event BadgeAwarded(address indexed user, uint256 timestamp);

    /**
     * @dev Constructor: primește adresele CoffeeToken și CoffeeBadge.
     */
    constructor(address _coffeeToken, address _coffeeBadge) {
        require(_coffeeToken != address(0), "Invalid token address");
        require(_coffeeBadge != address(0), "Invalid badge address");

        coffeeToken = ICoffeeToken(_coffeeToken);
        coffeeBadge = ICoffeeBadge(_coffeeBadge);
    }

    /**
     * @dev Postează o recenzie, acordă token și eventual badge.
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

        // Incrementăm nr. de review-uri
        reviewCount[msg.sender]++;

        // Reward ERC20 token
        coffeeToken.rewardUser(msg.sender);

        // Dacă utilizatorul atinge pragul → primește badge
        if (reviewCount[msg.sender] == BADGE_THRESHOLD) {
            coffeeBadge.mintBadge(msg.sender);
            emit BadgeAwarded(msg.sender, block.timestamp);
        }

        emit ReviewPosted(msg.sender, coffeeCode, rating, text, block.timestamp);
    }

    /**
     * @dev Returnează numărul total de recenzii.
     */
    function getTotalReviews() external view returns (uint256) {
        return reviews.length;
    }

    /**
     * @dev Returnează o recenzie după index.
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
