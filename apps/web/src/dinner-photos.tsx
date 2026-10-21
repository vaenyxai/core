import { useRef, useState } from "react";
import { runRoutineInChat, uploadPhoto } from "./api";
import { recognisedIngredients, type DinnerPhoto } from "./dinner-planner-data";
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
        setStatus(zh ? "正在识别：" + file.name : "Reading " + file.name);
        const blob = await downscalePhoto(file);
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
        onAdd(photo, "");
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
        onAdd(photo, response.photoError ? "" : ingredients);
        if (response.photoError || !ingredients) {
          throw new Error(
            zh
              ? "照片已保留，但没有可靠的识别结果。请手动填写食材，或移除后重试。"
              : "Photo kept, but no reliable ingredients were read. Type them below, or remove the photo and retry.",
          );
        }
      }
      setStatus(
        zh
          ? "已加入识别建议，请在下方纠正食材和数量。"
          : "Suggestions added. Review the ingredients and quantities below.",
      );
    } catch (reason) {
      setStatus("");
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      busy.current = false;
      onBusy(false);
    }
  }
  return (
    <div className="dinner-photos">
      {photos.length > 0 && (
        <div className="dinner-photo-grid">
          {photos.map((photo) => (
            <figure key={photo.assetId}>
              <a
                href={"/v1/vision/image/" + encodeURIComponent(photo.assetId)}
                target="_blank"
                rel="noreferrer"
                aria-label={zh ? "查看 " + photo.name : "View " + photo.name}
              >
                <img
                  src={"/v1/vision/image/" + encodeURIComponent(photo.assetId)}
                  alt={photo.name}
                />
              </a>
              <button
                type="button"
                disabled={disabled}
                aria-label={(zh ? "移除 " : "Remove ") + photo.name}
                onClick={() => onRemove(photo.assetId)}
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}
      <label
        className={
          "dinner-photo-picker" +
          (disabled || !visionReady || photos.length >= 5 ? " is-disabled" : "")
        }
      >
        <span>{zh ? "＋ 添加食材照片" : "+ Add Ingredient Photos"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || !visionReady || photos.length >= 5}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void pick(files);
          }}
        />
      </label>
      <small>
        {visionReady
          ? zh
            ? "最多 5 张。识别内容需要你确认，不会自动生成晚餐。"
            : "Up to 5 photos. Review what was read before planning dinner."
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
