import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

import coffeeCatalogAbi from "./abi/CoffeeCatalog.json";
import coffeeReviewsAbi from "./abi/CoffeeReviews.json";

import {
  CoffeeCatalogAddress,
  CoffeeReviewsAddress,
  getCoffees,
  buyCoffee,
  estimateBuyCoffeeGas,
  estimateReviewGas,
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

// ⭐⭐⭐ STARS COMPONENT ⭐⭐⭐
const Stars = ({ score }: { score: number }) => {
  return <span className="stars">{"★".repeat(score)}{"☆".repeat(5 - score)}</span>;
};

// ---------------- Badge metadata type ----------------
interface BadgeMeta {
  id: number;
  tokenId: bigint;
  uri: string;
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

  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimateData, setEstimateData] = useState<{
    gas: bigint;
    gasCost: bigint;
    totalCost: bigint;
  } | null>(null);

  const [pendingCoffee, setPendingCoffee] = useState<UICoffee | null>(null);
  const [pendingReview, setPendingReview] = useState<{
    code: string;
    score: number;
    text: string;
  } | null>(null);

  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, msg: string) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3000);
  };

  const getReadableError = (err: any): string => {
    const msg = err?.message || "";
    if (msg.includes("User rejected")) return "You cancelled the MetaMask transaction.";
    if (msg.includes("insufficient funds")) return "Not enough ETH.";
    if (msg.includes("execution reverted")) return "Transaction failed.";
    return "Unexpected error.";
  };

  // ===================================================
  // INITIAL LOAD
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
        const badgeIds = await getBadges(addr);
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
        alert("Init failed — see console.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // =====================================================
  // WATCH EVENTS
  // =====================================================
  useEffect(() => {
    if (!account) return;

    const unwatchPurchase = publicClient.watchContractEvent({
      address: CoffeeCatalogAddress,
      abi: coffeeCatalogAbi.abi,
      eventName: "CoffeePurchased",
      onLogs() {
        Promise.all([getETHBalance(account), getTokenBalance(account), getCoffees()])
          .then(([eth, cft, list]) => {
            setEthBalance(eth);
            setCftBalance(cft);
            setCoffees(list);
          })
          .catch(console.error);
      },
    });

    const unwatchReview = publicClient.watchContractEvent({
      address: CoffeeReviewsAddress,
      abi: coffeeReviewsAbi.abi,
      eventName: "ReviewPosted",
      onLogs() {
        if (selectedCoffee) loadReviewsForCoffee(selectedCoffee);

        getUserReviewCount(account).then(setReviewCount);

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

    return () => {
      unwatchPurchase?.();
      unwatchReview?.();
    };
  }, [account, selectedCoffee]);

  // ===================================================
  // LOAD REVIEWS
  // ===================================================
  const loadReviewsForCoffee = async (code: string | null | undefined) => {
    if (!code?.startsWith("0x")) return;

    try {
      setReviewLoading(true);
      const revs = await getReviews(code);
      setReviewsMap((prev) => ({ ...prev, [code]: revs }));
      setSelectedCoffee(code);
    } finally {
      setReviewLoading(false);
    }
  };

  const getCoffeeNameByCode = (code?: string) => {
    const c = coffees.find((x) => x.code === code);
    return c ? c.name : "Unknown coffee";
  };

  // ===================================================
  // BUY COFFEE
  // ===================================================
  const handleBuy = async (coffee: UICoffee) => {
    try {
      setTxLoading(true);

      const est = await estimateBuyCoffeeGas(coffee);
      setEstimateData({
        gas: est.gas,
        gasCost: est.gasCost,
        totalCost: est.totalCost,
      });

      setPendingCoffee(coffee);
      setShowEstimateModal(true);
    } catch (err: any) {
      showToast("error", getReadableError(err));
    } finally {
      setTxLoading(false);
    }
  };

  const confirmTransaction = async () => {
    try {
      setTxLoading(true);

      if (pendingCoffee) {
        const txHash = await buyCoffee(pendingCoffee);
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        const [eth, cft] = await Promise.all([
          getETHBalance(account),
          getTokenBalance(account),
        ]);

        setEthBalance(eth);
        setCftBalance(cft);
        showToast("success", "Coffee purchased!");
      } else if (pendingReview) {
        const txHash = await addReview(
          pendingReview.code,
          pendingReview.score,
          pendingReview.text
        );

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        setReviewText("");
        setReviewScore(5);

        await loadReviewsForCoffee(pendingReview.code);

        const [cft, cnt, badgeIds] = await Promise.all([
          getTokenBalance(account),
          getUserReviewCount(account),
          getBadges(account),
        ]);

        setCftBalance(cft);
        setReviewCount(cnt);

        const metadata: BadgeMeta[] = await Promise.all(
          badgeIds.map(async (tokenId, idx) => ({
            id: idx,
            tokenId,
            uri: await getBadgeURI(tokenId),
          }))
        );
        setBadges(metadata);

        showToast("success", "Review submitted!");
      }
    } catch (err: any) {
      showToast("error", getReadableError(err));
    } finally {
      setShowEstimateModal(false);
      setPendingCoffee(null);
      setPendingReview(null);
      setTxLoading(false);
    }
  };

  // ===================================================
  // SUBMIT REVIEW
  // ===================================================
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedCoffee) return showToast("warning", "Select a coffee first.");
    if (!reviewText.trim()) return showToast("warning", "Review cannot be empty.");

    try {
      setReviewLoading(true);

      const est = await estimateReviewGas(
        selectedCoffee,
        reviewScore,
        reviewText.trim()
      );

      setEstimateData({
        gas: est.gas,
        gasCost: est.gasCost,
        totalCost: est.totalCost,
      });

      setPendingCoffee(null);
      setPendingReview({
        code: selectedCoffee,
        score: reviewScore,
        text: reviewText.trim(),
      });

      setShowEstimateModal(true);
      setReviewLoading(false);
    } catch (err: any) {
      showToast("error", getReadableError(err));
    }
  };

  // ===================================================
  // UI RENDER
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
              <div>
                {reviewCount} / {BADGE_THRESHOLD}
              </div>
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

        {/* COFFEE LIST */}
        <section className="coffee-list-section">
          <h2>All Coffees</h2>
          {loading && <p>Loading coffees...</p>}

          {!loading &&
            coffees.map((c) => {
              const reviews = reviewsMap[c.code] || [];
              const selected = selectedCoffee === c.code;

              return (
                <div key={c.code} className="coffee-card">
                  <div className="coffee-top">
                    <div className="coffee-left">
                      <img
                        src={`https://olive-high-zebra-695.mypinata.cloud/ipfs/${c.imageCID}`}
                        alt={c.name}
                        className="coffee-image"
                      />

                      <div>
                        <div className="coffee-name">{c.name}</div>
                        <div className="coffee-price">
                          {Number(formatEther(c.priceWei)).toFixed(4)} ETH
                        </div>
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
                          <Stars score={r.score} /> "<span className="review-text">{r.text}</span>"
                          — <span className="review-author">{shortenAddress(r.reviewer)}</span>
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

            <button
              type="submit"
              className="btn-submit"
              disabled={!selectedCoffee || reviewLoading}
            >
              {reviewLoading ? "Sending..." : "Submit"}
            </button>
          </form>
        </section>
      </div>

      {/* GAS MODAL */}
      {showEstimateModal && estimateData && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">
              {pendingCoffee && <>☕ Estimated Coffee Purchase Cost</>}
              {pendingReview && <>✏️ Estimated Review Submit Cost</>}
            </h3>

            <p className="modal-line">• Gas units: {estimateData.gas.toString()}</p>
            <p className="modal-line">• Gas cost: {formatEther(estimateData.gasCost)} ETH</p>

            {pendingCoffee && (
              <>
                <p className="modal-line">
                  • Coffee: {Number(formatEther(pendingCoffee.priceWei)).toFixed(4)} ETH
                </p>
                <p className="modal-line">
                  • Total: {formatEther(estimateData.totalCost)} ETH
                </p>
              </>
            )}

            {pendingReview && (
              <>
                <p className="modal-line">• Review cost: 0 ETH</p>
                <p className="modal-line">
                  • Total (gas only): {formatEther(estimateData.totalCost)} ETH
                </p>
              </>
            )}

            <div className="modal-buttons">
              <button className="modal-confirm" onClick={confirmTransaction}>
                Confirm
              </button>
              <button className="modal-cancel" onClick={() => setShowEstimateModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
