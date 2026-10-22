import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewCard } from "..";

const REVIEW = {
  author: "Ada L.",
  rating: 4,
  createdAt: "2026-10-20T09:00:00Z",
  serviceName: "Silk press",
  body: null,
  isTextRemoved: false,
  reply: null,
  isReplyEdited: false,
  stylistName: "NaturallyNia",
};

describe("ReviewCard", () => {
  it("shows the stars, the verified label and an edited reply", () => {
    render(
      <ReviewCard {...REVIEW} body="Lovely" reply="Thank you!" isReplyEdited />,
    );

    expect(
      screen.getByRole("img", { name: "4 out of 5 stars" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Verified booking")).toBeInTheDocument();
    expect(screen.getByText("Reply from NaturallyNia")).toBeInTheDocument();
    expect(screen.getByText("Edited")).toBeInTheDocument();
  });

  it("says when the words were removed", () => {
    render(<ReviewCard {...REVIEW} isTextRemoved />);

    expect(screen.getByText(/The rating still counts/)).toBeInTheDocument();
  });
});
