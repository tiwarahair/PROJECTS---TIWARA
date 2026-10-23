import { afterEach, describe, expect, it, vi } from "vitest";
import { copyLaterText } from "../format";

const setClipboard = (clipboard: Partial<Clipboard> | undefined) =>
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
  });

describe("copyLaterText", () => {
  afterEach(() => {
    setClipboard(undefined);
    vi.unstubAllGlobals();
  });

  it("copies the text once the server sends it", async () => {
    const writeText = vi.fn(() => Promise.resolve());

    setClipboard({ writeText });

    await copyLaterText(Promise.resolve("https://example.test/confirm"));

    expect(writeText).toHaveBeenCalledWith("https://example.test/confirm");
  });

  it("rejects instead of throwing when there's no clipboard", async () => {
    await expect(copyLaterText(Promise.resolve("link"))).rejects.toThrow();
  });

  it("keeps the server's refusal when the copy fails because of it", async () => {
    const refusal = new Error("link_not_available");

    vi.stubGlobal("ClipboardItem", class {});
    setClipboard({ write: () => Promise.reject(new Error("NotAllowedError")) });

    await expect(copyLaterText(Promise.reject(refusal))).rejects.toBe(refusal);
  });
});
