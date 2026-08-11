"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/Alert";
import ReceiptModal, { type ReceiptModalData } from "@/components/ReceiptModal";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { DailySalesReport, Payment, ReportDetail } from "@/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<DailySalesReport[]>([]);
  const [selected, setSelected] = useState<ReportDetail | null>(null);
  const [receipt, setReceipt] = useState<ReceiptModalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        setError("");
        const data = await api.getReports();
        if (active) setReports(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load reports");
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

  async function loadReport(id: number): Promise<ReportDetail | null> {
    try {
      setDetailLoading(true);
      setError("");
      const detail = await api.getReport(id);
      setSelected(detail);
      return detail;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report detail");
      return null;
    } finally {
      setDetailLoading(false);
    }
  }

  async function openReportReceipt(id: number) {
    const detail = await loadReport(id);
    if (detail) {
      setReceipt({ kind: "report", report: detail });
    }
  }

  function openPaymentReceipt(payment: Payment) {
    setReceipt({
      kind: "payment",
      payment,
      report: selected,
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p>Closed daily sales remain permanently in the database.</p>
        </div>
      </div>

      <Alert type="error" message={error} />

      <div className="panel">
        <div className="panel-title-row">
          <h3>Daily Sales Reports</h3>
        </div>
        <p className="report-hint">
          Click a report card to open its receipt. Click a transaction row for a
          single receipt.
        </p>
        {loading ? <p className="loading">Loading reports...</p> : null}
        {!loading && reports.length === 0 ? (
          <p className="empty">No closed daily sales reports yet.</p>
        ) : null}
        {reports.length > 0 ? (
          <div className="report-list">
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                className={`report-item${
                  selected?.id === report.id ? " active" : ""
                }`}
                onClick={() => openReportReceipt(report.id)}
              >
                <div>
                  <span>Report Date</span>
                  <strong>{formatDate(report.report_date)}</strong>
                </div>
                <div>
                  <span>Transactions</span>
                  <strong>{report.transaction_count}</strong>
                </div>
                <div>
                  <span>Total Sales</span>
                  <strong className="report-total">
                    {formatMoney(report.total_sales)}
                  </strong>
                </div>
                <div>
                  <span>Closed Date / Time</span>
                  <strong>{formatDateTime(report.closed_at)}</strong>
                </div>
                <div className="report-action">View Receipt →</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <h3>Report Transactions</h3>
          {selected ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReceipt({ kind: "report", report: selected })}
            >
              Open Full Receipt
            </button>
          ) : null}
        </div>
        {detailLoading ? <p className="loading">Loading transactions...</p> : null}
        {!selected && !detailLoading ? (
          <p className="empty">Select a report to view its transactions.</p>
        ) : null}
        {selected ? (
          <>
            <div className="grid-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="stat-card">
                <span>Report Date</span>
                <strong>{formatDate(selected.report_date)}</strong>
              </div>
              <div className="stat-card">
                <span>Transactions</span>
                <strong>{selected.transaction_count}</strong>
              </div>
              <div className="stat-card">
                <span>Total Sales</span>
                <strong>{formatMoney(selected.total_sales)}</strong>
              </div>
            </div>
            {selected.payments.length === 0 ? (
              <p className="empty">No transactions linked to this report.</p>
            ) : (
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
                    {selected.payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="table-row-clickable"
                        onClick={() => openPaymentReceipt(payment)}
                      >
                        <td>{payment.customer_name}</td>
                        <td>{payment.description}</td>
                        <td>{formatMoney(payment.amount)}</td>
                        <td>{formatDateTime(payment.payment_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>

      <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
