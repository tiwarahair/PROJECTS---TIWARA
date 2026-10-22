import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserEvent } from "@testing-library/user-event";
import { fetchStylistReviews, reportReview } from "../../../lib/review-api";
import type { PublicReview } from "../../../lib/review-api";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { ProfileReviews } from "../profile-reviews";

vi.mock("../../../lib/review-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/review-api")>()),
  fetchStylistReviews: vi.fn(),
  reportReview: vi.fn(),
}));

const REVIEW: PublicReview = {
  id: "review-1",
  rating: 5,
  body: "Beautiful knotless braids",
  is_text_removed: false,
  author: "Ada L.",
  is_former: false,
  service_name: "Knotless braids",
  created_at: "2026-10-20T09:00:00Z",
  reply: null,
  replied_at: null,
  is_reply_edited: false,
  is_mine: false,
};

let user: UserEvent;

beforeEach(() => {
  user = setupUser();

  vi.mocked(fetchStylistReviews).mockResolvedValue({
    total: 1,
    reviews: [REVIEW],
  });
});

const renderReviews = (signedIn: boolean) =>
  renderWithStore(
    <ProfileReviews
      slug="naturallynia"
      stylistName="NaturallyNia"
      rating={0}
      reviews={0}
    />,
    "/naturallynia",
    { signedIn },
  );

describe("ProfileReviews", () => {
  it("shows the newest 3, and every review in a sheet", async () => {
    vi.mocked(fetchStylistReviews).mockResolvedValue({
      total: 6,
      reviews: [1, 2, 3, 4, 5, 6].map((index) => ({
        ...REVIEW,
        id: `review-${index}`,
        author: `Client ${index}`,
      })),
    });

    renderReviews(false);

    await user.click(
      await screen.findByRole("button", { name: "Show all 6 reviews" }),
    );

    expect(screen.queryByText("Client 5")).not.toBeNull();

    const sheet = screen.getByRole("dialog", { name: "Reviews" });

    expect(within(sheet).getAllByRole("article")).toHaveLength(6);
  });

  it("guests log in before reporting", async () => {
    renderReviews(false);

    await user.click(
      await screen.findByRole("button", {
        name: "More options for this review",
      }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Report review" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/login?screen=cust-email&return=%2Fnaturallynia",
    );
  });

  it("Other needs a few words before it sends", async () => {
    renderReviews(true);

    await user.click(
      await screen.findByRole("button", {
        name: "More options for this review",
      }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Report review" }));

    await user.click(screen.getByRole("radio", { name: "Other" }));
    await user.click(screen.getByRole("button", { name: "Send report" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tell us what’s wrong with it.",
    );

    expect(reportReview).not.toHaveBeenCalled();
  });

  it("signed-in visitors report with a reason", async () => {
    vi.mocked(reportReview).mockResolvedValue("reported");
    renderReviews(true);

    await user.click(
      await screen.findByRole("button", {
        name: "More options for this review",
      }),
    );

    await user.click(screen.getByRole("menuitem", { name: "Report review" }));

    await user.click(
      screen.getByRole("radio", { name: "Spam or advertising" }),
    );

    await user.click(screen.getByRole("button", { name: "Send report" }));

    expect(reportReview).toHaveBeenCalledWith({
      reviewId: "review-1",
      reason: "spam",
      details: "",
    });

    expect(
      await screen.findByText("Thanks for telling us"),
    ).toBeInTheDocument();
  });
});
