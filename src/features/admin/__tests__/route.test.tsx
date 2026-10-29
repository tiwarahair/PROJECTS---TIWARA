import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decideReview,
  fetchReports,
  fetchReportStats,
} from "../../../lib/admin-api";
import type { AdminReport } from "../../../lib/admin-api";
import {
  getSecondFactorStep,
  startTwoFactorEnrolment,
} from "../../../lib/two-factor";
import { sessionChanged } from "../../../stores/session-slice";
import { renderWithStore, TEST_USER } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AdminRoute } from "../route";

vi.mock("../../../lib/two-factor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/two-factor")>()),
  getSecondFactorStep: vi.fn(),
  startTwoFactorEnrolment: vi.fn(),
}));

vi.mock("../../../lib/admin-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/admin-api")>()),
  fetchReportStats: vi.fn(),
  fetchReports: vi.fn(),
  decideReview: vi.fn(),
}));

const REPORT: AdminReport = {
  id: "review-1",
  rating: 2,
  body: "Call me on 07700 900123",
  status: "hidden",
  created_at: "2026-10-20T09:00:00Z",
  service_name: "Knotless braids",
  client_name: "Yasmin Bello",
  stylist_id: "stylist-1",
  stylist_name: "Crowned by Kemi",
  stylist_slug: "crowned-by-kemi",
  sort_at: "2026-10-21T09:12:00Z",
  due_at: "2026-10-22T09:12:00Z",
  reports: [
    {
      reason: "personal_info",
      details: "Her phone number is in the review.",
      is_stylist: true,
      reporter_name: null,
      reporter_deleted: false,
      status: "open",
      created_at: "2026-10-21T09:12:00Z",
    },
  ],
  decision: null,
  appeal: null,
};

const STATS = {
  open: 1,
  hidden: 1,
  appealed: 0,
  decided: 0,
  decided_this_week: 0,
  overdue: 1,
};

let user: UserEvent;

const renderAs = (isAdmin: boolean) => {
  const result = renderWithStore(<AdminRoute />, "/admin");

  result.store.dispatch(sessionChanged({ ...TEST_USER, isAdmin }));

  return result;
};

beforeEach(() => {
  user = setupUser();
  vi.mocked(fetchReportStats).mockResolvedValue(STATS);
  vi.mocked(fetchReports).mockResolvedValue({ total: 1, items: [REPORT] });
  vi.mocked(decideReview).mockResolvedValue(null);
});

describe("Admin route", () => {
  it("shows the usual not found to anyone who isn't an admin", async () => {
    renderAs(false);

    expect(
      await screen.findByText("We couldn’t find this page"),
    ).toBeInTheDocument();
  });

  it("asks an admin without two-step to set it up first", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("setup");

    vi.mocked(startTwoFactorEnrolment).mockResolvedValue({
      factorId: "factor-1",
      qrCode: "data:image/svg+xml,qr",
      secret: "ABCDEFGH",
      uri: "otpauth://totp/x",
    });

    renderAs(true);

    expect(
      await screen.findByText("Turn on two-step verification to use Admin"),
    ).toBeInTheDocument();

    expect(fetchReports).not.toHaveBeenCalled();
  });

  it("asks for a code when this login hasn't entered one", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("code");

    renderAs(true);

    expect(
      await screen.findByText("Enter your code to use Admin"),
    ).toBeInTheDocument();
  });

  it("lists reported reviews and saves a decision with its note", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("passed");

    renderAs(true);

    expect(await screen.findByText("Yasmin Bello")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overdue" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "More actions for Yasmin Bello’s review",
      }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Decide" }));
    await user.click(await screen.findByLabelText(/Remove the words/));
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    expect(
      screen.getByText("Add a note so other admins know why."),
    ).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "Phone number in the text");
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    await waitFor(() =>
      expect(decideReview).toHaveBeenCalledWith({
        reviewId: "review-1",
        outcome: "text_removed",
        note: "Phone number in the text",
      }),
    );
  });

  it("a report from a deleted account stays, and that client isn't listed as told", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("passed");

    vi.mocked(fetchReports).mockResolvedValue({
      total: 1,
      items: [
        {
          ...REPORT,
          reports: [
            {
              reason: "spam",
              details: null,
              is_stylist: false,
              reporter_name: "",
              reporter_deleted: true,
              status: "open",
              created_at: "2026-10-21T09:12:00Z",
            },
          ],
        },
      ],
    });

    renderAs(true);

    await user.click(
      await screen.findByRole("button", {
        name: "More actions for Yasmin Bello’s review",
      }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Decide" }));
    await user.click(await screen.findByLabelText(/Remove the words/));

    expect(
      screen.getByText("Crowned by Kemi, the stylist"),
    ).toBeInTheDocument();

    expect(screen.queryByText(/who reported it/)).not.toBeInTheDocument();
  });
});
