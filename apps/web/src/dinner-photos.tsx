import { useEffect, useRef, useState } from "react";
import { runRoutineInChat, uploadPhoto } from "./api";
import { recognisedIngredients, type DinnerPhoto } from "./dinner-planner-data";
import { AnnotatedPhoto } from "./photo-marks";
import { downscalePhoto } from "./photo-upload";

export function DinnerPhotos({
  conversationId,
  language,
  photos,
  disabled,
  visionReady,
  onAdd,
  onRemove,
  onBusy,
}: {
  conversationId: string;
  language: "en" | "zh";
  photos: DinnerPhoto[];
  disabled: boolean;
  visionReady: boolean;
  onAdd: (photo: DinnerPhoto, ingredients: string) => void;
  onRemove: (id: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const zh = language === "zh";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
  }
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  async function pick(files: File[]) {
    if (busy.current || disabled) return;
    if (photos.length + files.length > 5) {
      setError(
        zh
          ? "最多放 5 张照片，请减少选择。"
          : "Choose up to 5 photos in total.",
      );
      return;
    }
    busy.current = true;
    onBusy(true);
    setError("");
    try {
      for (const file of files) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 20 * 1024 * 1024
        ) {
          throw new Error(
            zh
              ? "请用 20 MB 以内的 JPG、PNG 或 WebP 照片。"
              : "Use JPG, PNG or WebP photos under 20 MB.",
          );
        }
        previewRef.current = URL.createObjectURL(file);
        setPreview(previewRef.current);
        setStatus(zh ? "正在压缩照片…" : "Compressing Photo…");
        const blob = await downscalePhoto(file, true);
        setStatus(zh ? "正在上传照片…" : "Uploading Photo…");
        if (blob.size > 10 * 1024 * 1024)
          throw new Error(
            zh
              ? "照片太大，请选一张小一点的。"
              : "This photo is too large. Choose a smaller one.",
          );
        const { imageId } = await uploadPhoto(blob);
        const photo: DinnerPhoto = {
          assetId: imageId,
          name: file.name.slice(0, 200),
          role: "ingredients",
        };
        setReadingId(imageId);
        onAdd(photo, "");
        clearPreview();
        setStatus(zh ? "正在识别食材…" : "Reading Ingredients…");
        const response = await runRoutineInChat(
          conversationId,
          "(Photo)",
          undefined,
          false,
          imageId,
          language,
        );
        if (!("needsInput" in response))
          throw new Error(
            zh
              ? "照片未能进入确认步骤，请检查 Routine 设置。"
              : "Photo review is unavailable. Check the routine settings.",
          );
        const ingredients = recognisedIngredients(response.parsed);
        onAdd(
          { ...photo, annotations: response.annotations ?? [] },
          response.photoError ? "" : ingredients,
        );
        if (response.photoError || !ingredients) {
          throw new Error(
            zh
              ? "照片已保留，但没有可靠的识别结果。请手动填写食材，或移除后重试。"
              : "Photo kept, but no reliable ingredients were read. Type them below, or remove the photo and retry.",
          );
        }
      }
      setStatus(
        zh ? "食材已填入，可以直接生成。" : "Ingredients added. Ready to plan.",
      );
    } catch (reason) {
      setStatus("");
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      clearPreview();
      setReadingId(null);
      busy.current = false;
      onBusy(false);
    }
  }
  return (
    <div className="dinner-photos">
      {(photos.length > 0 || preview) && (
        <div className="dinner-photo-grid">
          {photos.map((photo) => (
            <figure key={photo.assetId} aria-busy={readingId === photo.assetId}>
              <AnnotatedPhoto
                imageId={photo.assetId}
                annotations={photo.annotations ?? null}
                compact
              />
              {readingId === photo.assetId && (
                <div className="dinner-photo-progress" role="status">
                  <span className="dinner-photo-spinner" aria-hidden="true" />
                  <span>{zh ? "识别中" : "Reading"}</span>
                </div>
              )}
              <button
                className="dinner-photo-remove"
                type="button"
                disabled={disabled}
                aria-label={(zh ? "移除 " : "Remove ") + photo.name}
                onClick={() => onRemove(photo.assetId)}
              >
                ×
              </button>
            </figure>
          ))}
          {preview && (
            <figure aria-busy="true">
              <img
                src={preview}
                alt={zh ? "正在处理照片" : "Preparing photo"}
              />
              <div className="dinner-photo-progress" role="status">
                <span className="dinner-photo-spinner" aria-hidden="true" />
                <span>{status}</span>
              </div>
            </figure>
          )}
        </div>
      )}
      <div className="dinner-photo-actions">
        {(["camera", "album"] as const).map((source) => (
          <label
            key={source}
            className={
              "dinner-photo-picker" +
              (disabled || !visionReady || photos.length >= 5
                ? " is-disabled"
                : "")
            }
          >
            <span>
              {source === "camera"
                ? zh
                  ? "拍照"
                  : "Take Photo"
                : zh
                  ? "从相册选择"
                  : "Choose Photos"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture={source === "camera" ? "environment" : undefined}
              multiple={source === "album"}
              disabled={disabled || !visionReady || photos.length >= 5}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length) void pick(files);
              }}
            />
          </label>
        ))}
      </div>
      <small>
        {visionReady
          ? zh
            ? "最多 5 张，自动压缩。点照片放大、查看标注。"
            : "Up to 5 compressed photos. Tap a photo to enlarge and see its labels."
          : zh
            ? "照片识别未就绪。可以直接输入食材；在 Models 中设置 Vision。"
            : "Photo reading is not ready. Type ingredients, or connect Vision in Models."}
      </small>
      <p role="status" aria-live="polite">
        {status}
      </p>
      {error && (
        <p className="dinner-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
