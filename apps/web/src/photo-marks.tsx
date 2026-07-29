// THE PHOTO MARKS TOOL, client side (Oskar, 2026-07-29: "这些改动必须跟着
// 工具" — an improvement to marking belongs to the tool, so every surface that
// shows marks gets it, not just the screen it was noticed on). The server half
// is vision.ts annotateImage (what is detected and where the dot sits); this
// file is the whole of how marks are shown, edited and zoomed:
//   layoutLabels        — where each name sits so none covers another
//   PhotoLightbox       — fullscreen viewer, pinch/drag/double-tap
//   AnnotatedPhoto      — a photo with its marks (chat, journal, results)
//   AnnotatedPhotoEditor— the same marks, editable (Routine confirm cards)
// Nothing here is chat-specific. Tools listed in Settings -> Tools are real
// units in the code, not a label on a settings page.
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { ImageAnnotationItem } from "@vaenyx/contracts";

import { useI18n } from "./i18n";

// Line icon shell shared by this tool's buttons (mirrors App's LineIcon).
function LineIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="line-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

// Show / hide the marks drawn over a photo: two stacked sheets.
function IconLayers() {
  return (
    <LineIcon>
      <path d="m12 4 8 4.5-8 4.5-8-4.5z" />
      <path d="m4 14 8 4.5 8-4.5" />
    </LineIcon>
  );
}

// Fullscreen photo viewer ("点照片应该是放大,全屏可以 zoom in", Oskar
// 2026-07-28): pinch to zoom, drag to pan, double-tap to toggle 1×/2.5×,
// tap the backdrop or × to close. Pure pointer events — works with mouse
// wheel on desktop and two fingers on the phone.
function PhotoLightbox({ onClose, url }: { onClose: () => void; url: string }) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  function clampScale(scale: number): number {
    return Math.min(6, Math.max(1, scale));
  }

  function onPointerDown(event: React.PointerEvent) {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) {
        pinchStart.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          scale: transform.scale,
        };
      }
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) {
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        setTransform((current) => ({
          ...current,
          scale: clampScale(
            (pinchStart.current?.scale ?? 1) *
              (distance / (pinchStart.current?.distance ?? distance)),
          ),
        }));
      }
      return;
    }
    if (pointers.current.size === 1 && transform.scale > 1) {
      setTransform((current) => ({
        ...current,
        x: current.x + (next.x - previous.x),
        y: current.y + (next.y - previous.y),
      }));
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  // A tap anywhere closes — including on the photo, once it is back at 1×
  // (Oskar, 2026-07-29: "点击任何地方把它关闭"). While zoomed in, a single tap
  // on the image is swallowed so panning never dismisses the viewer; a double
  // tap toggles the zoom as before.
  function onTap(event: React.MouseEvent) {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      setTransform((current) =>
        current.scale > 1
          ? { scale: 1, x: 0, y: 0 }
          : { scale: 2.5, x: 0, y: 0 },
      );
      lastTap.current = 0;
      event.stopPropagation();
      return;
    }
    lastTap.current = now;
    if (transform.scale > 1) event.stopPropagation();
  }

  return createPortal(
    <div
      className="photo-lightbox"
      onClick={onClose}
      onWheel={(event) => {
        event.preventDefault();
        setTransform((current) => ({
          ...current,
          scale: clampScale(
            current.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15),
          ),
        }));
      }}
      role="dialog"
      aria-label="Photo"
    >
      <img
        alt=""
        draggable={false}
        onClick={onTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        src={url}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      />
    </div>,
    document.body,
  );
}

// A conversation photo with its marks ("在照片上把不同的东西mark出来", Oskar
// 2026-07-28): a dot on each object, a thin line to its name. One button on
// the photo runs the vision engine the first time, then toggles the overlay;
// the marks are stored server-side so a reopened chat still has them.
// Where each label sits so none covers another (Oskar, 2026-07-29: overlapping
// labels are unreadable). The dot never moves — it marks the thing. The label
// goes to the nearer side and is pushed down the column until it clears the
// one above it; a column that runs out of room wraps back to the top.
const LABEL_ROW_HEIGHT = 7; // percent of the image, ≈ one label plus a gap

export function layoutLabels(
  items: ImageAnnotationItem[],
): { item: ImageAnnotationItem; labelX: number; labelY: number; toRight: boolean }[] {
  const columns: Record<"left" | "right", number[]> = { left: [], right: [] };
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.y - b.item.y)
    .map(({ item, index }) => {
      const toRight = item.x < 55;
      const side = toRight ? "right" : "left";
      const taken = columns[side];
      let labelY = Math.min(96, Math.max(3, item.y - 5));
      let guard = 0;
      while (
        taken.some((used) => Math.abs(used - labelY) < LABEL_ROW_HEIGHT) &&
        guard < 30
      ) {
        labelY += LABEL_ROW_HEIGHT;
        if (labelY > 96) labelY = 3 + (guard % 3);
        guard += 1;
      }
      taken.push(labelY);
      return {
        item,
        index,
        labelX: toRight
          ? Math.min(item.x + 12, 96)
          : Math.max(item.x - 12, 4),
        labelY,
        toRight,
      };
    })
    .sort((a, b) => a.index - b.index)
    .map(({ item, labelX, labelY, toRight }) => ({
      item,
      labelX,
      labelY,
      toRight,
    }));
}

