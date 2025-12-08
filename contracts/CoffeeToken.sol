// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CoffeeToken is ERC20, Ownable {
    // adresa contractului CoffeeReviews care are voie sa faca rewardUser
    address public reviewsContract;

    /*
    ERC20 = "reteta oficiala" pt a crea o moneda pe Ethereum, tokenuri fungibile
    constructorul lui ERC20 are 2 param:
        1. numeele monedei
        2. tickerul monedei ( prescurtarea oficiala) - va aparea pe MetaMask
    */
    constructor(address initialOwner)
        ERC20("CoffeeToken", "COF")
        Ownable(initialOwner)
    {}

    // address _reviewsContract = adresa contractului dupa ce fac deploy
    // poate apela fct doar owner-ul CoffeeToken
    function setReviewsContract(address _reviewsContract) external onlyOwner {
        require(_reviewsContract != address(0), "Invalid address");
        // setez cine este sg entitate autorizata sa dea rewarduri
        reviewsContract = _reviewsContract;
    }

    function rewardUser(address user) external {
        // doar contractul CoffeeReviews are voie sa apeleze fct asta
        require(msg.sender == reviewsContract, "Not authorized");
        _mint(user, 1 * 10 ** decimals());// reward = 1 COF token = 1 * 10^18 unitati interne
    }
}
