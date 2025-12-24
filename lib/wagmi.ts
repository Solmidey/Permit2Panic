import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base, mainnet } from "viem/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

export function getConfig() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return createConfig({
    chains: [base, mainnet],
    connectors: [
      // Covers MetaMask, Rabby, OKX, Trust, etc. via injected/EIP-1193
      injected({ shimDisconnect: true }),

      // Covers most mobile + many desktop wallets
      walletConnect({
        projectId,
        metadata: {
          name: "Permit2Panic",
          description: "Scan and revoke Permit2 allowances",
          url: appUrl,
          icons: ["https://avatars.githubusercontent.com/u/1885080?s=200&v=4"],
        },
        showQrModal: true,
        qrModalOptions: { themeMode: "dark" },
      }),

      // Explicit Coinbase Wallet connector
      coinbaseWallet({
        appName: "Permit2Panic",
      }),
    ],
    storage: createStorage({ storage: cookieStorage }),
    ssr: true,
    transports: {
      [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
      [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://cloudflare-eth.com"),
    },
  });
}

export const wagmiConfig = getConfig();

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
