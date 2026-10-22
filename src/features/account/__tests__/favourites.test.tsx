import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFavourites } from "../../../lib/favourites";
import { renderWithStore } from "../../../test/render-with-store";
import { AccountPage } from "..";

vi.mock("../../../lib/favourites", () => ({
  fetchFavourites: vi.fn(),
  writeFavourite: vi.fn(),
}));

describe("Account favourites", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows placeholders, not 'no favourites', until the list arrives", async () => {
    let finishLoading: (ids: string[]) => void = () => {};

    vi.mocked(fetchFavourites).mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );

    const { container } = renderWithStore(
      <AccountPage />,
      "/account?section=favourites",
      { signedIn: true },
    );

    expect(screen.queryByText(/No favourites yet/)).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(async () => finishLoading([]));

    expect(await screen.findByText(/No favourites yet/)).toBeInTheDocument();
  });

  it("leaves the count off the overview link until the list arrives", async () => {
    vi.mocked(fetchFavourites).mockReturnValue(new Promise(() => {}));

    renderWithStore(<AccountPage />, "/account?section=overview", {
      signedIn: true,
    });

    expect(
      await screen.findByRole("link", { name: /^Your favourites/ }),
    ).not.toHaveTextContent("(0)");
  });
});