export function AnnotatedPhoto({
  annotations,
  imageId,
  onLoad,
}: {
  annotations: ImageAnnotationItem[] | null;
  imageId: string;
  onLoad?: () => void;
}) {
  const { t } = useI18n();
  const [overlayOn, setOverlayOn] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const items = annotations && annotations.length > 0 ? annotations : null;
  const placed = items ? layoutLabels(items) : [];

  return (
    <div className="annotated-photo">
      {zoomed ? (
        <PhotoLightbox
          onClose={() => setZoomed(false)}
          url={`/v1/vision/image/${imageId}`}
        />
      ) : null}
      <img
        alt=""
        className="message-photo"
        onClick={() => setZoomed(true)}
        onLoad={onLoad}
        src={`/v1/vision/image/${imageId}`}
      />
      {items && overlayOn ? (
        <>
          <svg
            aria-hidden="true"
            className="annotate-lines"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {placed.map(({ item, labelX, labelY }, index) => (
              <line
                key={index}
                vectorEffect="non-scaling-stroke"
                x1={item.x}
                x2={labelX}
                y1={item.y}
                y2={labelY}
              />
            ))}
          </svg>
          {placed.map(({ item, labelX, labelY, toRight }, index) => (
            <span key={index}>
              <span
                className="annotate-dot"
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
              />
              <span
                className={
                  toRight
                    ? "annotate-label"
                    : "annotate-label annotate-label--left"
                }
                style={{ left: `${labelX}%`, top: `${labelY}%` }}
              >
                {item.name}
              </span>
            </span>
          ))}
        </>
      ) : null}
      {/* The button exists ONLY when there is a layer to show or hide (Oskar,
          2026-07-29): a plain photo — one you sent, one Vaenyx drew — carries
          no controls at all. It is a layers toggle, never a magnifier: tapping
          the photo itself is what zooms. */}
      {items ? (
        <button
          aria-label={overlayOn ? t("photo.marks.hide") : t("photo.marks.show")}
          className="voice-bubble-play annotate-button"
          onClick={() => setOverlayOn((current) => !current)}
          title={overlayOn ? t("photo.marks.hide") : t("photo.marks.show")}
          type="button"
        >
          <IconLayers />
        </button>
      ) : null}
    </div>
  );
}

// The confirm card's marked photo, EDITABLE ("直接在图片上改文字…添加或者删除",
// Oskar 2026-07-28): tap a label to rename or delete that mark, + Add Mark
// then tap the photo to place a new one. The marks ARE the input — the
// picture is the interface, not an illustration of it.
export function AnnotatedPhotoEditor({
  imageId,
  marks,
  onChange,
}: {
  imageId: string;
  marks: ImageAnnotationItem[];
  onChange: (next: ImageAnnotationItem[]) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  function addAt(event: React.MouseEvent<HTMLDivElement>) {
    if (!adding) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x =
      Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10;
    const y =
      Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10;
    onChange([
      ...marks,
      { name: "", x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) },
    ]);
    setSelected(marks.length);
    setAdding(false);
  }

  const current = selected !== null ? marks[selected] : undefined;
  const placed = layoutLabels(marks);

  return (
    <div className="annotate-editor">
      <div
        className={
          adding ? "annotated-photo annotate-editor--adding" : "annotated-photo"
        }
        onClick={addAt}
      >
        <img
          alt=""
          className="message-photo"
          src={`/v1/vision/image/${imageId}`}
        />
        {/* The SAME label layout as a chat photo (layoutLabels): marks are one
            thing with one look, whether you are reading them or editing them. */}
        <svg
          aria-hidden="true"
          className="annotate-lines"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {placed.map(({ item, labelX, labelY }, index) => (
            <line
              key={index}
              vectorEffect="non-scaling-stroke"
              x1={item.x}
              x2={labelX}
              y1={item.y}
              y2={labelY}
            />
          ))}
        </svg>
        {placed.map(({ item, labelX, labelY, toRight }, index) => {
          return (
            <span key={index}>
              <span
                className="annotate-dot"
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
              />
              <button
                className={
                  (toRight
                    ? "annotate-label"
                    : "annotate-label annotate-label--left") +
                  (selected === index ? " annotate-label--selected" : "")
                }
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(index);
                  setAdding(false);
                }}
                style={{ left: `${labelX}%`, top: `${labelY}%` }}
                type="button"
              >
                {item.name || "…"}
              </button>
            </span>
          );
        })}
      </div>
      {current ? (
        <div className="annotate-edit-row">
          <input
            autoFocus
            maxLength={40}
            onChange={(event) =>
              onChange(
                marks.map((item, index) =>
                  index === selected
                    ? { ...item, name: event.target.value }
                    : item,
                ),
              )
            }
            value={current.name}
          />
          <button
            aria-label={t("marks.delete")}
            className="text-button"
            onClick={() => {
              onChange(marks.filter((_, index) => index !== selected));
              setSelected(null);
            }}
            type="button"
          >
            {t("marks.delete")}
          </button>
          <button
            className="secondary-button"
            onClick={() => setSelected(null)}
            type="button"
          >
            {t("marks.done")}
          </button>
        </div>
      ) : (
        <div className="annotate-edit-row">
          <button
            className="text-button"
            onClick={() => setAdding((value) => !value)}
            type="button"
          >
            {adding ? t("marks.addCancel") : t("marks.add")}
          </button>
          <span className="text-faint">
            {adding ? t("marks.addHint") : t("marks.editHint")}
          </span>
        </div>
      )}
    </div>
  );
}
