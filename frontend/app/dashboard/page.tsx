"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  txHash?: string;
}

interface OrdersData {
  orders: Order[];
}

const GET_ORDERS = `
  query GetOrders {
    orders {
      id
      onChainId
      buyer
      seller
      amount
      status
      createdAt
      txHash
    }
  }
`;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-pending",
  FUNDED: "badge-funded",
  FULFILLED: "badge-fulfilled",
  RELEASED: "badge-released",
  DISPUTED: "badge-disputed",
  RESOLVED: "badge-resolved",
};

function StatCard({ title, value, subtitle, color }: {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="card">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color || "text-white"}`}>{value}</p>
      {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGraphQL<OrdersData>(GET_ORDERS)
      .then((data) => {
        setOrders(data.orders);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const stats = {
    total: orders.length,
    funded: orders.filter((o) => o.status === "FUNDED").length,
    released: orders.filter((o) => o.status === "RELEASED").length,
    disputed: orders.filter((o) => o.status === "DISPUTED").length,
    totalVolume: orders.reduce((acc, o) => acc + parseFloat(o.amount || "0"), 0),
  };

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
              <Link href="/dashboard" className="text-blue-400 font-medium text-sm">Dashboard</Link>
              <Link href="/orders" className="text-slate-400 hover:text-white text-sm transition-colors">Orders</Link>
            </div>
          </div>
          <WalletConnect />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Overview of escrow marketplace activity</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Orders" value={stats.total} subtitle="All time" />
          <StatCard title="Active Escrows" value={stats.funded} subtitle="Funded" color="text-blue-400" />
          <StatCard title="Completed" value={stats.released} subtitle="Funds released" color="text-green-400" />
          <StatCard title="Disputes" value={stats.disputed} subtitle="Needs resolution" color="text-red-400" />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="Total Volume"
            value={`${stats.totalVolume.toFixed(4)} ETH`}
            subtitle="Across all orders"
            color="text-cyan-400"
          />
          <StatCard
            title="Success Rate"
            value={stats.total > 0 ? `${Math.round((stats.released / stats.total) * 100)}%` : "—"}
            subtitle="Released / Total"
            color="text-purple-400"
          />
          <StatCard
            title="Dispute Rate"
            value={stats.total > 0 ? `${Math.round((stats.disputed / stats.total) * 100)}%` : "—"}
            subtitle="Disputed / Total"
            color="text-amber-400"
          />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Orders</h2>
            <Link href="/orders" className="text-blue-400 text-sm hover:text-blue-300">
              View all →
            </Link>
          </div>

          {loading && (
            <div className="text-center py-8 text-slate-400">Loading orders...</div>
          )}
          {error && (
            <div className="text-center py-8 text-red-400">Error: {error}</div>
          )}
          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No orders yet.{" "}
              <Link href="/orders" className="text-blue-400 hover:underline">
                Create one →
              </Link>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="table-header">Order #</th>
                    <th className="table-header">Buyer</th>
                    <th className="table-header">Seller</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="table-cell">
                        <Link href={`/orders/${order.id}`} className="text-blue-400 hover:underline font-mono">
                          #{order.onChainId}
                        </Link>
                      </td>
                      <td className="table-cell font-mono text-xs">{order.buyer.slice(0, 10)}…</td>
                      <td className="table-cell font-mono text-xs">{order.seller.slice(0, 10)}…</td>
                      <td className="table-cell font-mono">{order.amount} ETH</td>
                      <td className="table-cell">
                        <span className={STATUS_COLORS[order.status] || "badge"}>
                          {order.status}
                        </span>
                      </td>
                      <td className="table-cell text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
