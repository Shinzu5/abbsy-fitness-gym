"use client";

import { FormEvent, useEffect, useState } from "react";
import Alert from "@/components/Alert";
import StatCard from "@/components/StatCard";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, toLocalInputDateTime } from "@/lib/format";
import type { CloseDailySalesResult, Payment } from "@/types";

const emptyForm = {
  customer_name: "",
  amount: "",
  description: "",
  notes: "",
  payment_date: toLocalInputDateTime(),
};

export default function PaymentsPage() {
  const [form, setForm] = useState(emptyForm);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalSales, setTotalSales] = useState("0.00");
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [closeSummary, setCloseSummary] = useState<CloseDailySalesResult | null>(
    null
  );

  async function loadToday() {
    const data = await api.getTodayPayments();
    setPayments(data.payments);
    setTotalSales(data.total_sales);
    setTransactionCount(data.transaction_count);
  }

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        setError("");
        await loadToday();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load payments");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCloseSummary(null);

    if (!form.customer_name.trim()) {
      setError("Customer/member name is required");
      return;
    }
    if (!form.description.trim()) {
      setError("Item/service purchased is required");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    try {
      setSubmitting(true);
      await api.createPayment({
        customer_name: form.customer_name.trim(),
        amount: form.amount,
        description: form.description.trim(),
        notes: form.notes.trim() || undefined,
        payment_date: form.payment_date
          ? new Date(form.payment_date).toISOString()
          : undefined,
      });
      setForm({ ...emptyForm, payment_date: toLocalInputDateTime() });
      await loadToday();
      setSuccess("Payment submitted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCloseDaily() {
    setError("");
    setSuccess("");
    try {
      setClosing(true);
      const result = await api.closeDailySales();
      setCloseSummary(result);
      await loadToday();
      if (result.closed) {
        setSuccess(result.message);
      } else {
        setSuccess(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close daily sales");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Payments</h2>
          <p>Record sales and close daily sales into Reports.</p>
        </div>
        <button
          type="button"
          className="btn btn-danger"
          onClick={onCloseDaily}
          disabled={closing || loading}
        >
          {closing ? "Closing..." : "Close Daily Sales"}
        </button>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      {closeSummary ? (
        <div className="alert alert-info">
          <div>
            <strong>Closing summary</strong>
          </div>
          <div>Total sales: {formatMoney(closeSummary.total_sales)}</div>
          <div>Transactions: {closeSummary.transaction_count}</div>
          <div>
            Closing date: {closeSummary.closing_date || "—"} · Closing time:{" "}
            {closeSummary.closing_time || "—"}
          </div>
        </div>
      ) : null}

      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <StatCard label="Today's Sales (Open)" value={formatMoney(totalSales)} />
        <StatCard label="Open Transactions" value={transactionCount} />
      </div>

      <div className="panel">
        <h3>Submit Payment</h3>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Customer / Member Name
              <input
                value={form.customer_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customer_name: e.target.value }))
                }
                placeholder="e.g. Juan Dela Cruz"
                required
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
                required
              />
            </label>
            <label className="full">
              Item / Service Purchased
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Protein shake, Personal training, Walk-in..."
                required
              />
            </label>
            <label>
              Date / Time
              <input
                type="datetime-local"
                value={form.payment_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, payment_date: e.target.value }))
                }
              />
            </label>
            <label>
              Notes (optional)
              <input
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </label>
          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Payment"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>Payment History (Today · Open)</h3>
        {loading ? <p className="loading">Loading payments...</p> : null}
        {!loading && payments.length === 0 ? (
          <p className="empty">No open payments for today.</p>
        ) : null}
        {payments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer / Member</th>
                  <th>Item / Service</th>
                  <th>Amount</th>
                  <th>Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.customer_name}</td>
                    <td>{payment.description}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{formatDateTime(payment.payment_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
