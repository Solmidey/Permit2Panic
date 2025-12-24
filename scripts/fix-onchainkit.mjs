import fs from "fs";
import path from "path";

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
  }
  return out;
}

function patchWalletImports(src) {
  // Replace only imports that include wallet components but come from root package
  return src.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@coinbase\/onchainkit['"]\s*;/g,
    (full, names) => {
      const hasWallet = /\b(Wallet|ConnectWallet|WalletDropdown|WalletDropdownDisconnect|WalletDropdownBasename|WalletDropdownFundLink|WalletDropdownLink|WalletIsland)\b/.test(names);
      if (!hasWallet) return full;
      return `import {${names}} from "@coinbase/onchainkit/wallet";`;
    }
  );
}

function ensureStylesImportInAppProviders(src) {

  const lines = src.split(/\r?\n/);
  const useClientIdx = lines.findIndex((l) => /['"]use client['"]/.test(l));
  const insertAt = useClientIdx >= 0 ? useClientIdx + 1 : 0;
  return lines.join("\n");
}

const files = walk("components");

for (const f of files) {
  const before = fs.readFileSync(f, "utf8");
  let after = patchWalletImports(before);

  if (f === "components/app-providers.tsx") {
    after = ensureStylesImportInAppProviders(after);
  }

  if (after !== before) fs.writeFileSync(f, after);
}

console.log("✅ Patched wallet imports + ensured styles import.");
