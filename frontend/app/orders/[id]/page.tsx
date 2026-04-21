"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WalletConnect } from "@/components/WalletConnect";
import { fetchGraphQL } from "@/lib/graphqlClient";

interface Order {
  id: string;
  onChainId: number;
  buyer: string;
  seller: string;
  amount: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  txHash?: string;
  blockNumber?: number;
  buyerUser?: { id: string; address: string };
}

interface OrderData {
  order: Order;
}

interface UpdateOrderData {
  deposit?: Order;
  fulfill?: Order;
  release?: Order;
  dispute?: Order;
  resolve?: Order;
}

const GET_ORDER = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      onChainId
      buyer
      seller
      amount
      status
      createdAt
      updatedAt
      txHash
      blockNumber
      buyerUser { id address }
    }
  }
`;

const DEPOSIT = `mutation Deposit($orderId: ID!, $txHash: String!) { deposit(orderId: $orderId, txHash: $txHash) { id status txHash } }`;
const FULFILL = `mutation Fulfill($orderId: ID!) { fulfill(orderId: $orderId) { id status } }`;
const RELEASE = `mutation Release($orderId: ID!) { release(orderId: $orderId) { id status } }`;
const DISPUTE = `mutation Dispute($orderId: ID!) { dispute(orderId: $orderId) { id status } }`;
const RESOLVE = `mutation Resolve($orderId: ID!, $winner: String!) { resolve(orderId: $orderId, winner: $winner) { id status } }`;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-pending",
  FUNDED: "badge-funded",
  FULFILLED: "badge-fulfilled",
  RELEASED: "badge-released",
  DISPUTED: "badge-disputed",
  RESOLVED: "badge-resolved",
};

const STATUS_STEPS = ["PENDING", "FUNDED", "FULFILLED", "RELEASED"];

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txHashInput, setTxHashInput] = useState("");
  const [winnerInput, setWinnerInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrder = () => {
    if (!id) return;
    fetchGraphQL<OrderData>(GET_ORDER, { id })
      .then((data) => {
        setOrder(data.order);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => { loadOrder(); }, [id]);

  const runMutation = async (query: string, variables: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      await fetchGraphQL<UpdateOrderData>(query, variables);
      loadOrder();
    } catch (err) {
      alert("Action failed: " + (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>;
  if (error || !order) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">Order not found</div>;

  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-white font-bold">Calebsons Escrow</span>
            </Link>
            <div className="hidden md:flex gap-4">
              <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm">Dashboard</Link>
              <Link href="/orders" className="text-slate-400 hover:text-white text-sm">Orders</Link>
            </div>
          </div>
          <WalletConnect />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/orders" className="text-slate-400 hover:text-white text-sm">← Back to Orders</Link>
          <h1 className="text-3xl font-bold text-white mt-2">Order #{order.onChainId}</h1>
        </div>

        {/* Status Progress */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Status Progress</h2>
          <div className="flex items-center gap-2">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= stepIndex ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400"
                }`}>{i + 1}</div>
                <span className={`text-xs ${i <= stepIndex ? "text-white" : "text-slate-500"}`}>{s}</span>
                {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-blue-600" : "bg-slate-700"}`} />}
              </div>
            ))}
          </div>
          {(order.status === "DISPUTED" || order.status === "RESOLVED") && (
            <div className={`mt-4 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${
              order.status === "DISPUTED" ? "bg-red-900/30 text-red-400" : "bg-gray-700/30 text-gray-400"
            }`}>
              <span>{order.status === "DISPUTED" ? "⚠️ Disputed" : "✓ Resolved"}</span>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Order Details</h2>
            <dl className="space-y-3">
              {[
                ["Order ID", `#${order.onChainId}`],
                ["Amount", `${order.amount} ETH`],
                ["Status", order.status],
                ["Created", new Date(order.createdAt).toLocaleString()],
                ["Updated", new Date(order.updatedAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-400 text-sm">{k}</dt>
                  <dd className="text-white text-sm font-mono font-medium">
                    {k === "Status" ? (
                      <span className={STATUS_COLORS[v] || "badge"}>{v}</span>
                    ) : v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Parties</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-slate-400 text-sm mb-1">Buyer</dt>
                <dd className="text-white text-sm font-mono bg-slate-700/50 px-2 py-1 rounded break-all">{order.buyer}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-sm mb-1">Seller</dt>
                <dd className="text-white text-sm font-mono bg-slate-700/50 px-2 py-1 rounded break-all">{order.seller}</dd>
              </div>
              {order.txHash && (
                <div>
                  <dt className="text-slate-400 text-sm mb-1">Tx Hash</dt>
                  <dd className="text-blue-400 text-xs font-mono bg-slate-700/50 px-2 py-1 rounded break-all">{order.txHash}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="space-y-4">
            {order.status === "PENDING" && (
              <div className="flex flex-col gap-2">
                <p className="text-slate-400 text-sm">Deposit funds to activate this escrow (Buyer only)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Transaction hash (0x...)"
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                  />
                  <button
                    className="btn-primary whitespace-nowrap"
                    disabled={actionLoading || !txHashInput}
                    onClick={() => runMutation(DEPOSIT, { orderId: order.id, txHash: txHashInput })}
                  >
                    Record Deposit
                  </button>
                </div>
              </div>
            )}

            {order.status === "FUNDED" && (
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-primary"
                  disabled={actionLoading}
                  onClick={() => runMutation(FULFILL, { orderId: order.id })}
                >
                  Mark as Fulfilled (Seller)
                </button>
                <button
                  className="btn-danger"
                  disabled={actionLoading}
                  onClick={() => runMutation(DISPUTE, { orderId: order.id })}
                >
                  Raise Dispute
                </button>
              </div>
            )}

            {order.status === "FULFILLED" && (
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-primary"
                  disabled={actionLoading}
                  onClick={() => runMutation(RELEASE, { orderId: order.id })}
                >
                  Release Funds (Buyer)
                </button>
                <button
                  className="btn-danger"
                  disabled={actionLoading}
                  onClick={() => runMutation(DISPUTE, { orderId: order.id })}
                >
                  Raise Dispute
                </button>
              </div>
            )}

            {order.status === "DISPUTED" && (
              <div className="flex flex-col gap-2">
                <p className="text-slate-400 text-sm">Admin: resolve dispute by selecting winner</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Winner address (buyer or seller)"
                    value={winnerInput}
                    onChange={(e) => setWinnerInput(e.target.value)}
                  />
                  <button
                    className="btn-primary whitespace-nowrap"
                    disabled={actionLoading || !winnerInput}
                    onClick={() => runMutation(RESOLVE, { orderId: order.id, winner: winnerInput })}
                  >
                    Resolve
                  </button>
                </div>
                <div className="flex gap-2 mt-1">
                  <button className="text-xs text-slate-400 hover:text-white" onClick={() => setWinnerInput(order.buyer)}>
                    Use buyer: {order.buyer.slice(0, 10)}…
                  </button>
                  <span className="text-slate-600">|</span>
                  <button className="text-xs text-slate-400 hover:text-white" onClick={() => setWinnerInput(order.seller)}>
                    Use seller: {order.seller.slice(0, 10)}…
                  </button>
                </div>
              </div>
            )}

            {(order.status === "RELEASED" || order.status === "RESOLVED") && (
              <p className="text-slate-400 text-sm">This order is finalized. No further actions available.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
