import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserEvent } from "@testing-library/user-event";
import {
  appealReview,
  fetchStudioReviews,
  replyToReview,
} from "../../../../lib/studio-api/reviews";
import type { StudioReview } from "../../../../lib/studio-api/reviews";
import { renderWithStore } from "../../../../test/render-with-store";
import { setupUser } from "../../../../test/setup-user";
import { getStudioSeed } from "../../../../test/studio-seed";
import { StudioPage } from "../..";

vi.mock("../../../../lib/studio-api/reviews", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/reviews")
  >()),
  fetchStudioReviews: vi.fn(),
  replyToReview: vi.fn(),
  appealReview: vi.fn(),
}));

const REVIEW: StudioReview = {
  id: "review-1",
  booking_id: "booking-1",
  ref: "TH-ABC123",
  rating: 2,
  body: "Started late",
  is_text_removed: false,
  client_name: "Ada Lovelace",
  is_former: false,
  stylist_client_id: null,
  service_name: "Silk press",
  starts_at: "2026-09-01T09:00:00Z",
  created_at: "2026-09-01T13:00:00Z",
  reply: null,
  replied_at: null,
  is_reply_edited: false,
  is_counted: true,
  is_checking: true,
  is_reported: true,
  status: "published",
  decision: null,
  appeal_state: null,
  appeal_until: null,
};

let user: UserEvent;

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

describe("Studio → Reviews", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();
    localStorage.clear();

    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const minWidth = /min-width:\s*(\d+)px/.exec(query);

      return {
        matches: minWidth ? 1440 >= Number(minWidth[1]) : false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    vi.mocked(fetchStudioReviews).mockResolvedValue({
      rating: null,
      review_count: 1,
      reviews: [REVIEW],
    });
  });

  afterEach(() => vi.useRealTimers());

  it("lists reviews with the client's name, and a reply saves", async () => {
    vi.mocked(replyToReview).mockResolvedValue(null);
    renderWithStore(<StudioPage seed={getStudioSeed()} />, "/studio");
    act(() => void vi.advanceTimersToNextTimer());
    await user.click(within(getLabelled("Sidebar")).getByTitle("Reviews"));

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/You have 1/)).toBeInTheDocument();
    expect(screen.getByText(/Being checked/)).toBeInTheDocument();
    expect(screen.getByText("Reported")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Replied to 0" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reply" }));

    await user.type(
      screen.getByRole("textbox", { name: "Your public reply" }),
      "Sorry about the wait",
    );

    await user.click(screen.getByRole("button", { name: "Save reply" }));

    expect(replyToReview).toHaveBeenCalledWith({
      reviewId: "review-1",
      reply: "Sorry about the wait",
    });
  });

  it("shows our decision and sends one appeal", async () => {
    vi.mocked(appealReview).mockResolvedValue("appealed");

    vi.mocked(fetchStudioReviews).mockResolvedValue({
      rating: null,
      review_count: 1,
      reviews: [
        {
          ...REVIEW,
          is_checking: false,
          decision: "kept",
          appeal_state: "open",
          appeal_until: "2026-11-05T12:00:00Z",
        },
      ],
    });

    renderWithStore(<StudioPage seed={getStudioSeed()} />, "/studio");
    act(() => void vi.advanceTimersToNextTimer());
    await user.click(within(getLabelled("Sidebar")).getByTitle("Reviews"));

    expect(await screen.findByText("Kept after checking")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appeal" }));

    await user.type(
      screen.getByRole("textbox", { name: "Why should we look again?" }),
      "It names my home address",
    );

    await user.click(screen.getByRole("button", { name: "Send appeal" }));

    expect(appealReview).toHaveBeenCalledWith({
      reviewId: "review-1",
      body: "It names my home address",
    });
  });
});
