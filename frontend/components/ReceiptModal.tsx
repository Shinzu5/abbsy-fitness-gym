"use client";

import { useEffect } from "react";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { DailySalesReport, Payment, ReportDetail } from "@/types";

type ReportReceipt = {
  kind: "report";
  report: ReportDetail;
};

type PaymentReceipt = {
  kind: "payment";
  payment: Payment;
  report?: DailySalesReport | null;
};

export type ReceiptModalData = ReportReceipt | PaymentReceipt;

export default function ReceiptModal({
  data,
  onClose,
}: {
  data: ReceiptModalData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!data) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [data, onClose]);

  if (!data) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Receipt"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{data.kind === "report" ? "Daily Sales Receipt" : "Transaction Receipt"}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close receipt"
          >
            ×
          </button>
        </div>

        <div className="receipt-body">
          <div className="receipt-brand">
            <p className="kicker">ABBSY FITNESS GYM</p>
            <h4>{data.kind === "report" ? "Closed Daily Sales" : "Payment Receipt"}</h4>
            <p>Official gym transaction record</p>
          </div>

          {data.kind === "report" ? (
            <>
              <div className="receipt-meta">
                <div className="receipt-meta-row">
                  <span>Report Date</span>
                  <strong>{formatDate(data.report.report_date)}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Closed</span>
                  <strong>{formatDateTime(data.report.closed_at)}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Transactions</span>
                  <strong>{data.report.transaction_count}</strong>
                </div>
              </div>

              <div className="receipt-lines">
                {data.report.payments.length === 0 ? (
                  <p className="empty">No transactions in this report.</p>
                ) : (
                  data.report.payments.map((payment) => (
                    <div className="receipt-line" key={payment.id}>
                      <div className="receipt-line-top">
                        <strong>{payment.customer_name}</strong>
                        <strong>{formatMoney(payment.amount)}</strong>
                      </div>
                      <small>{payment.description}</small>
                      <small>{formatDateTime(payment.payment_date)}</small>
                    </div>
                  ))
                )}
              </div>

              <div className="receipt-total">
                <span>Total Sales</span>
                <strong>{formatMoney(data.report.total_sales)}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="receipt-meta">
                <div className="receipt-meta-row">
                  <span>Customer / Member</span>
                  <strong>{data.payment.customer_name}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Item / Service</span>
                  <strong>{data.payment.description}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Date / Time</span>
                  <strong>{formatDateTime(data.payment.payment_date)}</strong>
                </div>
                {data.report ? (
                  <>
                    <div className="receipt-meta-row">
                      <span>Report Date</span>
                      <strong>{formatDate(data.report.report_date)}</strong>
                    </div>
                    <div className="receipt-meta-row">
                      <span>Report Closed</span>
                      <strong>{formatDateTime(data.report.closed_at)}</strong>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="receipt-total">
                <span>Amount</span>
                <strong>{formatMoney(data.payment.amount)}</strong>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
