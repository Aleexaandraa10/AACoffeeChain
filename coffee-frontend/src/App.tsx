import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import coffeeCatalogAbi from "./abi/CoffeeCatalog.json";
import coffeeReviewsAbi from "./abi/CoffeeReviews.json";

import { CoffeeCatalogAddress, CoffeeReviewsAddress } from "./services/CoffeeService";

import {
  getCoffees,
  buyCoffee,
  getReviews,
  addReview,
  getTokenBalance,
  getETHBalance,
  getUserReviewCount,
  getWalletClient,
  publicClient,
  getBadges,
  getBadgeURI,
  BADGE_THRESHOLD,
  shortenAddress,
  type UICoffee,
  type Review,
} from "./services/CoffeeService";

import { formatEther } from "viem";

// -------- Stars component --------
const Stars = ({ score }: { score: number }) => {
  const full = "★".repeat(score);
  const empty = "☆".repeat(5 - score);
  return <span className="stars">{full}{empty}</span>;
};


// -------- Badge metadata type -----
interface BadgeMeta {
  id: number;        // index in array
  tokenId: bigint;   // actual NFT id
  uri: string;       // metadata URI
}

function App() {
  const [account, setAccount] = useState<string>("");
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [cftBalance, setCftBalance] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const [badges, setBadges] = useState<BadgeMeta[]>([]);

  const [coffees, setCoffees] = useState<UICoffee[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>({});
  const [selectedCoffee, setSelectedCoffee] = useState<string | null>(null);

  const [reviewText, setReviewText] = useState("");
  const [reviewScore, setReviewScore] = useState(5);

  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // ===================================================
  //  INITIAL LOAD
  // ===================================================
  useEffect(() => {
    (async () => {
      try {
        const wallet = await getWalletClient();
        const addr = wallet.account.address as string;
        setAccount(addr);

        const [eth, cft, count, coffeeList] = await Promise.all([
          getETHBalance(addr),
          getTokenBalance(addr),
          getUserReviewCount(addr),
          getCoffees(),
        ]);

        setEthBalance(eth);
        setCftBalance(cft);
        setReviewCount(count);
        setCoffees(coffeeList);

        // Load badges metadata
        const badgeIds = await getBadges(addr);   // bigint[]
        const metadata: BadgeMeta[] = await Promise.all(
          badgeIds.map(async (tokenId, idx) => ({
            id: idx,
            tokenId,
            uri: await getBadgeURI(tokenId),
          }))
        );
        setBadges(metadata);

        if (coffeeList.length > 0) {
          await loadReviewsForCoffee(coffeeList[0].code);
        }
      } catch (err) {
        console.error(err);
        alert("Init error, see console.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

// =====================================================
// OBSERVER PATTERN – ascultăm CoffeePurchased & ReviewPosted live
// =====================================================
useEffect(() => {
  if (!account) return;

  // Watch CoffeePurchased de pe CoffeeCatalog
  const unwatchPurchase = publicClient.watchContractEvent({
    address: CoffeeCatalogAddress,
    abi: coffeeCatalogAbi.abi,
    eventName: "CoffeePurchased",
    onLogs(logs) {
      console.log("CoffeePurchased detected!", logs);

      // refresh balances + coffees
      Promise.all([
        getETHBalance(account),
        getTokenBalance(account),
        getCoffees(),
      ])
        .then(([eth, cft, coffeeList]) => {
          setEthBalance(eth);
          setCftBalance(cft);
          setCoffees(coffeeList);
        })
        .catch(console.error);
    },
  });

  // Watch ReviewPosted de pe CoffeeReviews
  const unwatchReview = publicClient.watchContractEvent({
    address: CoffeeReviewsAddress,
    abi: coffeeReviewsAbi.abi,
    eventName: "ReviewPosted",
    onLogs(logs) {
      console.log("ReviewPosted detected!", logs);

      if (selectedCoffee) {
        loadReviewsForCoffee(selectedCoffee);
      }

      getUserReviewCount(account)
        .then(setReviewCount)
        .catch(console.error);

      getBadges(account)
        .then(async (ids) => {
          const meta = await Promise.all(
            ids.map(async (tokenId, idx) => ({
              id: idx,
              tokenId,
              uri: await getBadgeURI(tokenId),
            }))
          );
          setBadges(meta);
        })
        .catch(console.error);
    },
  });

  // cleanup
  return () => {
    unwatchPurchase?.();
    unwatchReview?.();
  };
}, [account, selectedCoffee]);



  // ===================================================
  // LOAD REVIEWS FOR ONE COFFEE
  // ===================================================
  const loadReviewsForCoffee = async (code: string) => {
    try {
      setReviewLoading(true);
      const revs = await getReviews(code);
      setReviewsMap((prev) => ({ ...prev, [code]: revs }));
      setSelectedCoffee(code);
    } finally {
      setReviewLoading(false);
    }
  };

  const getCoffeeNameByCode = (code: string) => {
    const c = coffees.find((x) => x.code === code);
    return c ? c.name : "Unknown coffee";
  };

  // ===================================================
  // BUY COFFEE
  // ===================================================
 const handleBuy = async (coffee: UICoffee) => {
  try {
    setTxLoading(true);

    const txHash = await buyCoffee(coffee);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (account) {
      const [eth, cft] = await Promise.all([
        getETHBalance(account),
        getTokenBalance(account),
      ]);
      setEthBalance(eth);
      setCftBalance(cft);
    }

    alert("Coffee purchased!");
  } catch (err) {
    console.error(err);
    alert("Buy failed.");
  } finally {
    setTxLoading(false);
  }
};


  // ===================================================
  // SUBMIT REVIEW
  // ===================================================
 const handleSubmitReview = async (e: FormEvent) => {
  e.preventDefault();

  if (!selectedCoffee) return alert("Select a coffee first");
  if (!reviewText.trim()) return alert("Review text missing");

  try {
    setReviewLoading(true);

    const txHash = await addReview(selectedCoffee, reviewScore, reviewText.trim());
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    setReviewText("");
    setReviewScore(5);

    await loadReviewsForCoffee(selectedCoffee);

    if (account) {
      const [cft, newCount, badgeIds] = await Promise.all([
        getTokenBalance(account),
        getUserReviewCount(account),
        getBadges(account),
      ]);

      setCftBalance(cft);
      setReviewCount(newCount);

      const metadata: BadgeMeta[] = await Promise.all(
        badgeIds.map(async (tokenId, idx) => ({
          id: idx,
          tokenId,
          uri: await getBadgeURI(tokenId),
        }))
      );

      setBadges(metadata);
    }

    alert("Review submitted!");
  } catch (err) {
    console.error(err);
    alert("Review failed.");
  } finally {
    setReviewLoading(false);
  }
};



  // ===================================================
  // RENDER
  // ===================================================
  return (
    <div className="app-container">
      <div className="content">

        {/* HEADER */}
        <header className="header">
          <h1>CoffeeChain ☕</h1>
          <p className="header-sub">A tiny Web3 coffee shop on Hardhat</p>
        </header>

        {/* PROFILE CARD */}
        <section className="profile-card">
          <div className="profile-row">
            <span className="label">Wallet:</span>
            <span className="value">{shortenAddress(account)}</span>
          </div>

          <div className="profile-stats">
            <div>
              <div className="stat-label">ETH balance</div>
              <div>{ethBalance.toFixed(4)} ETH</div>
            </div>

            <div>
              <div className="stat-label">CFT balance</div>
              <div>{cftBalance} CFT</div>
            </div>

            <div>
              <div className="stat-label">Your reviews</div>
              <div>{reviewCount} / {BADGE_THRESHOLD}</div>
            </div>
          </div>

          <div className="badge-status">
            {reviewCount >= BADGE_THRESHOLD ? "🎖 Badge unlocked!" : "Keep reviewing ☕"}
          </div>
        </section>

        {/* BADGES */}
        <section className="badges-section">
          <h2>My Badges</h2>

          {badges.length === 0 ? (
            <p className="no-badges">No badges yet.</p>
          ) : (
            <div className="badge-grid">
              {badges.map((b) => (
                <div className="badge-card" key={b.id}>
                  <div className="badge-icon">🎖</div>
                  <div className="badge-id">Token #{b.tokenId.toString()}</div>
                  <div className="badge-uri">{b.uri}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* COFFEES */}
        <section className="coffee-list-section">
          <h2>All Coffees</h2>

          {loading && <p>Loading coffees...</p>}

          {!loading && coffees.map((c) => {
            const reviews = reviewsMap[c.code] || [];
            const selected = selectedCoffee === c.code;

            return (
              <div key={c.code} className="coffee-card">
                <div className="coffee-top">
                  <div>
                    <div className="coffee-name">{c.name}</div>
                    <div className="coffee-price">
                      {Number(formatEther(c.priceWei)).toFixed(4)} ETH
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuy(c)}
                    className="btn-buy"
                    disabled={txLoading}
                  >
                    {txLoading ? "Processing..." : "Buy"}
                  </button>
                </div>

                <button
                  onClick={() => loadReviewsForCoffee(c.code)}
                  className={`btn-reviews ${selected ? "selected" : ""}`}
                >
                  {selected ? "Reviews (selected)" : "Show reviews"}
                </button>

                {/* REVIEWS */}
                {reviews.length === 0 ? (
                  <p className="no-reviews">
                    {reviewLoading && selected ? "Loading..." : "No reviews yet."}
                  </p>
                ) : (
                  <ul>
                    {reviews.map((r, i) => (
                      <li key={i}>
                        <Stars score={r.score} /> "
                        <span className="review-text">{r.text}</span>" —
                        <span className="review-author">{shortenAddress(r.reviewer)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {/* ADD REVIEW */}
        <section className="add-review-section">
          <h2>Add Review</h2>
          <p className="add-review-sub">
            {selectedCoffee
              ? `You are reviewing: ${getCoffeeNameByCode(selectedCoffee)}`
              : "Select a coffee first"}
          </p>

          <form onSubmit={handleSubmitReview} className="review-form">
            <input
              placeholder="Text..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="input-text"
            />

            <input
              type="number"
              min={1}
              max={5}
              value={reviewScore}
              onChange={(e) => setReviewScore(Number(e.target.value))}
              className="input-score"
            />

            <button type="submit" className="btn-submit" disabled={!selectedCoffee || reviewLoading}>
              {reviewLoading ? "Sending..." : "Submit"}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}

export default App;
