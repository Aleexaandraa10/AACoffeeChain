// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CoffeeCatalog is Ownable {
    struct Coffee {
        string name;
        uint256 priceWei;
        string imageCID;   // IPFS CID for the image of the coffee
        bool exists;
    }

    // Mapping from coffeeCode → Coffee struct
    mapping(bytes32 => Coffee) public coffees;

    // Events
    event CoffeeAdded(bytes32 indexed coffeeCode, string name, uint256 priceWei);
    event CoffeePurchased(address indexed buyer, bytes32 indexed coffeeCode, uint256 pricePaid);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a new coffee product (owner-only).
     */
    function addCoffee(
        bytes32 coffeeCode,
        string memory name,
        uint256 priceWei,
        string memory imageCID
    ) external onlyOwner {
        require(!coffees[coffeeCode].exists, "Coffee already exists");

        coffees[coffeeCode] = Coffee({
            name: name,
            priceWei: priceWei,
            imageCID: imageCID,
            exists: true
        });

        emit CoffeeAdded(coffeeCode, name, priceWei);
    }

    /**
     * @dev Purchase a coffee by sending exact ETH.
     */
    function buyCoffee(bytes32 coffeeCode) external payable {
        Coffee memory coffee = coffees[coffeeCode];

        require(coffee.exists, "Coffee not found");
        require(msg.value == coffee.priceWei, "Incorrect ETH amount");

        // Send ETH to the owner
        payable(owner()).transfer(msg.value);

        emit CoffeePurchased(msg.sender, coffeeCode, msg.value);
    }

    /**
     * @dev Returns full details of a coffee product.
     */
    function getCoffee(bytes32 coffeeCode)
        external
        view
        returns (
            string memory name,
            uint256 priceWei,
            string memory imageCID
        )
    {
        Coffee memory coffee = coffees[coffeeCode];
        require(coffee.exists, "Coffee not found");

        return (coffee.name, coffee.priceWei, coffee.imageCID);
    }
}
