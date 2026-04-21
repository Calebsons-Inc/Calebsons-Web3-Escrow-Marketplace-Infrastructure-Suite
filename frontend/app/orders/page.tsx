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

interface CreateOrderData {
  createOrder: { order: Order; message: string };
}

const GET_ORDERS = `
  query GetOrders($status: OrderStatus) {
    orders(status: $status) {
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

const CREATE_ORDER = `
  mutation CreateOrder($buyer: String!, $seller: String!, $amount: String!) {
    createOrder(buyer: $buyer, seller: $seller, amount: $amount) {
      order {
        id
        onChainId
        buyer
        seller
        amount
        status
      }
      message
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

const ALL_STATUSES = ["ALL", "PENDING", "FUNDED", "FULFILLED", "RELEASED", "DISPUTED", "RESOLVED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ buyer: "", seller: "", amount: "" });

  const loadOrders = (status?: string) => {
    setLoading(true);
    const variables = status && status !== "ALL" ? { status } : {};
    fetchGraphQL<OrdersData>(GET_ORDERS, variables)
      .then((data) => {
        setOrders(data.orders);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders(statusFilter !== "ALL" ? statusFilter : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await fetchGraphQL<CreateOrderData>(CREATE_ORDER, form);
      setShowCreateModal(false);
      setForm({ buyer: "", seller: "", amount: "" });
      loadOrders();
    } catch (err) {
      alert("Error creating order: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
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
              <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">Dashboard</Link>
              <Link href="/orders" className="text-blue-400 font-medium text-sm">Orders</Link>
            </div>
          </div>
          <WalletConnect />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Orders</h1>
            <p className="text-slate-400 mt-1">Manage your escrow agreements</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + New Order
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="card">
          {loading && <div className="text-center py-8 text-slate-400">Loading...</div>}
          {error && <div className="text-center py-8 text-red-400">Error: {error}</div>}
          {!loading && !error && orders.length === 0 && (
            <div className="text-center py-8 text-slate-400">No orders found.</div>
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
                    <th className="table-header">Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="table-cell">
                        <span className="font-mono text-blue-400">#{order.onChainId}</span>
                      </td>
                      <td className="table-cell font-mono text-xs">{order.buyer.slice(0, 12)}…</td>
                      <td className="table-cell font-mono text-xs">{order.seller.slice(0, 12)}…</td>
                      <td className="table-cell font-mono">{order.amount} ETH</td>
                      <td className="table-cell">
                        <span className={STATUS_COLORS[order.status] || "badge"}>{order.status}</span>
                      </td>
                      <td className="table-cell text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <Link href={`/orders/${order.id}`} className="text-blue-400 hover:underline text-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-6">Create New Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Buyer Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="0x..."
                  value={form.buyer}
                  onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Seller Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="0x..."
                  value={form.seller}
                  onChange={(e) => setForm({ ...form, seller: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Amount (ETH)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.1"
                  step="0.001"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                {creating ? "Creating..." : "Create Order"}
              </button>
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
