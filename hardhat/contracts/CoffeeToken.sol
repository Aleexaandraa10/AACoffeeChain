// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoffeeToken is ERC20, Ownable {
    // Contract allowed to mint reward tokens (CoffeeReviews)
    address public reviewsContract;

    constructor()
        ERC20("CoffeeToken", "COF")
        Ownable(msg.sender)   // IMPORTANT for OpenZeppelin v5
    {}

    // Set the CoffeeReviews contract that can mint rewards
    function setReviewsContract(address _reviewsContract) external onlyOwner {
        require(_reviewsContract != address(0), "Invalid address");
        reviewsContract = _reviewsContract;
    }

    // Reward function called by CoffeeReviews
    function rewardUser(address user) external {
        require(msg.sender == reviewsContract, "Not authorized");
        _mint(user, 1 * 10**decimals()); // reward = 1 COF token
    }
}
