// Earnings export: a CSV of the transactions, or a printable monthly statement.
import { getClient, getMethodLabel, getRangeLabel, getStats } from "./data";
import type { DateRange, EarningsClient, Payout, Transaction } from "./data";
import { formatMoney } from "../../utils/money";
import { toIsoDate, formatClockTime } from "../../utils/dates";

const DAY_MS = 86400000;
const DEFAULT_BANK = "Barclays •••• 4471";

export const getExportSlug = ({ start, end }: DateRange): string =>
  `${toIsoDate(start)}-to-${toIsoDate(new Date(end.getTime() - DAY_MS))}`;

/** One row per transaction, with a BOM so Excel reads the £ / accents. */
export const getEarningsCsv = (
  transactions: Transaction[],
  clients?: EarningsClient[],
): string => {
  const quote = (text: string) =>
    /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;

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
      formatClockTime(transaction.at),
      transaction.id,
      transaction.bookingRef,
      getClient(transaction.client, clients).name,
      transaction.service,
      transaction.description,
      getMethodLabel(transaction),
      transaction.amount.toFixed(2),
      transaction.fee == null ? "" : transaction.fee.toFixed(2),
      transaction.net.toFixed(2),
      transaction.status,
      transaction.payoutId || "",
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\n")}`;
};

const GROUPS: [string, (transaction: Transaction) => boolean][] = [
  [
    "Service payments",
    ({ description }) =>
      description === "Balance" || description === "Full payment",
  ],
  ["Deposits", ({ description }) => description === "Deposit"],
  ["Tips", ({ description }) => description === "Tip"],
  [
    "Cancellation fees",
    ({ description }) => description === "Cancellation fee",
  ],
  ["No-show fees", ({ description }) => description === "No-show fee"],
  [
    "Refunds",
    ({ description }) =>
      description === "Refund" || description === "Adjustment (recovery)",
  ],
];

const STATEMENT_STYLE =
  '@page{margin:16mm}body{font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;color:#1a1714;font-size:10pt;margin:0}h1{font-size:18pt;margin:0 0 6px;letter-spacing:-.02em}.hd{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #d4cbb9;padding-bottom:14px;margin-bottom:6px}.hd p{margin:2px 0}.mu{color:#7d7465}section{page-break-after:always}section:last-child{page-break-after:auto}h2{font-size:13pt;margin:22px 0 4px}h3{font-size:10pt;margin:14px 0 4px;color:#575045}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee6da;vertical-align:top}td.d{width:78px;white-space:nowrap}.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}tr.st td{font-weight:600;border-bottom:none}.tot{max-width:320px;margin:16px 0 0 auto}.tot tr.n td{font-weight:700;border-top:1px solid #1a1714}';

interface StatementOptions {
  range: DateRange;
  transactions: Transaction[];
  payouts: Payout[];
  clients?: EarningsClient[];
  businessName: string;
  legalName: string;
  vatNumber: string;
  bankLabel?: string;
}

/** The monthly statement as a printable HTML document (the PDF export). */
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
  const escape = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const months: { start: Date; end: Date; label: string }[] = [];
  let month = new Date(range.start.getFullYear(), range.start.getMonth(), 1);

  while (month < range.end) {
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    months.push({
      start: new Date(Math.max(month.getTime(), range.start.getTime())),
      end: monthEnd < range.end ? monthEnd : range.end,
      label: month.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });

    month = monthEnd;
  }

  const line = (date: string, what: string, how: string, amount: string) => {
    const dateCell = escape(date);
    const whatCell = escape(what);
    const howCell = escape(how);
    const amountCell = escape(amount);

    return `<tr><td class="d">${dateCell}</td><td>${whatCell}</td><td class="mu">${howCell}</td><td class="r">${amountCell}</td></tr>`;
  };

  let body = "";

  for (const { start, end, label } of months) {
    const inMonth = transactions.filter(({ at }) => at >= start && at < end);
    const stats = getStats(inMonth);

    body += `<section><h2>${escape(label)}</h2>`;

    for (const [title, matches] of GROUPS) {
      const rows = inMonth.filter(matches);

      if (!rows.length) continue;

      let total = 0;

      for (const { amount } of rows) total += amount;

      const groupLines = rows
        .map((transaction) => {
          const clientName = getClient(transaction.client, clients).name;

          return line(
            transaction.at.toLocaleDateString("en-GB"),
            `${clientName} · ${transaction.service}`,
            getMethodLabel(transaction),
            formatMoney(transaction.amount, { pence: "always" }),
          );
        })
        .join("");

      const groupName = title.toLowerCase();
      const totalText = formatMoney(total, { pence: "always" });

      body += `<h3>${title}</h3><table>${groupLines}<tr class="st"><td></td><td>Total ${groupName}</td><td></td><td class="r">${totalText}</td></tr></table>`;
    }

    const feeRows = inMonth.filter(({ fee }) => (fee ?? 0) > 0);
    const feesText = formatMoney(-stats.fees, { pence: "always" });

    if (feeRows.length) {
      const feeLines = feeRows
        .map((transaction) => {
          const feeWhat = transaction.description.toLowerCase();
          const clientName = getClient(transaction.client, clients).name;

          return line(
            transaction.at.toLocaleDateString("en-GB"),
            `Fee on ${feeWhat} · ${clientName}`,
            transaction.method,
            formatMoney(-(transaction.fee ?? 0), { pence: "always" }),
          );
        })
        .join("");

      body += `<h3>Card fees</h3><table>${feeLines}<tr class="st"><td></td><td>Total card fees</td><td></td><td class="r">${feesText}</td></tr></table>`;
    }

    const takingsText = formatMoney(stats.takings, { pence: "always" });
    const refundsText = formatMoney(stats.refunds, { pence: "always" });
    const netText = formatMoney(stats.net, { pence: "always" });

    body += `<table class="tot"><tr><td>Takings</td><td class="r">${takingsText}</td></tr><tr><td>Card fees</td><td class="r">${feesText}</td></tr><tr><td>Refunds</td><td class="r">${refundsText}</td></tr><tr class="n"><td>Net</td><td class="r">${netText}</td></tr></table>`;

    const monthPayouts = payouts.filter(
      ({ sent }) => sent >= start && sent < end,
    );

    if (monthPayouts.length) {
      const payoutLines = monthPayouts
        .map((payout) =>
          line(
            payout.sent.toLocaleDateString("en-GB"),
            `To ${bankLabel || DEFAULT_BANK}`,
            payout.status,
            formatMoney(payout.amount, { pence: "always" }),
          ),
        )
        .join("");

      body += `<h3>Payouts</h3><table>${payoutLines}</table>`;
    }

    body += "</section>";
  }

  if (!months.length || !transactions.length)
    body += '<p class="mu">No transactions in this period.</p>';

  const slug = escape(getExportSlug(range));
  const rangeText = escape(getRangeLabel(range));
  const businessText = escape(businessName);
  const legalText = escape(legalName);
  const vatLine = vatNumber ? `<p>VAT ${escape(vatNumber)}</p>` : "";
  const generatedOn = new Date().toLocaleDateString("en-GB");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Statement ${slug}</title><style>${STATEMENT_STYLE}</style></head><body><div class="hd"><div><h1>Earnings statement</h1><p class="mu">${rangeText}</p></div><div style="text-align:right"><p><b>${businessText}</b></p><p>${legalText}</p>${vatLine}<p class="mu">Generated ${generatedOn}</p></div></div>${body}</body></html>`;
};

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
