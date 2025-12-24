"use client";

import dynamic from "next/dynamic";

const HomeShell = dynamic(
  () => import("../components/home-shell").then((m: any) => m.HomeShell ?? m.default),
  { ssr: false }
);

export default function PageClient() {
  return <HomeShell />;
}
