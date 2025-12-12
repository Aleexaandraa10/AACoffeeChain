import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  formatEther,
} from "viem";

import { hardhat } from "viem/chains";

import coffeeTokenAbi from "../abi/CoffeeToken.json";
import coffeeCatalogAbi from "../abi/CoffeeCatalog.json";
import coffeeReviewsAbi from "../abi/CoffeeReviews.json";
import coffeeBadgeAbi from "../abi/CoffeeBadge.json";

import addresses from "../contract-addresses.json";

// ============================================================================
//                                   Types
// ============================================================================

export interface UICoffee {
  code: string;
  name: string;
  priceWei: bigint;
  imageCID: string;
}

export interface Review {
  reviewer: string;
  score: number;
  text: string;
  coffeeCode: string;
}

// =============================================================================
//                               Contract addresses
// ==============================================================================

export const CoffeeTokenAddress = addresses.CoffeeToken as Address;
export const CoffeeCatalogAddress = addresses.CoffeeCatalog as Address;
export const CoffeeReviewsAddress = addresses.CoffeeReviews as Address;
export const CoffeeBadgeAddress = addresses.CoffeeBadge as Address;

export const BADGE_THRESHOLD = 5; // BADGE threshold from contract


// ===========================================================================
//                                Blockchain Clients
// =============================================================================
export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(),
});

export const getWalletClient = async () => {
  if (!window.ethereum) throw new Error("MetaMask missing");

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  return createWalletClient({
    account: accounts[0] as Address,
    chain: hardhat,
    transport: custom(window.ethereum),
  });
};


// ==============================================================================
//                                Utils
// ==============================================================================
export const toBytes32 = (code: string) =>
  code as `0x${string}`;

export const shortenAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

export const formatETH = (wei: bigint) => Number(formatEther(wei)).toFixed(4);


// Convert IPFS → HTTP (Pinata Gateway)
export const ipfsToHttp = (uri: string) => {
  if (!uri) return "";
  return uri.replace(
    "ipfs://",
    "https://aquamarine-magnificent-squid-227.mypinata.cloud/ipfs/"
  );
};


// =================================================================================
//                                  1. Coffees
// =================================================================================
export const getCoffees = async (): Promise<UICoffee[]> => {
  const [codes, list] = (await publicClient.readContract({
    address: CoffeeCatalogAddress,
    abi: coffeeCatalogAbi.abi,
    functionName: "getAllCoffees",
  })) as [
    string[],
    { name: string; priceWei: bigint; imageCID: string; exists: boolean }[]
  ];

  return list.map((c, i) => ({
    code: codes[i],
    name: c.name,
    priceWei: c.priceWei,
    imageCID: c.imageCID,
  }));
};

export const buyCoffee = async (coffee: UICoffee) => {
  const wallet = await getWalletClient();
  const codeBytes = toBytes32(coffee.code);

  return wallet.writeContract({
    address: CoffeeCatalogAddress,
    abi: coffeeCatalogAbi.abi,
    functionName: "buyCoffee",
    args: [codeBytes],
    value: coffee.priceWei,
  });
};

export async function deleteCoffee(code: string) {
  const wallet = await getWalletClient();

  return wallet.writeContract({
    address: CoffeeCatalogAddress,
    abi: coffeeCatalogAbi.abi,
    functionName: "deleteCoffee",
    args: [code],
  });
}


// ======================================
// Estimate gas + cost for buying a coffee
// ======================================
export async function estimateBuyCoffeeGas(coffee: UICoffee) {
  const codeBytes = coffee.code as `0x${string}`;

  // gas estimation for buyCoffee
  const gas = await publicClient.estimateContractGas({
    address: CoffeeCatalogAddress,
    abi: coffeeCatalogAbi.abi,
    functionName: "buyCoffee",
    args: [codeBytes],
    value: coffee.priceWei,
  });

  const gasPrice = await publicClient.getGasPrice();

  const gasCost = gas * gasPrice;
  const totalCost = gasCost + coffee.priceWei;

  return {
    gas,
    gasPrice,
    gasCost,
    totalCost,
  };
}


