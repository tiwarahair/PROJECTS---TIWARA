import { act, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccountPhotoUrl,
  removeAccountPhoto,
  uploadAccountPhoto,
} from "../../../lib/account-photo";
import { api } from "../../../stores/api-slice";
import {
  renderWithStore,
  TEST_PROFILE,
  TEST_USER,
} from "../../../test/render-with-store";
import { setupUser } from "../../../test/setup-user";
import { AccountPage } from "..";

vi.mock("../../../lib/account-photo", () => ({
  getAccountPhotoUrl: vi.fn(),
  removeAccountPhoto: vi.fn(),
  uploadAccountPhoto: vi.fn(),
}));

const PHOTO_PATH = "test-user/photo.jpg";
const SIGNED_URL = "https://storage.test/signed/photo.jpg";

let user: UserEvent;

// query results reach the page on the next animation frame, a faked timer here
const settle = () => act(() => vi.advanceTimersByTimeAsync(100));

const choosePhoto = (type = "image/png") =>
  user.upload(
    screen.getByLabelText("Upload profile photo"),
    new File(["photo"], "me.png", { type }),
  );

describe("Account photo", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    });

    user = setupUser();
    vi.mocked(getAccountPhotoUrl).mockResolvedValue(SIGNED_URL);
    vi.mocked(uploadAccountPhoto).mockResolvedValue(PHOTO_PATH);
    vi.mocked(removeAccountPhoto).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("uploads the photo, shows it and can remove it", async () => {
    const { container } = renderWithStore(
      <AccountPage />,
      "/account?section=personal",
      { signedIn: true },
    );

    await choosePhoto();
    await settle();

    expect(uploadAccountPhoto).toHaveBeenCalledWith({
      userId: "test-user",
      file: expect.any(File),
    });

    expect(getAccountPhotoUrl).toHaveBeenCalledWith(PHOTO_PATH);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your photo is updated",
    );

    expect(container.querySelector(`img[src="${SIGNED_URL}"]`)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await settle();

    expect(removeAccountPhoto).toHaveBeenCalledWith("test-user");
    expect(screen.getByRole("status")).toHaveTextContent("Photo removed");

    expect(
      screen.getByRole("button", { name: "Upload photo" }),
    ).toBeInTheDocument();
  });

  it("refuses other file types without uploading", async () => {
    renderWithStore(<AccountPage />, "/account?section=personal", {
      signedIn: true,
    });

    await choosePhoto("image/gif");
    await settle();

    expect(uploadAccountPhoto).not.toHaveBeenCalled();

    expect(
      screen.getByText("Choose a JPG, JPEG or PNG photo."),
    ).toBeInTheDocument();
  });

  it("says so when the upload fails", async () => {
    vi.mocked(uploadAccountPhoto).mockRejectedValue(new Error("offline"));

    renderWithStore(<AccountPage />, "/account?section=personal", {
      signedIn: true,
    });

    await choosePhoto();
    await settle();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your photo couldn’t be saved. Try again",
    );

    expect(
      screen.getByRole("button", { name: "Upload photo" }),
    ).toBeInTheDocument();
  });

  it("shows a skeleton, not initials, while the photo is on its way", async () => {
    vi.mocked(getAccountPhotoUrl).mockReturnValue(new Promise(() => {}));

    const { store } = renderWithStore(
      <AccountPage />,
      "/account?section=personal",
      { signedIn: true },
    );

    act(() => {
      store.dispatch(
        api.util.upsertQueryEntries([
          {
            endpointName: "getProfile",
            arg: TEST_USER.id,
            value: { ...TEST_PROFILE, photoPath: PHOTO_PATH },
          },
        ]),
      );
    });

    await settle();

    const photoButton = screen.getByRole("button", { name: "Change photo" });

    expect(photoButton).not.toHaveTextContent("NO");
    expect(photoButton.querySelector(".react-loading-skeleton")).not.toBeNull();
  });

  it("if the photo can't be fetched, shows initials and can still remove it", async () => {
    vi.mocked(getAccountPhotoUrl).mockRejectedValue(new Error("missing"));

    const { store } = renderWithStore(
      <AccountPage />,
      "/account?section=personal",
      { signedIn: true },
    );

    act(() => {
      store.dispatch(
        api.util.upsertQueryEntries([
          {
            endpointName: "getProfile",
            arg: TEST_USER.id,
            value: { ...TEST_PROFILE, photoPath: PHOTO_PATH },
          },
        ]),
      );
    });

    await settle();
    await settle();

    expect(
      screen.getByRole("button", { name: "Change photo" }),
    ).toHaveTextContent("NO");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await settle();

    expect(removeAccountPhoto).toHaveBeenCalledWith("test-user");
    expect(screen.getByRole("status")).toHaveTextContent("Photo removed");
  });
});
