import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CoffeeChainModule", (m) => {

  // 1. Deploy CoffeeToken
  const coffeeToken = m.contract("CoffeeToken", []);

  // 2. Deploy CoffeeBadge
  const coffeeBadge = m.contract("CoffeeBadge", []);

  // 3. Deploy CoffeeReviews (cu adresele token + badge)
  const coffeeReviews = m.contract("CoffeeReviews", [
    coffeeToken, 
    coffeeBadge
  ]);

  // 4. Deploy CoffeeCatalog (nu are constructor)
  const coffeeCatalog = m.contract("CoffeeCatalog", []);

  // 5. Setăm contractele autorizate
  m.call(coffeeToken, "setReviewsContract", [coffeeReviews]);
  m.call(coffeeBadge, "setReviewerContract", [coffeeReviews]);

  return {
    token: coffeeToken,
    badge: coffeeBadge,
    reviews: coffeeReviews,
    catalog: coffeeCatalog
  };
});
