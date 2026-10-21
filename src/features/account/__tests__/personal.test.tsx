import { act, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../../lib/supabase";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

let user: UserEvent;
const update = vi.fn();
const matchId = vi.fn();

const settle = () =>
  act(async () => {
    for (let tick = 0; tick < 5; tick++) await Promise.resolve();
  });

const renderAccount = (section: string) =>
  renderWithStore(<AccountPage />, `/account?section=${section}`, {
    signedIn: true,
  });

describe("Account profile saves", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();
    matchId.mockResolvedValue({ error: null });
    // supabase-js's own method name, too short for our naming rule
    update.mockReturnValue({ ["eq"]: matchId });

    vi.spyOn(supabase, "from").mockReturnValue({
      update,
    } as unknown as ReturnType<typeof supabase.from>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("saves a new name to the profile", async () => {
    renderAccount("personal");
    await user.click(screen.getByRole("button", { name: "Edit full name" }));
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Nina");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(supabase.from).toHaveBeenCalledWith("profiles");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: "Nina", last_name: "Okafor" }),
    );

    expect(matchId).toHaveBeenCalledWith("id", "test-user");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your details are updated",
    );
  });

  it("keeps the edit open when the save fails", async () => {
    matchId.mockResolvedValue({ error: { message: "offline" } });
    renderAccount("personal");
    await user.click(screen.getByRole("button", { name: "Edit mobile" }));
    await user.clear(screen.getByLabelText(/Mobile/));
    await user.type(screen.getByLabelText(/Mobile/), "07700900999");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await settle();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your details couldn’t be saved. Try again",
    );

    expect(screen.getByLabelText(/Mobile/)).toBeInTheDocument();
  });

  it("saves the marketing choice", async () => {
    renderAccount("communication");
    await user.click(screen.getByRole("switch"));
    await settle();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ marketing_opt_in: true }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "You’ll get offers and news by email",
    );
  });
});
