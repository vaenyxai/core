// Shared preparation for chat and modular Routine photo inputs.
// Dinner uses strict mode: never silently store the phone's original image.
export async function downscalePhoto(
  file: File,
  strict = false,
): Promise<Blob> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    if (!strict && scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Photo compression is unavailable. Please try another photo.",
      );
    for (let pass = 0; pass < (strict ? 5 : 1); pass++) {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((done) =>
        canvas.toBlob(done, "image/jpeg", strict ? 0.8 : 0.85),
      );
      if (!blob)
        throw new Error("Photo compression failed. Please try another photo.");
      if (!strict || blob.size <= 600_000) return blob;
      canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
      canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
    }
    throw new Error(
      "Photo could not be compressed below 600 KB. Please try another photo.",
    );
  } catch (reason) {
    if (strict) throw reason;
    return file;
  } finally {
    bitmap?.close();
  }
}
