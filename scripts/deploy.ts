// npx hardhat run scripts/deploy.ts --network localhost

import hre from "hardhat";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("\nDeploying CoffeeChain contracts...\n");

  // === 1. Provider + signer corect (ethers v6) ===
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const deployer = await provider.getSigner();        
  const deployerAddr = await deployer.getAddress();

  console.log("Deployer:", deployerAddr, "\n");

  // === 2. Artifacts din Hardhat ===
  const CatalogArt  = await hre.artifacts.readArtifact("CoffeeCatalog");
  const TokenArt    = await hre.artifacts.readArtifact("CoffeeToken");
  const BadgeArt    = await hre.artifacts.readArtifact("CoffeeBadge");
  const ReviewsArt  = await hre.artifacts.readArtifact("CoffeeReviews");

  // === 3. Deploy CoffeeToken ===
  console.log("Deploying CoffeeToken...");
  const CoffeeTokenFactory = new ethers.ContractFactory(
    TokenArt.abi,
    TokenArt.bytecode,
    deployer
  );
  const coffeeToken = await CoffeeTokenFactory.deploy(deployerAddr);
  await coffeeToken.waitForDeployment();
  const coffeeTokenAddr = await coffeeToken.getAddress();
  console.log("CoffeeToken deployed at:", coffeeTokenAddr, "\n");

  // === 4. Deploy CoffeeBadge ===
  console.log("Deploying CoffeeBadge...");
  const CoffeeBadgeFactory = new ethers.ContractFactory(
    BadgeArt.abi,
    BadgeArt.bytecode,
    deployer
  );
  const coffeeBadge = await CoffeeBadgeFactory.deploy(deployerAddr);
  await coffeeBadge.waitForDeployment();
  const coffeeBadgeAddr = await coffeeBadge.getAddress();
  console.log("CoffeeBadge deployed at:", coffeeBadgeAddr, "\n");

  // === 5. Deploy CoffeeCatalog ===
  console.log("Deploying CoffeeCatalog...");
  const CoffeeCatalogFactory = new ethers.ContractFactory(
    CatalogArt.abi,
    CatalogArt.bytecode,
    deployer
  );
  const coffeeCatalog = await CoffeeCatalogFactory.deploy(deployerAddr);
  await coffeeCatalog.waitForDeployment();
  const coffeeCatalogAddr = await coffeeCatalog.getAddress();
  console.log("CoffeeCatalog deployed at:", coffeeCatalogAddr, "\n");

  // === 6. Deploy CoffeeReviews ===
  console.log("Deploying CoffeeReviews...");
  const CoffeeReviewsFactory = new ethers.ContractFactory(
    ReviewsArt.abi,
    ReviewsArt.bytecode,
    deployer
  );
  const coffeeReviews = await CoffeeReviewsFactory.deploy(
    coffeeTokenAddr,
    coffeeBadgeAddr
  );
  await coffeeReviews.waitForDeployment();
  const coffeeReviewsAddr = await coffeeReviews.getAddress();
  console.log("CoffeeReviews deployed at:", coffeeReviewsAddr, "\n");

  // === 7. Link-uri între contracte (TS-safe cu `as any`) ===
  console.log("Setting token & badge links...");
  await (coffeeToken  as any).setReviewsContract(coffeeReviewsAddr);
  await (coffeeBadge  as any).setReviewerContract(coffeeReviewsAddr);
  console.log("Links set successfully.\n");

  // === 8. Salvare adrese pentru frontend in contract-addresses.json ===
  const addresses = {
    CoffeeToken:   coffeeTokenAddr,
    CoffeeBadge:   coffeeBadgeAddr,
    CoffeeCatalog: coffeeCatalogAddr,
    CoffeeReviews: coffeeReviewsAddr,
  };

  const outPath = path.join(
    __dirname,
    "../coffee-frontend/src/contract-addresses.json"
  );

  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("Addresses written to contract-addresses.json\n");

  console.log("☕ Adding initial coffees...");

  const priceEspresso = ethers.parseEther("0.01"); // 0.01 ETH
  const priceLatte    = ethers.parseEther("0.02"); // 0.02 ETH
  const priceCapp     = ethers.parseEther("0.03"); // 0.03 ETH

  await (coffeeCatalog as any).addCoffee("Espresso", priceEspresso, "bafkreie3wmtrez67wdurzztvnknij65e7qt52nrit3k6zwibwrhkngzs34");
  await (coffeeCatalog as any).addCoffee("Latte",    priceLatte,    "bafkreifllw2trbjry3gkdfoger2643w2mcvbx7ilxqbmun5eiwfvieubp4");
  await (coffeeCatalog as any).addCoffee("Cappuccino", priceCapp,   "bafkreidjts2jwnnhwn4gnjs6ryvwxf6xq6ivbcrnpasmcdydzxpowfbrny");

  console.log("☕ Coffees added!");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});