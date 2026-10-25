import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../test/render-with-store";
import { StylistCard } from "..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../test/setup-user";

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const BASE = {
  href: "/amara-beauty",
  cover: "demo/stylists/w161154.jpg",
  stylistName: "Amara Beauty",
  rating: "4.8",
  reviews: 146,
  area: "Hulme, Manchester",
  verified: true,
};

describe("StylistCard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("renders the photo, name, rating, area and fee-inclusive from price", () => {
    renderWithStore(<StylistCard {...BASE} from="£81.70" />);

    expect(
      screen.getByRole("img", { name: "Amara Beauty" }),
    ).toBeInTheDocument();

    // the cover and the title both link to the profile
    screen
      .getAllByRole("link", { name: "Amara Beauty" })
      .forEach((link) => expect(link).toHaveAttribute("href", "/amara-beauty"));

    expect(screen.getByText("(146)")).toBeInTheDocument();
    expect(screen.getByText("Hulme, Manchester")).toBeInTheDocument();
    expect(screen.getByText("from £81.70")).toBeInTheDocument();
  });

  it("without a cover, shows the placeholder instead of a broken photo", () => {
    renderWithStore(<StylistCard {...BASE} cover="" />);

    expect(
      screen.getByRole("img", { name: "Amara Beauty" }),
    ).not.toHaveAttribute("src");
  });

  it("builds the meta line from active services and a numeric from price", () => {
    renderWithStore(
      <StylistCard
        {...BASE}
        from={41.1}
        services={[
          "Fulani braids",
          { name: "Feed-in braids", status: "active" },
          { name: "Draft", status: "draft" },
        ]}
      />,
    );

    expect(
      screen.getByText("Fulani braids · Feed-in braids · from £41.1"),
    ).toBeInTheDocument();
  });

  it("an explicit meta replaces the computed line", () => {
    renderWithStore(<StylistCard {...BASE} from={50} meta="1.2 mi" />);
    expect(screen.getByText("1.2 mi")).toBeInTheDocument();
    expect(screen.queryByText(/from £50/)).not.toBeInTheDocument();
  });

  it("shows facts, service rows and a Book button instead of the meta line", () => {
    renderWithStore(
      <StylistCard
        {...BASE}
        from={50}
        facts={[{ text: "Travels to you", strong: true }]}
        rows={[
          {
            name: "Silk press",
            meta: "2h · from £30.95",
            href: "/book?stylist=amara-beauty",
          },
        ]}
        bookHref="/book?stylist=amara-beauty"
      />,
    );

    expect(screen.getByText("Travels to you")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Silk press/ })).toHaveAttribute(
      "href",
      "/book?stylist=amara-beauty",
    );

    expect(screen.getByRole("link", { name: "Book" })).toBeInTheDocument();
    expect(screen.queryByText("from £50")).not.toBeInTheDocument();
  });

  it("guests tapping the heart get the log-in sheet", async () => {
    const { store } = renderWithStore(<StylistCard {...BASE} />);

    await user.click(
      screen.getByRole("button", { name: "Save Amara Beauty to favourites" }),
    );

    expect(store.getState().favourites.loginSheetFor).toBe("amara-beauty");
  });

  it("logged-in customers toggle the favourite", async () => {
    renderWithStore(<StylistCard {...BASE} />, "/", { signedIn: true });

    await user.click(
      screen.getByRole("button", { name: "Save Amara Beauty to favourites" }),
    );

    expect(
      screen.getByRole("button", {
        name: "Remove Amara Beauty from favourites",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("opens instead of linking, without a heart, with badges and the page's own lines", async () => {
    const onOpen = vi.fn();

    renderWithStore(
      <StylistCard
        {...BASE}
        onOpen={onOpen}
        hasFavourite={false}
        badges={<span>Not checked</span>}
        meta="4 services · from £40"
        facts={[{ text: "Amara Okafor · live 3 days ago" }]}
        size="compact"
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /favourites/ }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Not checked")).toBeInTheDocument();
    expect(screen.getByText("4 services · from £40")).toBeInTheDocument();

    expect(
      screen.getByText("Amara Okafor · live 3 days ago"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Amara Beauty" }));
    await user.click(screen.getByRole("button", { name: "Amara Beauty" }));

    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
