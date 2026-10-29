import { afterEach, describe, expect, it, vi } from "vitest";
import { downscalePhoto } from "./photo-upload";

afterEach(() => vi.unstubAllGlobals());
function browser(blobs: (Blob | null)[]) {
  const close = vi.fn();
  const bitmap = { width: 4032, height: 3024, close };
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => bitmap),
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }),
    toBlob: (done: (blob: Blob | null) => void) => done(blobs.shift() ?? null),
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  return { canvas, close };
}
describe("Dinner photo compression", () => {
  it("uploads a JPEG below 600 KB and 1280px, and releases the decoded original", async () => {
    const compressed = new Blob([new Uint8Array(120_000)], {
      type: "image/jpeg",
    });
    const { canvas, close } = browser([compressed]);
    const file = new File([new Uint8Array(4_000_000)], "camera.jpg", {
      type: "image/jpeg",
    });
    expect(await downscalePhoto(file, true)).toBe(compressed);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(960);
    expect(close).toHaveBeenCalledOnce();
  });
  it("shrinks again when the first JPEG is still too large", async () => {
    const { canvas } = browser([
      new Blob([new Uint8Array(700_000)]),
      new Blob([new Uint8Array(400_000)]),
    ]);
    expect(
      (await downscalePhoto(new File(["test"], "camera.jpg"), true)).size,
    ).toBe(400_000);
    expect(canvas.width).toBe(1024);
  });
  it("never falls back to uploading the original if compression fails", async () => {
    const { close } = browser([null]);
    await expect(
      downscalePhoto(new File(["original"], "camera.jpg"), true),
    ).rejects.toThrow("compression failed");
    expect(close).toHaveBeenCalledOnce();
  });
  it("preserves the existing non-Dinner fallback for unsupported image decoders", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("decode failed");
      }),
    );
    const file = new File(["original"], "camera.jpg");
    expect(await downscalePhoto(file)).toBe(file);
    await expect(downscalePhoto(file, true)).rejects.toThrow("decode failed");
  });
});
