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

    bytes32[] public coffeeCodes;

    event CoffeeAdded(bytes32 indexed code, string name, uint256 priceWei, string imageCID);
    event CoffeePurchased(address indexed buyer, bytes32 indexed code, uint256 priceWei);

    // in OpenZeppelin, Ownable are un constructor care cere explicit adresa ownerului
    constructor(address initialOwner)
        Ownable(initialOwner)
    {}


    /**
     Adaugare produs nou ( doar ownerul)
     */
    function addCoffee(string memory name, uint256 priceWei, string memory imageCID)
        external
        onlyOwner
    {
        bytes32 coffeeCode = CoffeeLibrary.generateCoffeeCode(name);
        require(!coffees[coffeeCode].exists, "Coffee exists");

        coffees[coffeeCode] = Coffee(name, priceWei, imageCID, true);
        coffeeCodes.push(coffeeCode);

        emit CoffeeAdded(coffeeCode, name, priceWei, imageCID);
    }



    // external = fct poate fi apelata doar din afara contractului
    // adica poate fi apelata de un user(prin MetaMask, un alt contract, un script)
    // dar nu poate fi apelata intern din acelasi contract

    // payable = fct poate primi ETH
    function buyCoffee(bytes32 code) external payable {
        // memory = iau coffees[coffeeCode] din storage si creez o copie temporara in memory
        //        = zona temporara unde val este copiata doar pt durata executiei fct
        Coffee memory c = coffees[code];
        require(c.exists, "Coffee not found");
        require(msg.value == c.priceWei, "Incorrect ETH");

         // Trimit ETH ownerului
        /*
            Flow complet:
                1. User apasa "Buy"
                2. Metamask trimite ETH catre contract
                3. Contractul verifica daca suma este exact pretul
                4. Contractul forwardeaza ETH catre owner
                5. Emite evenimentul CoffeePurchased
        */

        (bool ok,) = payable(owner()).call{value: msg.value}("");
        require(ok, "ETH failed");

        emit CoffeePurchased(msg.sender, code, msg.value);
    }


    // view = fct poate citi date din blockchain, dar nu are voie sa modifice
    function getCoffee(bytes32 code)
        external
        view
        returns (string memory, uint256, string memory)
    { // citeste din mapping
        Coffee memory c = coffees[code];
        require(c.exists, "Coffee not found");
        return (c.name, c.priceWei, c.imageCID);
    }

    function updateRating(bytes32 code, uint8 newRating) external {
        uint256 oldAvg = averageRating[code];
        uint256 oldCount = ratingCount[code];

        uint256 newAvg =
            CoffeeLibrary.calculateNewAverageRating(oldAvg, oldCount, newRating);

        averageRating[code] = newAvg;
        ratingCount[code] = oldCount + 1;
    }

    
    function getAllCoffees()
        external
        view
        returns (bytes32[] memory, Coffee[] memory)
    {
        Coffee[] memory list = new Coffee[](coffeeCodes.length);

        for (uint256 i = 0; i < coffeeCodes.length; i++) {
            list[i] = coffees[coffeeCodes[i]];
        }

        return (coffeeCodes, list);
    }

}
