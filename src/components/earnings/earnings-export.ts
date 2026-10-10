// Earnings export (prototype Earnings.dc.html doExport): a CSV of the transactions, or a printable monthly statement.
import {
  formatGbp,
  formatTime,
  getClient,
  getMethodLabel,
  getRangeLabel,
  getStats,
  toIsoDate,
} from "./earnings-data";
import type {
  DateRange,
  EarningsClient,
  Payout,
  Transaction,
} from "./earnings-data";

const DAY_MS = 86400000;
const DEFAULT_BANK = "Barclays •••• 4471";

export const getExportSlug = ({ s, e }: DateRange): string =>
  toIsoDate(s) + "-to-" + toIsoDate(new Date(e.getTime() - DAY_MS));

/** One row per transaction, with a BOM so Excel reads the £ / accents. */
export const getEarningsCsv = (
  transactions: Transaction[],
  clients?: EarningsClient[],
): string => {
  const quote = (value: unknown) => {
    const text = String(value == null ? "" : value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const rows = [
    [
      "Date",
      "Time",
      "Reference",
      "Booking",
      "Client",
      "Service",
      "Description",
      "Method",
      "Amount (GBP)",
      "Card fee (GBP)",
      "Net (GBP)",
      "Status",
      "Payout",
    ],
    ...transactions.map((transaction) => [
      transaction.at.toLocaleDateString("en-GB"),
      formatTime(transaction.at),
      transaction.id,
      transaction.bref,
      getClient(transaction.client, clients).name,
      transaction.svc,
      transaction.desc,
      getMethodLabel(transaction),
      transaction.amount.toFixed(2),
      transaction.fee == null ? "" : transaction.fee.toFixed(2),
      transaction.net.toFixed(2),
      transaction.status,
      transaction.po || "",
    ]),
  ];
  return "﻿" + rows.map((row) => row.map(quote).join(",")).join("\n");
};

const GROUPS: [string, (transaction: Transaction) => boolean][] = [
  [
    "Service payments",
    ({ desc }) => desc === "Balance" || desc === "Full payment",
  ],
  ["Deposits", ({ desc }) => desc === "Deposit"],
  ["Tips", ({ desc }) => desc === "Tip"],
  ["Cancellation fees", ({ desc }) => desc === "Cancellation fee"],
  ["No-show fees", ({ desc }) => desc === "No-show fee"],
  [
    "Refunds",
    ({ desc }) => desc === "Refund" || desc === "Adjustment (recovery)",
  ],
];

const STATEMENT_STYLE =
  '@page{margin:16mm}body{font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;color:#1a1714;font-size:10pt;margin:0}h1{font-size:18pt;margin:0 0 6px;letter-spacing:-.02em}.hd{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #d4cbb9;padding-bottom:14px;margin-bottom:6px}.hd p{margin:2px 0}.mu{color:#7d7465}section{page-break-after:always}section:last-child{page-break-after:auto}h2{font-size:13pt;margin:22px 0 4px}h3{font-size:10pt;margin:14px 0 4px;color:#575045}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee6da;vertical-align:top}td.d{width:78px;white-space:nowrap}.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr.st td{font-weight:600;border-bottom:none}.tot{max-width:320px;margin:16px 0 0 auto}.tot tr.n td{font-weight:700;border-top:1px solid #1a1714}';

export interface StatementOptions {
  range: DateRange;
  transactions: Transaction[];
  payouts: Payout[];
  clients?: EarningsClient[];
  businessName: string;
  legalName: string;
  vatNumber: string;
  bankLabel?: string;
}

/** The monthly statement as a printable HTML document (prototype doExport, PDF branch). */
export const getStatementHtml = ({
  range,
  transactions,
  payouts,
  clients,
  businessName,
  legalName,
  vatNumber,
  bankLabel,
}: StatementOptions): string => {
  const escape = (value: unknown) =>
    String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const months: { s: Date; e: Date; label: string }[] = [];
  let month = new Date(range.s.getFullYear(), range.s.getMonth(), 1);
  while (month < range.e) {
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    months.push({
      s: new Date(Math.max(month.getTime(), range.s.getTime())),
      e: monthEnd < range.e ? monthEnd : range.e,
      label: month.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });
    month = monthEnd;
  }
  const line = (date: string, what: string, how: string, amount: string) =>
    '<tr><td class="d">' +
    escape(date) +
    "</td><td>" +
    escape(what) +
    '</td><td class="mu">' +
    escape(how) +
    '</td><td class="r">' +
    escape(amount) +
    "</td></tr>";
  let body = "";
  for (const { s, e, label } of months) {
    const inMonth = transactions.filter(({ at }) => at >= s && at < e);
    const stats = getStats(inMonth);
    body += "<section><h2>" + escape(label) + "</h2>";
    for (const [title, matches] of GROUPS) {
      const rows = inMonth.filter(matches);
      if (!rows.length) continue;
      let total = 0;
      for (const { amount } of rows) total += amount;
      body +=
        "<h3>" +
        title +
        "</h3><table>" +
        rows
          .map((transaction) =>
            line(
              transaction.at.toLocaleDateString("en-GB"),
              getClient(transaction.client, clients).name +
                " · " +
                transaction.svc,
              getMethodLabel(transaction),
              formatGbp(transaction.amount),
            ),
          )
          .join("") +
        '<tr class="st"><td></td><td>Total ' +
        title.toLowerCase() +
        '</td><td></td><td class="r">' +
        formatGbp(total) +
        "</td></tr></table>";
    }
    const feeRows = inMonth.filter(({ fee }) => (fee ?? 0) > 0);
    if (feeRows.length)
      body +=
        "<h3>Card fees</h3><table>" +
        feeRows
          .map((transaction) =>
            line(
              transaction.at.toLocaleDateString("en-GB"),
              "Fee on " +
                transaction.desc.toLowerCase() +
                " · " +
                getClient(transaction.client, clients).name,
              transaction.method,
              formatGbp(-(transaction.fee ?? 0)),
            ),
          )
          .join("") +
        '<tr class="st"><td></td><td>Total card fees</td><td></td><td class="r">' +
        formatGbp(-stats.fees) +
        "</td></tr></table>";
    body +=
      '<table class="tot"><tr><td>Takings</td><td class="r">' +
      formatGbp(stats.takings) +
      '</td></tr><tr><td>Card fees</td><td class="r">' +
      formatGbp(-stats.fees) +
      '</td></tr><tr><td>Refunds</td><td class="r">' +
      formatGbp(stats.refunds) +
      '</td></tr><tr class="n"><td>Net</td><td class="r">' +
      formatGbp(stats.net) +
      "</td></tr></table>";
    const monthPayouts = payouts.filter(({ sent }) => sent >= s && sent < e);
    if (monthPayouts.length)
      body +=
        "<h3>Payouts</h3><table>" +
        monthPayouts
          .map((payout) =>
            line(
              payout.sent.toLocaleDateString("en-GB"),
              "To " + (bankLabel || DEFAULT_BANK),
              payout.status,
              formatGbp(payout.amount),
            ),
          )
          .join("") +
        "</table>";
    body += "</section>";
  }
  if (!months.length || !transactions.length)
    body += '<p class="mu">No transactions in this period.</p>';
  const slug = getExportSlug(range);
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Statement ' +
    escape(slug) +
    "</title><style>" +
    STATEMENT_STYLE +
    '</style></head><body><div class="hd"><div><h1>Earnings statement</h1><p class="mu">' +
    escape(getRangeLabel(range)) +
    '</p></div><div style="text-align:right"><p><b>' +
    escape(businessName) +
    "</b></p><p>" +
    escape(legalName) +
    "</p>" +
    (vatNumber ? "<p>VAT " + escape(vatNumber) + "</p>" : "") +
    '<p class="mu">Generated ' +
    new Date().toLocaleDateString("en-GB") +
    "</p></div></div>" +
    body +
    "</body></html>"
  );
};

/** Saves text as a file download. */
export const downloadText = (name: string, mime: string, body: string) => {
  try {
    const url = URL.createObjectURL(new Blob([body], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch {
    // downloads unavailable
  }
};

/** Prints an HTML document from a hidden iframe (the browser's "Save as PDF"). */
export const printHtml = (html: string) => {
  const frame = document.createElement("iframe");
  // a zero-size frame rather than display:none, which some browsers won't print
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const frameDocument = frame.contentWindow?.document;
  if (!frameDocument) return;
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  window.setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      // printing unavailable
    }
    window.setTimeout(() => frame.remove(), 60000);
  }, 300);
};
