import addresses from "./contract-addresses.json";


import CoffeeCatalogAbi from "./abi/CoffeeCatalog.json";
import CoffeeReviewsAbi from "./abi/CoffeeReviews.json";
import CoffeeTokenAbi from "./abi/CoffeeToken.json";
import CoffeeBadgeAbi from "./abi/CoffeeBadge.json";


export const contracts = {
  CoffeeCatalog: {
    address: addresses.CoffeeCatalog,
    abi: CoffeeCatalogAbi.abi,
  },
  CoffeeReviews: {
    address: addresses.CoffeeReviews,
    abi: CoffeeReviewsAbi.abi,
  },
  CoffeeToken: {
    address: addresses.CoffeeToken,
    abi: CoffeeTokenAbi.abi,
  },
  CoffeeBadge: {
    address: addresses.CoffeeBadge,
    abi: CoffeeBadgeAbi.abi,
  },
} as const;
