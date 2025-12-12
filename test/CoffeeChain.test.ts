import { describe, it, before } from "node:test";
import { expect } from "chai";
import hre, { network } from "hardhat";   // aici e fixul
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
  //                ADD COFFEE
  // Verifică faptul că owner-ul poate adăuga o cafea nouă în catalog
  // și că datele sunt salvate corect în mapping-ul coffees
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
  //                BUY COFFEE
  // Verifică procesul complet de cumpărare:
  // utilizatorul trimite suma corectă, iar ETH-ul ajunge la owner
  // ----------------------------------------
  it("Buy coffee", async () => {
    const priceWei = parseEther(COFFEE_PRICE_ETH);

    const before = await publicClient.getBalance({ address: owner.account.address });

    await catalog.write.buyCoffee(
      [coffeeCode],
      { value: priceWei, account: user.account }
    );

    const after = await publicClient.getBalance({ address: owner.account.address });
    expect(after - before).to.equal(priceWei);
  });

  // ----------------------------------------
  //            POST REVIEW + REWARD
  // Verifică faptul că postarea unei recenzii acordă automat
  // 1 token COF utilizatorului
  // ----------------------------------------

  it("Post review + reward", async () => {
    await reviews.write.postReview(
      [coffeeCode, 5, "Great taste!"],
      { account: user.account }
    );

    const bal = await token.read.balanceOf([user.account.address]);
    expect(bal).to.equal(parseEther("1"));
  });

  // ----------------------------------------
  //          BADGE AFTER 5 REVIEWS
  // Verifică logica de fidelizare:
  // după 5 recenzii, utilizatorul primește automat un NFT badge
  // ----------------------------------------

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

  // ----------------------------------------
  //              TOTAL REVIEWS
  // Verifică numărul total de recenzii stocate în contract
  // ----------------------------------------

  it("Total reviews is 5", async () => {
    const total = await reviews.read.getTotalReviews();
    expect(total).to.equal(5n);
  });

  // ----------------------------------------
  //     SET REVIEWS CONTRACT (OWNER)
  // Verifică faptul că owner-ul poate seta contractul CoffeeReviews
  // ca entitate autorizată să acorde reward-uri
  // ----------------------------------------

  it("Owner can set reviews contract", async () => {
  await token.write.setReviewsContract([reviews.address], {
    account: owner.account,
  });

  const rc = await token.read.reviewsContract();
  expect(rc.toLowerCase()).to.equal(reviews.address.toLowerCase());
});

  // ----------------------------------------
  //   SET REVIEWS CONTRACT (NON-OWNER)
  // Verifică faptul că un non-owner nu poate modifica
  // adresa contractului CoffeeReviews
  // ----------------------------------------

  it("Non-owner cannot set reviews contract", async () => {
    let reverted = false;

    try {
      await token.write.setReviewsContract([user.account.address], {
        account: user.account,
      });
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //        SET ZERO ADDRESS CHECK
  // Verifică protecția împotriva setării unei adrese invalide (0x0)
  // ----------------------------------------

  it("Cannot set zero address as reviews contract", async () => {
    let reverted = false;

    try {
      await token.write.setReviewsContract(
        ["0x0000000000000000000000000000000000000000"],
        { account: owner.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //        REWARD ACCESS CONTROL
  // Verifică faptul că doar contractul CoffeeReviews
  // poate acorda token-uri utilizatorilor
  // ----------------------------------------

  it("Only reviews contract can reward user", async () => {
    let reverted = false;

    try {
      await token.write.rewardUser([user.account.address], {
        account: owner.account,
      });
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //     SET REVIEWER CONTRACT (OWNER)
  // Verifică accesul onlyOwner pentru setarea
  // contractului CoffeeReviews în CoffeeBadge
  // ----------------------------------------

  it("Only owner can set reviewer contract", async () => {
    let reverted = false;

    try {
      await badge.write.setReviewerContract([user.account.address], {
        account: user.account,
      });
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //        UNAUTHORIZED BADGE MINT
  // Verifică faptul că mintarea badge-urilor este restricționată
  // și nu poate fi apelată de adrese neautorizate
  // ----------------------------------------

  it("Cannot mint badge from unauthorized address", async () => {
    let reverted = false;

    try {
      await badge.write.mintBadge([user.account.address, 1], {
        account: user.account,
      });
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //         DUPLICATE BADGE CHECK
  // Verifică protecția împotriva acordării aceluiași badge
  // de mai multe ori aceluiași utilizator
  // ----------------------------------------

  it("User cannot receive same badge twice", async () => {
    let reverted = false;

    try {
      await badge.write.mintBadge([user.account.address, 1], {
        account: reviews.account, // simulăm apel din CoffeeReviews
      });
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //              GET BADGES
  // Verifică funcția de citire care returnează
  // lista badge-urilor deținute de un utilizator
  // ----------------------------------------

  it("getBadgesOf returns correct badge list", async () => {
    const badges = await badge.read.getBadgesOf([user.account.address]);
    expect(badges.length).to.equal(1);
    expect(badges[0]).to.equal(1n);
  });

  // ----------------------------------------
  //        ADD COFFEE (NON-OWNER)
  // Verifică faptul că doar owner-ul poate adăuga produse în catalog
  // ----------------------------------------

  it("Non-owner cannot add coffee", async () => {
    let reverted = false;

    try {
      await catalog.write.addCoffee(
        ["Espresso", parseEther("0.01"), "cid"],
        { account: user.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //        DUPLICATE COFFEE CHECK
  // Verifică protecția împotriva adăugării aceleiași cafele de două ori
  // ----------------------------------------

  it("Cannot add duplicate coffee", async () => {
    let reverted = false;

    try {
      await catalog.write.addCoffee(
        [COFFEE_NAME, parseEther("0.01"), COFFEE_IMAGE_CID],
        { account: owner.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //     BUY NON-EXISTING COFFEE
  // Verifică faptul că nu poate fi cumpărat un produs inexistent
  // ----------------------------------------

  it("Cannot buy non-existing coffee", async () => {
    let reverted = false;

    try {
      await catalog.write.buyCoffee(
        [keccak256(toBytes("FakeCoffee"))],
        { value: parseEther("0.01"), account: user.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //        WRONG ETH AMOUNT
  // Verifică faptul că tranzacția este respinsă
  // dacă suma trimisă nu corespunde prețului
  // ----------------------------------------

  it("Cannot buy coffee with wrong ETH amount", async () => {
    let reverted = false;

    try {
      await catalog.write.buyCoffee(
        [coffeeCode],
        { value: parseEther("0.02"), account: user.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });


  // ----------------------------------------
  //           INVALID RATING
  // Verifică validarea rating-ului (acceptat doar între 1 și 5)
  // ----------------------------------------

  it("Cannot post review with invalid rating", async () => {
    let reverted = false;

    try {
      await reviews.write.postReview(
        [coffeeCode, 6, "Bad rating"],
        { account: user.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //              GET REVIEW
  // Verifică funcția de citire care returnează
  // datele corecte ale unei recenzii existente
  // ----------------------------------------

  it("getReview returns correct data", async () => {
    const review = await reviews.read.getReview([0n]);
    expect(review[0].toLowerCase()).to.equal(
    user.account.address.toLowerCase()
  );

  });

  // ----------------------------------------
  //          DELETE COFFEE (OWNER)
  // Verifică faptul că owner-ul poate șterge o cafea
  // și că aceasta nu mai poate fi accesată ulterior
  // ----------------------------------------

  it("Owner can delete coffee", async () => {
    // add coffee nou pt test
    await catalog.write.addCoffee(
      ["Espresso", parseEther("0.02"), "cid-espresso"],
      { account: owner.account }
    );

    const espressoCode = keccak256(toBytes("Espresso"));

    // delete
    await catalog.write.deleteCoffee([espressoCode], {
      account: owner.account,
    });

    let reverted = false;
    try {
      await catalog.read.getCoffee([espressoCode]);
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //      DELETE COFFEE (NON-OWNER)
  // Verifică faptul că un non-owner nu poate șterge
  // produse din catalog
  // ----------------------------------------

  it("Non-owner cannot delete coffee", async () => {
    let reverted = false;

    try {
      await catalog.write.deleteCoffee([coffeeCode], {
        account: user.account,
      });
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //   DELETE NON-EXISTING COFFEE
  // Verifică protecția împotriva ștergerii unui produs inexistent
  // ----------------------------------------

  it("Cannot delete non-existing coffee", async () => {
    let reverted = false;

    try {
      await catalog.write.deleteCoffee(
        [keccak256(toBytes("GhostCoffee"))],
        { account: owner.account }
      );
    } catch {
      reverted = true;
    }

    expect(reverted).to.equal(true);
  });

  // ----------------------------------------
  //            GET ALL COFFEES
  // Verifică funcția care returnează lista completă
  // de cafele disponibile în catalog
  // ----------------------------------------

  it("getAllCoffees returns correct list", async () => {
    const result = await catalog.read.getAllCoffees();
    const codes = result[0];
    const list = result[1];

    expect(codes.length).to.equal(list.length);
    expect(list[0].exists).to.equal(true);
  });


});
