import type { AdminReport } from "../../../../lib/admin-api";

export const APPEALED_REPORT: AdminReport = {
  id: "review-1",
  rating: 2,
  body: "Late and rushed",
  status: "text_removed",
  created_at: "2026-10-20T09:00:00Z",
  service_name: "Knotless braids",
  client_name: "Ada Obi",
  stylist_id: "stylist-1",
  stylist_name: "Hair by Seyi",
  stylist_slug: "hair-by-seyi",
  sort_at: "2026-10-25T09:00:00Z",
  due_at: null,
  reports: [
    {
      reason: "abusive",
      details: null,
      is_stylist: false,
      reporter_name: "Tola",
      status: "text_removed",
      created_at: "2026-10-21T09:00:00Z",
    },
  ],
  decision: {
    outcome: "text_removed",
    note: "Rude words",
    admin_name: "Faith",
    created_at: "2026-10-22T09:00:00Z",
  },
  appeal: {
    id: "appeal-1",
    appellant: "reviewer",
    body: "Please look again",
    created_at: "2026-10-25T09:00:00Z",
  },
};

export const OPEN_REPORT: AdminReport = {
  ...APPEALED_REPORT,
  id: "review-2",
  status: "published",
  decision: null,
  appeal: null,
};
