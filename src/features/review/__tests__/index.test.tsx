import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserEvent } from "@testing-library/user-event";
import { fetchReviewPage, submitReview } from "../../../lib/review-api";
import type { ReviewPage as Page } from "../../../lib/review-api";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { ReviewPage } from "..";

vi.mock("../../../lib/review-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/review-api")>()),
  fetchReviewPage: vi.fn(),
  submitReview: vi.fn(),
}));

const OPEN: Page = {
  state: "open",
  ref: "TH-ABC123",
  service_name: "Silk press",
  stylist_name: "NaturallyNia",
  stylist_slug: "naturallynia",
  starts_at: "2026-10-20T09:00:00Z",
  client_first: "Ada",
  rating: null,
};

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
  sessionStorage.clear();
  vi.mocked(fetchReviewPage).mockResolvedValue(OPEN);
});

describe("ReviewPage", () => {
  it("needs a star rating before posting", async () => {
    renderWithStore(<ReviewPage />, "/review?token=abc");

    await user.click(
      await screen.findByRole("button", { name: "Post review" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a star rating.",
    );

    expect(submitReview).not.toHaveBeenCalled();
  });

  it("posts the stars and words, then thanks the client", async () => {
    vi.mocked(submitReview).mockResolvedValue({
      ...OPEN,
      state: "reviewed",
      rating: 4,
    });

    renderWithStore(<ReviewPage />, "/review?token=abc");

    await user.click(
      await screen.findByRole("radio", { name: "4 stars, Very good" }),
    );

    await user.type(screen.getByRole("textbox"), "Neat and quick");
    await user.click(screen.getByRole("button", { name: "Post review" }));

    expect(submitReview).toHaveBeenCalledWith({
      token: "abc",
      rating: 4,
      body: "Neat and quick",
    });

    expect(
      await screen.findByRole("heading", { name: "Thanks for your review" }),
    ).toBeInTheDocument();
  });

  it("an expired link says so", async () => {
    vi.mocked(fetchReviewPage).mockRejectedValue(new Error("link_not_valid"));

    renderWithStore(<ReviewPage />, "/review?token=old");

    expect(
      await screen.findByRole("heading", { name: "This link has expired" }),
    ).toBeInTheDocument();
  });
});
