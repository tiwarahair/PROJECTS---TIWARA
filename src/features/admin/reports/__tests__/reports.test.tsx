import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  answerAppeal,
  fetchReports,
  fetchReportStats,
} from "../../../../lib/admin-api";
import { renderWithStore } from "../../../../test/render-with-store";
import { setupUser } from "../../../../test/setup-user";
import { useGetReportStatsQuery } from "../../api";
import { AdminReports } from "..";
import { APPEALED_REPORT, OPEN_REPORT } from "./fixtures";

vi.mock("../../../../lib/admin-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/admin-api")>()),
  answerAppeal: vi.fn(),
  fetchReports: vi.fn(),
  fetchReportStats: vi.fn(),
}));

const STATS = {
  open: 1,
  hidden: 0,
  appealed: 1,
  decided: 3,
  decided_this_week: 1,
  overdue: 0,
};

const Reports = () => {
  const { data: stats } = useGetReportStatsQuery();

  return <AdminReports isWide isDesktop stats={stats} />;
};

let user: UserEvent;

beforeEach(() => {
  vi.clearAllMocks();
  user = setupUser();
  vi.mocked(fetchReportStats).mockResolvedValue(STATS);
  vi.mocked(answerAppeal).mockResolvedValue(null);

  vi.mocked(fetchReports).mockImplementation(({ tab }) =>
    Promise.resolve({
      total: 1,
      items: [tab === "appealed" ? APPEALED_REPORT : OPEN_REPORT],
    }),
  );
});

const openSheet = async (tab: "Open" | "Appealed") => {
  renderWithStore(<Reports />, "/admin");

  await user.click(await screen.findByRole("tab", { name: new RegExp(tab) }));
  await user.click(await screen.findByRole("button", { name: /More actions/ }));

  await user.click(
    await screen.findByRole("menuitem", {
      name: tab === "Open" ? "Decide" : "Look again",
    }),
  );
};

describe("AdminReports", () => {
  it("refetches the list and counts after answering an appeal", async () => {
    await openSheet("Appealed");

    vi.mocked(fetchReportStats).mockResolvedValue({ ...STATS, appealed: 0 });
    vi.mocked(fetchReports).mockResolvedValue({ total: 0, items: [] });

    await user.click(
      await screen.findByRole("button", { name: "Change decision" }),
    );

    await user.click(screen.getByLabelText(/Remove the review/));

    await user.type(
      screen.getByRole("textbox", { name: /Note/ }),
      "Fair point",
    );

    await user.click(screen.getByRole("button", { name: "Save decision" }));

    await waitFor(() =>
      expect(answerAppeal).toHaveBeenCalledWith({
        appealId: "appeal-1",
        outcome: "removed",
        note: "Fair point",
      }),
    );

    expect(await screen.findByText("No appeals waiting")).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: /Appealed/ })).toHaveTextContent(
      "0",
    );
  });

  it("emails the reviewer and the stylist about an appeal, not who reported it", async () => {
    await openSheet("Appealed");

    await user.click(
      await screen.findByRole("button", { name: "Change decision" }),
    );

    await user.click(screen.getByLabelText(/Remove the review/));

    expect(screen.getByText("Ada Obi, who appealed")).toBeInTheDocument();
    expect(screen.getByText("Hair by Seyi, the stylist")).toBeInTheDocument();
    expect(screen.queryByText(/who reported it/)).not.toBeInTheDocument();
  });

  it("asks before closing with a decision or note started", async () => {
    await openSheet("Open");

    await user.click(await screen.findByLabelText(/Remove the words/));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(
      await screen.findByRole("button", { name: "Keep editing" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.getByLabelText(/Remove the words/)).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(await screen.findByRole("button", { name: "Discard" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Decide on this review" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("closes straight away when nothing was changed", async () => {
    await openSheet("Open");

    await screen.findByLabelText(/Remove the words/);
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Decide on this review" }),
      ).not.toBeInTheDocument(),
    );

    expect(
      screen.queryByRole("button", { name: "Keep editing" }),
    ).not.toBeInTheDocument();
  });
});
