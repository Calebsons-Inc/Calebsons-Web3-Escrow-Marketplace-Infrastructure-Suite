import Link from "next/link";
import { WalletConnect } from "@/components/WalletConnect";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-white font-bold text-lg">Calebsons Escrow</span>
          </div>
          <WalletConnect />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-800 rounded-full text-blue-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          Powered by Ethereum Smart Contracts
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Trustless Escrow for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Web3 Commerce
          </span>
        </h1>

        <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto">
          Create secure escrow agreements on-chain. Buyers and sellers transact
          with confidence backed by smart contract logic and dispute resolution.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard" className="btn-primary text-lg px-8 py-4">
            Open Dashboard
          </Link>
          <Link href="/orders" className="btn-secondary text-lg px-8 py-4">
            View Orders
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "🔒",
              title: "Smart Contract Security",
              desc: "Funds locked in audited EVM smart contracts until conditions are met.",
            },
            {
              icon: "⚖️",
              title: "On-Chain Dispute Resolution",
              desc: "Neutral admin arbitration with transparent outcomes on-chain.",
            },
            {
              icon: "⚡",
              title: "Instant Settlement",
              desc: "Release funds instantly when both parties agree. No banks, no delays.",
            },
          ].map((f) => (
            <div key={f.title} className="card text-center">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
