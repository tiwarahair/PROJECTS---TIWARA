import { act, screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMySensitivities,
  saveMySensitivity,
} from "../../../lib/client-sensitivities";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

vi.mock("../../../lib/client-sensitivities", () => ({
  fetchMySensitivities: vi.fn(),
  saveMySensitivity: vi.fn(),
}));

let user: UserEvent;

// query results reach the page on the next animation frame, a faked timer here
const settle = () => act(() => vi.advanceTimersByTimeAsync(100));

const renderShared = async () => {
  renderWithStore(<AccountPage />, "/account?section=shared", {
    signedIn: true,
  });

  await settle();
};

describe("Account shared with stylists", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();

    vi.mocked(fetchMySensitivities).mockResolvedValue([
      {
        stylistId: "crown-id",
        stylistName: "Crown Studio",
        text: "Sensitive scalp",
      },
    ]);

    vi.mocked(saveMySensitivity).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("an edit needs the consent tick before it saves", async () => {
    await renderShared();

    expect(screen.getByText("Sensitive scalp")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(screen.getByRole("textbox"), ", no relaxers");

    const save = screen.getByRole("button", { name: "Save" });

    expect(save).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: "I agree to share this with Crown Studio",
      }),
    );

    await user.click(save);
    await settle();

    expect(saveMySensitivity).toHaveBeenCalledWith({
      stylistId: "crown-id",
      text: "Sensitive scalp, no relaxers",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("removing it tells the server", async () => {
    await renderShared();
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Remove",
      }),
    );

    await settle();

    expect(saveMySensitivity).toHaveBeenCalledWith({
      stylistId: "crown-id",
      text: "",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Removed");
  });
});
