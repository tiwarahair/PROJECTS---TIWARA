import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const { matchMedia } = window;

afterEach(() => {
  window.matchMedia = matchMedia;
});

const renderAs = (isAdmin: boolean, url = "/admin") => {
  const result = renderWithStore(<AdminRoute />, url);

  result.store.dispatch(
    sessionChanged({ ...TEST_USER, isAdmin, isStylist: true }),
  );

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

  it("offers Not now, not Studio, to a stylist who didn't come from Studio", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("code");

    renderAs(true);

    expect(
      await screen.findByRole("link", { name: "Not now" }),
    ).toHaveAttribute("href", "/");

    expect(
      screen.queryByRole("link", { name: "Back to Studio" }),
    ).not.toBeInTheDocument();
  });

  it("offers the way back to Studio from the two-step screen when they came from Studio", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("code");

    renderAs(true, "/admin?from=studio");

    expect(
      await screen.findByRole("link", { name: "Back to Studio" }),
    ).toHaveAttribute("href", "/studio");
  });

  it("shows no way back to Studio in Admin when they didn't come from Studio", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("passed");

    renderAs(true);

    expect(await screen.findByText("Yasmin Bello")).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: /Studio/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the phone's Studio back link only when they came from Studio", async () => {
    vi.mocked(getSecondFactorStep).mockResolvedValue("passed");

    renderAs(true, "/admin?from=studio");

    expect(await screen.findByText("Yasmin Bello")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Studio" })).toHaveAttribute(
      "href",
      "/studio",
    );
  });

  it("keeps Back to Studio in the sidebar across tabs and the profile link", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    vi.mocked(getSecondFactorStep).mockResolvedValue("passed");

    renderAs(true, "/admin?from=studio");

    expect(await screen.findByText("Yasmin Bello")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Back to Studio" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Action log/ }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/admin?tab=log&from=studio",
    );

    await user.click(screen.getByRole("button", { name: /Reports/ }));

    await user.click(
      await screen.findByRole("button", {
        name: "More actions for Yasmin Bello’s review",
      }),
    );

    await user.click(
      screen.getByRole("menuitem", { name: "View in Profiles" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/admin?tab=profiles&stylist=stylist-1&from=studio",
      ),
    );

    expect(
      screen.getByRole("link", { name: "Back to Studio", hidden: true }),
    ).toBeInTheDocument();
  });
});
