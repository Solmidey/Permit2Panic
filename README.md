# Permit2 Panic Button

A Next.js 14 Base + Ethereum mini app that scans, scores, and revokes Permit2 allowances. Built with App Router, TypeScript, Tailwind, shadcn/ui, MiniKit (OnchainKit), viem, and Drizzle + SQLite for caching scans and receipts.

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables (see below).
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000.

## Environment
- `NEXT_PUBLIC_MAINNET_RPC_URL` – HTTPS RPC URL for Ethereum mainnet.
- `NEXT_PUBLIC_BASE_RPC_URL` – HTTPS RPC URL for Base mainnet.
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` – MiniKit API key (use `demo` for local testing).
- `NEXT_PUBLIC_ONCHAINKIT_PROJECT_ID` – Optional project ID for MiniKit.
- `DATABASE_PATH` – (optional) SQLite path. Defaults to `./permit2panic.sqlite`.

## Database and migrations
- Schema is defined in `lib/db/schema.ts`.
- Initial migration lives in `drizzle/0000_init.sql`.
- Generate or push migrations with:
  ```bash
  npm run db:generate
  npm run db:push
  ```

## Tests
- Unit tests (log decoding + risk scoring):
  ```bash
  npm test
  ```
- E2E smoke test (requires `npm run dev` in another terminal):
  ```bash
  npm run test:e2e
  ```

## File map
- `app/` – App Router pages and API routes (`scan`, `allowances`, `revoke`, `limit`, `panic`, `receipts`).
- `components/` – UI components (ChainSwitcher, AllowanceList/Card, RiskChips, ConfirmTxModal, PanicButton, ReceiptCard, safety banner, wallet connect).
- `lib/` – Chains, Permit2 ABI/constants, risk scoring, log decoding, viem client helpers, Drizzle DB helpers, transaction builders.
- `drizzle/` – SQL migrations.
- `__tests__/` – Unit tests for decoding and risk scoring.
- `tests/` – Playwright E2E happy-path test.

## Deployment notes (Base Mini App)
- Provide public RPCs or Alchemy/Infura for both Ethereum and Base.
- Host the app on Vercel or a Node host; ensure SQLite is writable or swap to a managed SQLite (e.g., Turso) by updating `DATABASE_PATH`.
- MiniKit requires your project ID/API key configured via environment variables.
- Always show the warning banner: “Review spender/token before signing. This app cannot recover stolen funds.”

## Hard-coded Permit2 details
- `PERMIT2_ADDRESS = 0x000000000022D473030F116dDEE9F6B43aC78BA3`
- Functions: `allowance(owner, token, spender)`, `approve(token, spender, amount, expiration)`, `lockdown((token,spender)[])`
- Events indexed: Approval, Permit, Lockdown
