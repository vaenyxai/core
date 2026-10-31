import { useRef, useState } from "react";
import { uploadPhoto, uploadDocument, readHouseholdSource } from "./api";
import { downscalePhoto } from "./photo-upload";
import { AnnotatedPhoto } from "./photo-marks";
import {
  householdScenes,
  type HouseholdKind,
  type HouseholdSource,
} from "./household-data";
export function sourceDownload(source: HouseholdSource) {
  return `/v1/household/documents/${encodeURIComponent(source.assetId)}?name=${encodeURIComponent(source.name)}`;
}
export function SourcePreview({ source }: { source: HouseholdSource }) {
  return source.kind === "image" ? (
    <AnnotatedPhoto
      imageId={source.assetId}
      annotations={source.annotations}
      compact
    />
  ) : (
    <a className="household-document" href={sourceDownload(source)} download>
      {source.name}
    </a>
  );
}
export function HouseholdSources({
  kind,
  language,
  sources,
  disabled,
  onChange,
  onRemove,
  onBusy,
}: {
  kind: HouseholdKind;
  language: "en" | "zh";
  sources: HouseholdSource[];
  disabled: boolean;
  onChange: (source: HouseholdSource) => void;
  onRemove: (id: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const zh = language === "zh",
    scene = householdScenes[kind];
  const [role, setRole] = useState<string>(scene.roles[0][0]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState<string | null>(null);
  const running = useRef(false);
  async function read(source: HouseholdSource) {
    setReading(source.assetId);
    setStatus(zh ? "正在读取资料…" : "Reading Source…");
    const result = await readHouseholdSource(
      source.assetId,
      source.kind,
      language,
    );
    onChange({ ...source, text: result.text, annotations: result.annotations });
    setStatus(
      result.engineNote ||
        (zh ? "资料已读出，可以直接整理。" : "Source Read. Ready To Organise."),
    );
  }
  async function retry(source: HouseholdSource) {
    if (running.current || disabled) return;
    running.current = true;
    onBusy(true);
    setError("");
    try {
      await read(source);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    } finally {
      running.current = false;
      onBusy(false);
      setReading(null);
    }
  }
  async function pick(files: File[]) {
    if (running.current || disabled) return;
    if (sources.length + files.length > 5) {
      setError(zh ? "最多 5 份资料。" : "Add up to 5 sources.");
      return;
    }
    running.current = true;
    onBusy(true);
    setError("");
    try {
      for (const file of files) {
        const image = ["image/jpeg", "image/png", "image/webp"].includes(
          file.type,
        );
        if (
          (!image && !/\.(pdf|txt|md)$/i.test(file.name)) ||
          file.size > 20 * 1024 * 1024
        )
          throw new Error(
            zh
              ? "请选择 20 MB 以内的 JPG、PNG、WebP、PDF 或文字文件。"
              : "Use JPG, PNG, WebP, PDF or text files under 20 MB.",
          );
        setStatus(zh ? "正在准备并上传…" : "Preparing And Uploading…");
        const assetId = image
          ? (await uploadPhoto(await downscalePhoto(file, true))).imageId
          : (await uploadDocument(file, language)).documentId;
        const source: HouseholdSource = {
          assetId,
          name: file.name.slice(0, 200),
          kind: image ? "image" : "document",
          role,
          text: "",
          annotations: [],
        };
        onChange(source);
        await read(source);
        setReading(null);
      }
    } catch (e) {
      setStatus("");
      setError(
        (e instanceof Error ? e.message : String(e)) +
          (zh
            ? " 已上传的资料会保留，可补写文字或重试。"
            : " Uploaded sources are kept. Add text or retry."),
      );
    } finally {
      running.current = false;
      setReading(null);
      onBusy(false);
    }
  }
  return (
    <div className="household-sources">
      {scene.roles.length > 1 && (
        <label>
          {zh ? "资料类型" : "Source Type"}
          <select
            value={role}
            disabled={disabled}
            onChange={(e) => setRole(e.target.value)}
          >
            {scene.roles.map((r) => (
              <option key={r[0]} value={r[0]}>
                {r[zh ? 2 : 1]}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="dinner-photo-actions">
        {["camera", "files"].map((origin) => (
          <label
            key={origin}
            className={
              "dinner-photo-picker" +
              (disabled || sources.length >= 5 ? " is-disabled" : "")
            }
          >
            <span>
              {origin === "camera"
                ? zh
                  ? "拍照"
                  : "Take Photo"
                : zh
                  ? "照片或文件"
                  : "Photos Or Files"}
            </span>
            <input
              type="file"
              accept={
                origin === "camera"
                  ? "image/jpeg,image/png,image/webp"
                  : "image/jpeg,image/png,image/webp,.pdf,.txt,.md"
              }
              capture={origin === "camera" ? "environment" : undefined}
              multiple={origin !== "camera"}
              disabled={disabled || sources.length >= 5}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length) void pick(files);
              }}
            />
          </label>
        ))}
      </div>
      <small>
        {zh
          ? "最多 5 份。照片自动压缩；文字可修改。长文件请只放相关部分。"
          : "Up to 5 sources. Photos are compressed; extracted text is editable. Use relevant sections of long files."}
      </small>
      <p role="status" aria-live="polite">
        {status}
      </p>
      {error && (
        <p role="alert" className="dinner-error">
          {error}
        </p>
      )}
      {sources.map((source) => (
        <article
          className="household-source-card"
          key={source.assetId}
          aria-busy={reading === source.assetId}
        >
          <header>
            <strong>
              {scene.roles.find((r) => r[0] === source.role)?.[zh ? 2 : 1] ??
                source.role}
            </strong>
            <button
              type="button"
              className="text-button"
              disabled={disabled}
              aria-label={(zh ? "移除 " : "Remove ") + source.name}
              onClick={() => onRemove(source.assetId)}
            >
              ×
            </button>
          </header>
          <SourcePreview source={source} />
          {reading === source.assetId && (
            <p role="status">
              <span className="dinner-photo-spinner" aria-hidden="true" />{" "}
              {zh ? "正在识别…" : "Reading…"}
            </p>
          )}
          <details open={!source.text && reading !== source.assetId}>
            <summary>{zh ? "查看或修改文字" : "View Or Edit Text"}</summary>
            <label>
              {source.name}
              <textarea
                value={source.text}
                maxLength={12000}
                rows={5}
                disabled={disabled}
                onChange={(e) => onChange({ ...source, text: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="text-button"
              disabled={disabled}
              onClick={() => void retry(source)}
            >
              {zh ? "重新识别" : "Read Again"}
            </button>
          </details>
        </article>
      ))}
    </div>
  );
}
