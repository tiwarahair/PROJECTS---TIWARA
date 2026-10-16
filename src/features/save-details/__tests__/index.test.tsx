import { screen, waitFor } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingError } from "../../../lib/booking-api";
import {
  claimBookingInvite,
  getBookingInvite,
  renewBookingInvite,
  signInWithInvite,
} from "../../../lib/booking-invite-api";
import type { BookingInvite } from "../../../lib/booking-invite-api";
import { renderWithStore } from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { SaveDetailsPage } from "..";

vi.mock("../../../lib/booking-invite-api", async (original) =>
  (await import("../../../test/booking-mocks")).mockBookingInviteApi(original),
);

const PAGE = "/save-details?token=invite-1";
const STRONG = "correct horse battery staple";

let user: UserEvent;

const withState = (state: BookingInvite["state"]) =>
  vi.mocked(getBookingInvite).mockResolvedValueOnce({
    state,
    first: "Nia",
    last: "Okafor",
    email: "nia.okafor@gmail.com",
  });

beforeEach(() => {
  sessionStorage.clear();
  user = setupUser();
});

describe("SaveDetailsPage", () => {
  it("shows the guest's email from the invite and asks for a 15+ character password", async () => {
    renderWithStore(<SaveDetailsPage />, PAGE);

    expect(
      await screen.findByRole("heading", {
        name: "Finish saving your details",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("nia.okafor@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("15+ characters")).toBeInTheDocument();
    expect(getBookingInvite).toHaveBeenCalledWith("invite-1");
  });

  it("a short password shows the error on Save instead of saving", async () => {
    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.type(await screen.findByLabelText("Create a password"), "short");
    await user.click(screen.getByRole("button", { name: "Save my details" }));

    expect(screen.getByLabelText("Create a password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    expect(claimBookingInvite).not.toHaveBeenCalled();
  });

  it("a long password creates the account, shows Your details are saved and signs in", async () => {
    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.type(await screen.findByLabelText("Create a password"), STRONG);
    await user.click(screen.getByRole("button", { name: "Save my details" }));

    expect(
      await screen.findByRole("heading", { name: "Your details are saved" }),
    ).toBeInTheDocument();

    expect(claimBookingInvite).toHaveBeenCalledWith({
      token: "invite-1",
      password: STRONG,
    });

    expect(signInWithInvite).toHaveBeenCalledWith("hash");
  });

  it("an email that already has an account is told to log in", async () => {
    vi.mocked(claimBookingInvite).mockRejectedValueOnce(
      new BookingError("account_exists"),
    );

    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.type(await screen.findByLabelText("Create a password"), STRONG);
    await user.click(screen.getByRole("button", { name: "Save my details" }));

    expect(
      await screen.findByRole("heading", {
        name: "You already have an account",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?screen=cust-email&return=%2Faccount%3Fsection%3Dbookings",
    );
  });

  it("an invite for an email with an account goes straight to log in", async () => {
    withState("account_exists");
    renderWithStore(<SaveDetailsPage />, PAGE);

    expect(
      await screen.findByRole("heading", {
        name: "You already have an account",
      }),
    ).toBeInTheDocument();
  });

  it("a link that expires while the form is open offers a new one", async () => {
    vi.mocked(claimBookingInvite).mockRejectedValueOnce(
      new BookingError("expired"),
    );

    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.type(await screen.findByLabelText("Create a password"), STRONG);
    await user.click(screen.getByRole("button", { name: "Save my details" }));

    expect(
      await screen.findByRole("heading", { name: "This link has expired" }),
    ).toBeInTheDocument();
  });

  it("an unexpected failure keeps the form with an error", async () => {
    vi.mocked(claimBookingInvite).mockRejectedValueOnce(
      new BookingError("unknown"),
    );

    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.type(await screen.findByLabelText("Create a password"), STRONG);
    await user.click(screen.getByRole("button", { name: "Save my details" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t save your details. Try again.",
    );
  });

  it("Show / Hide toggles the password field", async () => {
    renderWithStore(<SaveDetailsPage />, PAGE);
    const input = await screen.findByLabelText("Create a password");

    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("the Terms line opens the Client Terms", async () => {
    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.click(await screen.findByRole("button", { name: "Terms" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Client Terms");
  });

  it("an expired link can send a new one, once", async () => {
    withState("expired");
    renderWithStore(<SaveDetailsPage />, PAGE);

    await user.click(
      await screen.findByRole("button", { name: "Send a new link" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "We've sent a new link to nia.okafor@gmail.com.",
    );

    expect(
      screen.getByRole("button", { name: "Send a new link" }),
    ).toBeDisabled();

    expect(renewBookingInvite).toHaveBeenCalledWith("invite-1");
  });

  it("an unknown link says it isn't valid", async () => {
    vi.mocked(getBookingInvite).mockRejectedValueOnce(
      new BookingError("link_not_valid"),
    );

    renderWithStore(<SaveDetailsPage />, PAGE);

    expect(
      await screen.findByRole("heading", { name: "This link isn’t valid" }),
    ).toBeInTheDocument();
  });

  it("the token leaves the address bar but survives a reload, and no referrer is sent", async () => {
    const { unmount } = renderWithStore(<SaveDetailsPage />, PAGE);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        /^\/save-details$/,
      ),
    );

    expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute(
      "content",
      "no-referrer",
    );

    unmount();
    renderWithStore(<SaveDetailsPage />, "/save-details");

    expect(
      await screen.findByRole("heading", {
        name: "Finish saving your details",
      }),
    ).toBeInTheDocument();
  });

  it("no token says the link isn't valid", () => {
    renderWithStore(<SaveDetailsPage />, "/save-details");

    expect(
      screen.getByRole("heading", { name: "This link isn’t valid" }),
    ).toBeInTheDocument();
  });
});
