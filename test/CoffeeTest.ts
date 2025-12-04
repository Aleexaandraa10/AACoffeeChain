import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { network } from "hardhat";

describe("CoffeeChain Full Flow – Hardhat 3 + viem", async () => {
  let viem: any;
  let publicClient: any;

  let owner: any;
  let user: any;

  let token: any;
  let badge: any;
  let reviews: any;
  let catalog: any;

  before(async () => {
    const net = await network.connect();
    viem = net.viem;
    publicClient = await viem.getPublicClient();

    // Wallets
    const wallets = await viem.getWalletClients();
    owner = wallets[0];
    user = wallets[1];

    // Deploy CoffeeToken
    token = await viem.deployContract("CoffeeToken");
    
    // Deploy CoffeeBadge
    badge = await viem.deployContract("CoffeeBadge");

    // Deploy CoffeeReviews
    reviews = await viem.deployContract("CoffeeReviews", {
      args: [token.address, badge.address],
    });

    // Deploy CoffeeCatalog
    catalog = await viem.deployContract("CoffeeCatalog", {
      args: [token.address, reviews.address],
    });
  });

  // ------------------------------------------------------------------
  it("Add coffee", async () => {
    const code = viem.toHex("Latte");

    await viem.assertions.emitWithArgs(
      catalog.write.addCoffee([code, "Latte"]),
      catalog,
      "CoffeeAdded",
      [code, "Latte"]
    );
  });

  // ------------------------------------------------------------------
  it("Buy coffee with ETH", async () => {
    const code = viem.toHex("Latte");

    await viem.assertions.emit(
      catalog.write.buyCoffee([code], { value: viem.parseEther("0.01"), account: user.account }),
      catalog,
      "CoffeePurchased"
    );
  });

  // ------------------------------------------------------------------
  it("Post review and get rewarded 1 COF token", async () => {
    const code = viem.toHex("Latte");

    await viem.assertions.emit(
      reviews.write.postReview([code, 5, "Great taste!"], { account: user.account }),
      reviews,
      "ReviewPosted"
    );

    const bal = await token.read.balanceOf([user.account.address]);
    assert.equal(bal, viem.parseEther("1"));
  });

  // ------------------------------------------------------------------
  it("After 5 reviews, user receives 1 NFT badge", async () => {
    const code = viem.toHex("Latte");

    for (let i = 0; i < 4; i++) {
      await reviews.write.postReview(
        [code, 4, `Another review ${i}`],
        { account: user.account }
      );
    }

    const badgeBalance = await badge.read.balanceOf([user.account.address]);
    assert.equal(badgeBalance, 1n);
  });

  // ------------------------------------------------------------------
  it("Total reviews is 5", async () => {
    const code = viem.toHex("Latte");
    const total = await reviews.read.getTotalReviews([code]);
    assert.equal(total, 5n);
  });
});
