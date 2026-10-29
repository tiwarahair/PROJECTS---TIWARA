import imageCompression from "browser-image-compression";
import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../supabase";
import { uploadClientPhoto } from "../photos";

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

describe("uploadClientPhoto", () => {
  afterEach(() => vi.restoreAllMocks());

  it("hands the compressor an image, so a cropped data URL blob isn't rejected", async () => {
    const upload = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload,
    } as unknown as ReturnType<typeof supabase.storage.from>);

    await uploadClientPhoto(
      "stylist-1/client-1/1.jpg",
      new Blob(["pixels"], { type: "image/png" }),
    );

    expect(vi.mocked(imageCompression).mock.calls[0]?.[0].type).toBe(
      "image/png",
    );

    expect(upload).toHaveBeenCalled();
  });
});
