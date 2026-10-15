import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../supabase";
import { removePhoto, uploadPhotoWithCopies } from "../studio-api";

vi.mock("browser-image-compression", () => ({
  default: vi.fn(
    async (_file: File, { fileType }: { fileType: string }) =>
      new Blob(["x"], { type: fileType }),
  ),
}));

const mockStorage = () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });

  vi.spyOn(supabase.storage, "from").mockReturnValue({
    upload,
    remove,
  } as never);

  return { upload, remove };
};

describe("uploadPhotoWithCopies", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uploads the original and JPEG + WebP copies at three widths", async () => {
    const { upload } = mockStorage();

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 1500, height: 2000, close: vi.fn() }),
    );

    await uploadPhotoWithCopies(
      "s1/cover-1-full.jpg",
      new File(["x"], "a.jpg"),
    );

    const uploads = upload.mock.calls.map(([path, , { contentType }]) => [
      path,
      contentType,
    ]);

    expect(uploads).toContainEqual(["s1/cover-1-full.jpg", "image/jpeg"]);
    expect(uploads).toContainEqual(["s1/cover-1-800.jpg", "image/jpeg"]);
    expect(uploads).toHaveLength(7);

    // this browser (jsdom, like Safari) can't encode WebP: the .webp name holds the JPEG so it still loads
    expect(uploads).toContainEqual(["s1/cover-1-1200.webp", "image/jpeg"]);
  });

  it("removing a photo removes its copies", async () => {
    const { remove } = mockStorage();

    await removePhoto("s1/portfolio/p1-full.jpg");

    expect(remove.mock.calls[0]?.[0]).toHaveLength(7);
  });
});
