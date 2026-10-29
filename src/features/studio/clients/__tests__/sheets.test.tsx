import { act, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import { getClientRow } from "../../../../test/studio-booking-row";
import { getStudioSeed } from "../../../../test/studio-seed";
import { StudioPage } from "../..";
import type { UserEvent } from "@testing-library/user-event";
import { setupUser } from "../../../../test/setup-user";

vi.mock("../../../../lib/studio-api/clients", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../../../lib/studio-api/clients")
  >()),
  saveStylistClient: vi.fn(() => Promise.resolve("client-ada")),
}));

let user: UserEvent;

beforeEach(() => {
  user = setupUser();
});

const getLabelled = (label: string) =>
  document.querySelector(`[data-screen-label="${label}"]`) as HTMLElement;

const runNextTimer = () => act(() => void vi.advanceTimersToNextTimer());

const setViewport = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const minWidth = /min-width:\s*(\d+)px/.exec(query);

    return {
      matches: minWidth ? width >= Number(minWidth[1]) : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });
};

const openClients = async (seed = getStudioSeed()) => {
  renderWithStore(<StudioPage seed={seed} />, "/studio");
  runNextTimer();
  await user.click(within(getLabelled("Sidebar")).getByTitle("Clients"));

  return getLabelled("Clients");
};

describe("Studio → client sheets", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "Date",
      ],
    });

    vi.setSystemTime(new Date(2026, 8, 7, 9, 0));
    localStorage.clear();
    setViewport(1440);
  });

  afterEach(() => vi.useRealTimers());

  it("wide screens open a client's profile in the side panel", async () => {
    const clients = await openClients();

    await user.click(within(clients).getByText("Nia Okafor"));

    expect(
      screen.getByRole("heading", { name: "Nia Okafor" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Book Nia" }),
    ).toBeInTheDocument();
  });

  it("shows a linked client's account photo, but editing offers only the stylist's own", async () => {
    const seed = getStudioSeed();

    seed.bookings.clients = [
      getClientRow({
        account_photo_path: "nia/photo.jpg",
        photo_url: "https://signed/account",
      }),
    ];

    const clients = await openClients(seed);

    await user.click(within(clients).getByText("Nia Okafor"));

    const head = screen.getByRole("heading", { name: "Nia Okafor" })
      .parentElement?.parentElement?.parentElement as HTMLElement;

    expect(
      head.querySelector('img[src="https://signed/account"]'),
    ).not.toBeNull();

    const profileActions = screen.getByRole("button", { name: "Book Nia" })
      .parentElement as HTMLElement;

    await user.click(
      within(profileActions).getByRole("button", { name: "Edit" }),
    );

    expect(
      screen.getByRole("button", { name: "Add a profile photo" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("adding a client needs a first name and a phone or email", async () => {
    const clients = await openClients();

    await user.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    const save = screen
      .getAllByRole("button", { name: "Add client" })
      .at(-1) as HTMLElement;

    await user.click(save);

    expect(
      await screen.findByText("Enter their first name."),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Add a phone number or an email address."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Phone"), "07700 900999");

    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.click(save);
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.getByText("Client saved")).toBeInTheDocument();
  });

  it("client errors stay until their own field is fixed", async () => {
    const clients = await openClients();

    await user.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    await user.click(
      screen.getAllByRole("button", { name: "Add client" }).at(-1)!,
    );

    expect(
      await screen.findByText("Enter their first name."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("First name"), "A");

    await waitFor(() =>
      expect(
        screen.queryByText("Enter their first name."),
      ).not.toBeInTheDocument(),
    );

    expect(
      screen.getByText("Add a phone number or an email address."),
    ).toBeInTheDocument();
  });

  it("a phone number already on file points to that client", async () => {
    const clients = await openClients();

    await user.click(
      within(clients).getByRole("button", { name: "Add client" }),
    );

    await user.type(
      screen.getByPlaceholderText("name@email.com"),
      "nia@example.com",
    );

    expect(
      screen.getByRole("button", { name: "View Nia" }),
    ).toBeInTheDocument();
  });
});