// ===================================================================================
//                                    2. Reviews
// ===================================================================================
export async function estimateReviewGas(code: string, score: number, text: string) {
  const codeBytes = code as `0x${string}`;

  const gas = await publicClient.estimateContractGas({
    address: CoffeeReviewsAddress,
    abi: coffeeReviewsAbi.abi,
    functionName: "postReview",
    args: [codeBytes, score, text],
  });

  const gasPrice = await publicClient.getGasPrice();
  const gasCost = gas * gasPrice;
  const totalCost = gasCost; // postReview nu are value

  return {
    gas,
    gasPrice,
    gasCost,
    totalCost,
  };
}

export const addReview = async (
  code: string,
  score: number,
  text: string
) => {
  const wallet = await getWalletClient();
  const codeBytes = toBytes32(code);

  return wallet.writeContract({
    address: CoffeeReviewsAddress,
    abi: coffeeReviewsAbi.abi,
    functionName: "postReview",
    args: [codeBytes, score, text],
  });
};

// get all reviews for a specific coffee
export const getReviewsForCoffee = async (
  code: string
): Promise<Review[]> => {
  const codeBytes = toBytes32(code);

  const total = (await publicClient.readContract({
    address: CoffeeReviewsAddress,
    abi: coffeeReviewsAbi.abi,
    functionName: "getTotalReviews",
  })) as bigint;

  const count = Number(total);
  const list: Review[] = [];

  for (let i = 0; i < count; i++) {
    const r = (await publicClient.readContract({
      address: CoffeeReviewsAddress,
      abi: coffeeReviewsAbi.abi,
      functionName: "getReview",
      args: [BigInt(i)],
    })) as [string, string, bigint, string, bigint];

    const [reviewer, coffeeCode, rating, text] = r;

    if (coffeeCode === codeBytes) {
      list.push({
        reviewer,
        score: Number(rating),
        text,
        coffeeCode: code,
      });
    }
  }

  return list;
};

// alias simplu pentru frontend
export const getReviews = getReviewsForCoffee;


// =============================================================================
//                  3. User Stats (ETH, Token, Reviews)
// =============================================================================
export const getTokenBalance = async (user: string): Promise<number> => {
  const raw = (await publicClient.readContract({
    address: CoffeeTokenAddress,
    abi: coffeeTokenAbi.abi,
    functionName: "balanceOf",
    args: [user as Address],
  })) as bigint;

  return Number(raw);
};

export const getETHBalance = async (user: string): Promise<number> => {
  const bal = await publicClient.getBalance({ address: user as Address });
  return Number(formatEther(bal));
};

export const getUserReviewCount = async (
  user: string
): Promise<number> => {
  const raw = (await publicClient.readContract({
    address: CoffeeReviewsAddress,
    abi: coffeeReviewsAbi.abi,
    functionName: "reviewCount",
    args: [user as Address],
  })) as bigint;

  return Number(raw);
};


// ===========================================================================
//                    4. NFT Badges 
// ===========================================================================
export const getBadges = async (user: string): Promise<bigint[]> => {
  try {
    const ids = (await publicClient.readContract({
      address: CoffeeBadgeAddress,
      abi: coffeeBadgeAbi.abi,
      functionName: "getBadgesOf",
      args: [user],
    })) as bigint[];

    return ids; // keep bigint[]
  } catch (err) {
    console.error("getBadges error:", err);
    return [];
  }
};


export const getBadgeURI = async (tokenId: bigint): Promise<string> => {
  return await publicClient.readContract({
    address: CoffeeBadgeAddress,
    abi: coffeeBadgeAbi.abi,
    functionName: "tokenURI",
    args: [tokenId]
  }) as string;
};
