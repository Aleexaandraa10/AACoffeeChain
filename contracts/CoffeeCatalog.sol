// SPDX-License-Identifier: MIT

// ROL: gestionare listelor de cafele + cumparare cu ETH
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Library.sol";

contract CoffeeCatalog is Ownable {

    using CoffeeLibrary for uint256;

    struct Coffee {
        string name;
        uint256 priceWei;
        string imageCID;   
        bool exists;
    }

    // maparea de la coffeeCode → Coffee struct
    mapping(bytes32 => Coffee) public coffees;
    mapping(bytes32 => uint256) public averageRating;
    mapping(bytes32 => uint256) public ratingCount;


    event CoffeeAdded(bytes32 indexed coffeeCode, string name, uint256 priceWei);
    event CoffeePurchased(address indexed buyer, bytes32 indexed coffeeCode, uint256 pricePaid);

    // in OpenZeppelin, Ownable are un constructor care cere explicit adresa ownerului
    constructor() Ownable(msg.sender) {}

    /**
     Adaugare produs nou ( doar ownerul)
     */
    function addCoffee(string memory name, uint256 priceWei, string memory imageCID) 
        external onlyOwner 
        {
            bytes32 coffeeCode = CoffeeLibrary.generateCoffeeCode(name);

            require(!coffees[coffeeCode].exists, "Coffee already exists");

            coffees[coffeeCode] = Coffee({
                name: name,
                priceWei: priceWei,
                imageCID: imageCID,
                exists: true
            });

        emit CoffeeAdded(coffeeCode, name, priceWei);
    }

   
   // external = fct poate fi apelata doar din afara contractului
   // adica poate fi apelata de un user(prin MetaMask, un alt contract, un script)
   // dar nu poate fi apelata intern din acelasi contract

   // payable = fct poate primi ETH
    function buyCoffee(bytes32 coffeeCode) external payable {
        // memory = iau coffees[coffeeCode] din storage si creez o copie temporara in memory
        //        = zona temporara unde val este copiata doar pt durata executiei fct
        Coffee memory coffee = coffees[coffeeCode];

        require(coffee.exists, "Coffee not found");
        require(msg.value == coffee.priceWei, "Incorrect ETH amount");

        // Trimit ETH ownerului
        /*
            Flow complet:
                1. User apasa "Buy"
                2. Metamask trimite ETH catre contract
                3. Contractul verifica daca suma este exact pretul
                4. Contractul forwardeaza ETH catre owner
                5. Emite evenimentul CoffeePurchased
        */
        payable(owner()).transfer(msg.value);

        emit CoffeePurchased(msg.sender, coffeeCode, msg.value);
    }


    // view = fct poate citi date din blockchain, dar nu are voie sa modifice
    function getCoffee(bytes32 coffeeCode)
        external
        view
        returns (
            string memory name,
            uint256 priceWei,
            string memory imageCID
        )
    {
        // citeste din mapping
        Coffee memory coffee = coffees[coffeeCode];
        require(coffee.exists, "Coffee not found");

        return (coffee.name, coffee.priceWei, coffee.imageCID);
    }


    function updateRating(bytes32 coffeeCode, uint8 newRating) external {
        uint256 oldAvg = averageRating[coffeeCode];
        uint256 oldCount = ratingCount[coffeeCode];

        uint256 newAvg = CoffeeLibrary.calculateNewAverageRating(
            oldAvg,
            oldCount,
            newRating
        );

        averageRating[coffeeCode] = newAvg;
        ratingCount[coffeeCode] = oldCount + 1;
    }

}