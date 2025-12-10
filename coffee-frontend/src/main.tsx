import ReactDOM from "react-dom/client";
import App from "./App.tsx";

import { WagmiProvider, createConfig } from "wagmi";
import { hardhat } from "wagmi/chains";
import { http } from "viem";

const config = createConfig({
  chains: [hardhat],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <App />
  </WagmiProvider>
);

