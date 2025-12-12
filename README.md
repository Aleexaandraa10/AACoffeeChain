# ☕ AACoffeeChain – Web3 Coffee Marketplace

AACoffeeChain is a decentralized Web3 application that simulates a coffee marketplace built on Ethereum.
Users can buy coffee products using ETH, post on-chain reviews, earn ERC-20 reward tokens, and receive ERC-721 NFT loyalty badges.

The project showcases a complete Web3 flow, from smart contract development and testing to frontend integration, highlighting core blockchain concepts such as ETH transfers, contract interaction, events, access control, and token standards.


## ✨ Main Features

* Connect wallet using **MetaMask**
* Display connected wallet address and ETH balance
* View available coffee products stored on-chain
* Buy coffee using ETH (on-chain transaction)
* Post on-chain reviews (rating + text)
* Automatically receive **CoffeeToken (ERC-20)** for each review
* Earn **CoffeeBadge (ERC-721 NFT)** loyalty badges after a number of reviews
* Full smart contract event handling
* Gas estimation and transaction error handling in the frontend
* Separation between backend (smart contracts) and frontend logic


## 🧱 Smart Contract Architecture

The system is composed of multiple smart contracts, each with a well-defined responsibility:

* **CoffeeCatalog**
  Manages coffee products, prices, ETH payments, and product availability.

* **CoffeeReviews**
  Handles review creation, reward logic, and badge eligibility.

* **CoffeeToken (ERC-20)**
  Reward token granted to users for posting reviews.

* **CoffeeBadge (ERC-721)**
  NFT-based loyalty system for active users.

* **CoffeeLibrary**
  Utility library for coffee code generation and rating calculations.

All contracts are thoroughly tested using Hardhat and viem.


## 🧪 Testing

The project includes a comprehensive test suite that covers:

* Happy paths for all main functionalities
* Access control (`onlyOwner`, authorized contracts)
* Revert cases and edge conditions
* ETH transfers and balance checks
* ERC-20 rewards and ERC-721 minting logic
* Product deletion and validation logic

Tests are written using **Hardhat 3**, **viem**, and **node:test**.

To run the tests:

```bash
npx hardhat test
```

## 🌿 Branching Workflow

This project follows a clean and simple Git branching strategy:

* **alexandra** – personal feature branch for Alexandra
* **andra** – personal feature branch for Andra
* **develop** – integration branch where features are merged and tested
* **main** – stable, production-ready branch containing the final validated version
* **bugs** – branch dedicated to bug fixes, hotfixes, and stability improvements

This workflow ensures clarity, traceability, and stability of the final codebase.


## 🛠️ Technologies Used

* **Solidity**
* **Hardhat**
* **viem**
* **ethers.js**
* **React / Next.js**
* **MetaMask**
* **IPFS**
* **ERC-20 & ERC-721 standards**


## 🎓 Educational Purpose

This project was developed as part of the **Blockchain course (FMI – University of Bucharest)** and is intended for educational purposes, demonstrating real-world Web3 application architecture and best practices.


## 🚀 Future Improvements

* Multi-network deployment (Sepolia / Mainnet)
* Improved gas optimization
* Extended loyalty system with multiple badge levels
