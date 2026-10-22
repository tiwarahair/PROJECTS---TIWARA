import { act, screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountPhotoUrl } from "../../../lib/account-photo";
import { api } from "../../../stores/api-slice";
import {
  renderWithStore,
  TEST_PROFILE,
  TEST_USER,
} from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { SiteHeader } from "..";

vi.mock("../../../lib/account-photo", () => ({
  getAccountPhotoUrl: vi.fn(() =>
    Promise.resolve("https://storage.test/signed/photo.jpg"),
  ),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

describe("SiteHeader", () => {
  it("shows guests the given login link and a menu button", () => {
    renderWithStore(<SiteHeader loginHref="/login?return=%2Fhelp" />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?return=%2Fhelp",
    );

    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("signed in, shows the favourites heart and the account menu instead of the menu button", async () => {
    renderWithStore(<SiteHeader />, "/", { signedIn: true });

    expect(
      screen.getByRole("link", { name: "Favourites" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Account" }));

    expect(
      screen.getByRole("menu", { name: "Nia Okafor" }),
    ).toBeInTheDocument();
  });

  it("shows the given initials", () => {
    renderWithStore(<SiteHeader initials="AB" />, "/", { signedIn: true });

    expect(screen.getByRole("button", { name: "Account" })).toHaveTextContent(
      "AB",
    );
  });

  it("shows a signed-in client's own photo", async () => {
    const { container, store } = renderWithStore(<SiteHeader />, "/", {
      signedIn: true,
    });

    store.dispatch(
      api.util.upsertQueryEntries([
        {
          endpointName: "getProfile",
          arg: TEST_USER.id,
          value: { ...TEST_PROFILE, photoPath: "test-user/photo.jpg" },
        },
      ]),
    );

    await waitFor(() =>
      expect(
        container.querySelector(
          'img[src="https://storage.test/signed/photo.jpg"]',
        ),
      ).not.toBeNull(),
    );

    expect(getAccountPhotoUrl).toHaveBeenCalledWith("test-user/photo.jpg");
  });

  it("shows a skeleton, not initials, while the photo is on its way", async () => {
    vi.mocked(getAccountPhotoUrl).mockReturnValueOnce(new Promise(() => {}));

    const { container, store } = renderWithStore(<SiteHeader />, "/", {
      signedIn: true,
    });

    act(() => {
      store.dispatch(
        api.util.upsertQueryEntries([
          {
            endpointName: "getProfile",
            arg: TEST_USER.id,
            value: { ...TEST_PROFILE, photoPath: "test-user/photo.jpg" },
          },
        ]),
      );
    });

    await waitFor(() =>
      expect(container.querySelector(".react-loading-skeleton")).not.toBeNull(),
    );

    expect(
      screen.getByRole("button", { name: "Account" }),
    ).not.toHaveTextContent("NO");
  });
});
