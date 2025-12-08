import { describe, it, before } from "node:test";
import { expect } from "chai";
import hre, { network } from "hardhat";   // 🔥 aici e fixul!
import { keccak256, toBytes, parseEther } from "viem";


describe("CoffeeChain – Full Flow with Hardhat 3 + viem", function () {

  let viem: any;
  let publicClient: any;

  let owner: any;
  let user: any;

  let token: any;
  let badge: any;
  let reviews: any;
  let catalog: any;

  const COFFEE_NAME = "Latte";
  const COFFEE_PRICE_ETH = "0.01";
  const COFFEE_IMAGE_CID = "ipfs://latteImageCID";

  let coffeeCode: `0x${string}`;

  before(async function () {

    // 🔥 Singura metodă corectă în Hardhat 3
    const net = await network.connect();
    viem = net.viem;
    publicClient = await viem.getPublicClient();

    const wallets = await viem.getWalletClients();
    owner = wallets[0];
    user = wallets[1];

    token = await viem.deployContract("CoffeeToken", [owner.account.address]);
    badge = await viem.deployContract("CoffeeBadge", [owner.account.address]);
    catalog = await viem.deployContract("CoffeeCatalog", [owner.account.address]);

    reviews = await viem.deployContract("CoffeeReviews", [
      token.address,
      badge.address
    ]);

    // Link contracts
    await token.write.setReviewsContract([reviews.address], { account: owner.account });
    await badge.write.setReviewerContract([reviews.address], { account: owner.account });

    // Compute coffee code
    coffeeCode = keccak256(toBytes(COFFEE_NAME));
  });

  // ----------------------------------------
  it("Add coffee", async () => {
    const priceWei = parseEther(COFFEE_PRICE_ETH);

    await catalog.write.addCoffee(
      [COFFEE_NAME, priceWei, COFFEE_IMAGE_CID],
      { account: owner.account }
    );

    const coffee = await catalog.read.getCoffee([coffeeCode]);
    expect(coffee[0]).to.equal(COFFEE_NAME);
  });

  // ----------------------------------------
  it("Buy coffee", async () => {
    const priceWei = parseEther(COFFEE_PRICE_ETH);

    await catalog.write.buyCoffee(
      [coffeeCode],
      { value: priceWei, account: user.account }
    );
  });

  // ----------------------------------------
  it("Post review + reward", async () => {
    await reviews.write.postReview(
      [coffeeCode, 5, "Great taste!"],
      { account: user.account }
    );

    const bal = await token.read.balanceOf([user.account.address]);
    expect(bal).to.equal(parseEther("1"));
  });

  // ------------------------------------------------------------------
  it("After 5 reviews, user receives 1 NFT badge", async () => {
    // deja avem 1 review din testul anterior → mai facem 4
    for (let i = 0; i < 4; i++) {
      await reviews.write.postReview(
        [coffeeCode, 4, `Another review ${i}`],
        { account: user.account }
      );
    }

    const badgeBalance = await badge.read.balanceOf([user.account.address]);
    expect(badgeBalance).to.equal(1n);
  });

  // ------------------------------------------------------------------
  it("Total reviews is 5", async () => {
    const total = await reviews.read.getTotalReviews();
    expect(total).to.equal(5n);
  });

});
