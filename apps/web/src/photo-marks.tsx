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
import { useEffect, useMemo, useRef, useState } from "react";
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
//
// The marks come with it ("单击全屏幕的时候,所有标签也要一起全屏幕,而且带着
// 那个去标签的按钮,这样子可以 zoom in 去看标签", Oskar 2026-07-29): the photo
// and its overlay are one stage that zooms together, so a label too small to
// read in the chat is read by zooming into it. The layers button rides along
// and stays its own size — it is a control, not part of the picture.
function PhotoLightbox({
  frame,
  marks,
  onClose,
  onToggleOverlay,
  overlayOn,
  url,
}: {
  frame: { width: number; height: number };
  marks: ImageAnnotationItem[] | null;
  onClose: () => void;
  onToggleOverlay: () => void;
  overlayOn: boolean;
  url: string;
}) {
  const { t } = useI18n();
  const placed = useMemo(
    () => (marks ? layoutLabels(marks, frame) : []),
    [marks, frame],
  );
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
      <div
        className="photo-lightbox-stage"
        onClick={onTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <img alt="" draggable={false} src={url} />
        {marks && overlayOn ? <MarksOverlay placed={placed} /> : null}
      </div>
      {marks ? (
        <button
          aria-label={overlayOn ? t("photo.marks.hide") : t("photo.marks.show")}
          className="voice-bubble-play annotate-button annotate-button--full"
          onClick={(event) => {
            event.stopPropagation();
            onToggleOverlay();
          }}
          title={overlayOn ? t("photo.marks.hide") : t("photo.marks.show")}
          type="button"
        >
          <IconLayers />
        </button>
      ) : null}
    </div>,
    document.body,
  );
}

// A conversation photo with its marks ("在照片上把不同的东西mark出来", Oskar
// 2026-07-28): a dot on each object, a thin line to its name. One button on
// the photo runs the vision engine the first time, then toggles the overlay;
// the marks are stored server-side so a reopened chat still has them.
//
// WHERE THE NAMES GO. Oskar's rule, 2026-07-29, is absolute: no dot, no leader
// line and no label may touch ANY other dot, line or label. An earlier version
// compared labels only to labels, and a name landed on a neighbour's dot and
// line — which reads as one mark when it is two.
//
// So the layout is real geometry, worked in PIXELS of the photo as drawn: a
// percentage of the width and a percentage of the height are different
// distances on a portrait photo, and "do these touch" is a question about
// distance. Each mark is three things that must all stay clear — the dot (which
// never moves, it IS the thing), the label box, and the line between them. The
// line runs from the dot to the box's own edge, meeting it exactly.
const DEFAULT_FRAME = { width: 340, height: 453 }; // a phone photo in the chat
const LABEL_FONT_SIZE = 13;
const LABEL_HEIGHT = 24; // the pill: text plus its padding and border
const LABEL_SIDE_PADDING = 18; // both sides together
const DOT_RADIUS = 7; // the 10px dot plus its white ring
const CLEARANCE = 5; // px of empty space demanded between any two things
const LINE_GAPS = [18, 26, 36, 48, 62, 80, 100]; // name-to-dot distances tried
const DROP_STEP = 15; // how finely a name slides up or down looking for room
const DROP_STEPS = 24; // how far up or down it will go, in those steps
const REPLACEMENT_SWEEPS = 4; // how many times each name may reconsider

interface Point {
  x: number;
  y: number;
}
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface Segment {
  a: Point;
  b: Point;
}

function grow(box: Box, by: number): Box {
  return { x0: box.x0 - by, y0: box.y0 - by, x1: box.x1 + by, y1: box.y1 + by };
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

function pointInBox(point: Point, box: Box): boolean {
  return (
    point.x > box.x0 && point.x < box.x1 && point.y > box.y0 && point.y < box.y1
  );
}

function turns(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(first: Segment, second: Segment): boolean {
  const d1 = turns(first.a, first.b, second.a);
  const d2 = turns(first.a, first.b, second.b);
  const d3 = turns(second.a, second.b, first.a);
  const d4 = turns(second.a, second.b, first.b);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function segmentTouchesBox(segment: Segment, box: Box): boolean {
  if (pointInBox(segment.a, box) || pointInBox(segment.b, box)) return true;
  const corners: Point[] = [
    { x: box.x0, y: box.y0 },
    { x: box.x1, y: box.y0 },
    { x: box.x1, y: box.y1 },
    { x: box.x0, y: box.y1 },
  ];
  for (let side = 0; side < 4; side += 1) {
    const edge = { a: corners[side]!, b: corners[(side + 1) % 4]! };
    if (segmentsCross(segment, edge)) return true;
  }
  return false;
}

function distanceToSegment(point: Point, segment: Segment): number {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  const lengthSquared = dx * dx + dy * dy;
  const along =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - segment.a.x) * dx + (point.y - segment.a.y) * dy) /
              lengthSquared,
          ),
        );
  return Math.hypot(
    point.x - (segment.a.x + along * dx),
    point.y - (segment.a.y + along * dy),
  );
}
const WIDE_CHARACTER_RANGE = /[ᄀ-ᇿ⺀-꓏ꥠ-꥿가-퟿豈-﫿︐-﹯＀-｠￠-￦]/;

// Chinese characters take a full em, latin letters a little over half.
function labelPixelWidth(name: string): number {
  let width = LABEL_SIDE_PADDING;
  for (const character of name) {
    width += WIDE_CHARACTER_RANGE.test(character)
      ? LABEL_FONT_SIZE
      : LABEL_FONT_SIZE * 0.56;
  }
  return width;
}

export interface PlacedLabel {
  item: ImageAnnotationItem;
  labelX: number; // percent — the box edge the leader line meets
  labelY: number; // percent — the middle of the box
  toRight: boolean;
}

export function layoutLabels(
  items: ImageAnnotationItem[],
  frame: { width: number; height: number } = DEFAULT_FRAME,
): PlacedLabel[] {
  const { width, height } = frame;
  const dots: Point[] = items.map((item) => ({
    x: (item.x / 100) * width,
    y: (item.y / 100) * height,
  }));
  // One slot per mark, filled in as it is placed and emptied again when a mark
  // is given another go.
  const boxes: (Box | null)[] = items.map(() => null);
  const lines: (Segment | null)[] = items.map(() => null);
  const rightward: boolean[] = items.map(() => true);

  // Every spot a name could go: either side of its dot, a range of distances,
  // and sliding up or down the photo.
  const spots: { toRight: boolean; gap: number; drop: number }[] = [];
  for (const toRight of [true, false]) {
    for (const gap of LINE_GAPS) {
      for (let step = -DROP_STEPS; step <= DROP_STEPS; step += 1) {
        spots.push({ toRight, gap, drop: step * DROP_STEP });
      }
    }
  }

  // What each kind of contact costs. Rather than a run of passes that give up
  // one rule at a time, every spot is priced and the cheapest wins: a photo
  // with room lands on zero — nothing touching anything — and a photo marked
  // wall to wall still gets its best possible arrangement instead of a shrug.
  // The order of these numbers IS the priority: two names on top of each other
  // is the worst thing that can happen, two lines crossing the least bad.
  const COST_NAME_ON_NAME = 1000;
  const COST_NAME_ON_DOT = 900;
  const COST_LINE_THROUGH_NAME = 500;
  const COST_LINE_ON_DOT = 200;
  const COST_LINES_CROSS = 60;
  const COST_STRAY = 0.02; // per pixel away from the dot: the tie-breaker

  // Put one name in its cheapest spot, given wherever the others currently are.
  // Returns what the spot cost in CONTACT alone, so the sweep below can tell a
  // tidy photo (zero) from one that is still fighting for room.
  function place(index: number): number {
    const item = items[index]!;
    const dot = dots[index]!;
    const labelWidth = Math.min(labelPixelWidth(item.name), width - 8);
    // The near side is where a name belongs; crossing over its own dot to the
    // far side is a cost, paid when the near side is full.
    const nearSide = item.x < 55;
    let chosen: { box: Box; line: Segment; toRight: boolean } | null = null;
    let cheapest = Number.POSITIVE_INFINITY;
    let contact = 0;

    for (const { toRight, gap, drop } of spots) {
      const middle = Math.min(
        height - LABEL_HEIGHT / 2 - 2,
        Math.max(LABEL_HEIGHT / 2 + 2, dot.y + drop),
      );
      const edge = toRight ? dot.x + gap : dot.x - gap;
      const box: Box = {
        x0: toRight ? edge : edge - labelWidth,
        y0: middle - LABEL_HEIGHT / 2,
        x1: toRight ? edge + labelWidth : edge,
        y1: middle + LABEL_HEIGHT / 2,
      };
      // The whole pill stays on the photo, not just its anchor point.
      if (box.x0 < 2 || box.x1 > width - 2) continue;
      const line: Segment = { a: dot, b: { x: edge, y: middle } };
      const room = grow(box, CLEARANCE);

      let touching = 0;
      for (let other = 0; other < dots.length; other += 1) {
        if (other === index) continue;
        const neighbour = dots[other]!;
        if (pointInBox(neighbour, grow(box, CLEARANCE + DOT_RADIUS))) {
          touching += COST_NAME_ON_DOT;
        } else if (
          distanceToSegment(neighbour, line) <
          DOT_RADIUS + CLEARANCE
        ) {
          touching += COST_LINE_ON_DOT;
        }
        const otherBox = boxes[other];
        if (otherBox) {
          if (boxesOverlap(room, otherBox)) touching += COST_NAME_ON_NAME;
          if (segmentTouchesBox(line, grow(otherBox, CLEARANCE))) {
            touching += COST_LINE_THROUGH_NAME;
          }
        }
        const otherLine = lines[other];
        if (otherLine) {
          if (segmentTouchesBox(otherLine, room)) {
            touching += COST_LINE_THROUGH_NAME;
          }
          if (segmentsCross(line, otherLine)) touching += COST_LINES_CROSS;
        }
      }

      const cost =
        touching +
        (Math.abs(middle - dot.y) + gap) * COST_STRAY +
        (toRight === nearSide ? 0 : 4);
      if (cost < cheapest) {
        cheapest = cost;
        contact = touching;
        chosen = { box, line, toRight };
      }
    }

    // Only reachable when the name is wider than the photo it belongs to.
    if (!chosen) {
      const edge = nearSide ? dot.x + LINE_GAPS[0]! : dot.x - LINE_GAPS[0]!;
      chosen = {
        box: {
          x0: nearSide ? edge : edge - labelWidth,
          y0: dot.y - LABEL_HEIGHT / 2,
          x1: nearSide ? edge + labelWidth : edge,
          y1: dot.y + LABEL_HEIGHT / 2,
        },
        line: { a: dot, b: { x: edge, y: dot.y } },
        toRight: nearSide,
      };
    }
    boxes[index] = chosen.box;
    lines[index] = chosen.line;
    rightward[index] = chosen.toRight;
    return contact;
  }

  // What the whole arrangement costs in contact, measured on the finished
  // picture rather than on the order it was built in.
  function contactTotal(): number {
    let total = 0;
    for (let a = 0; a < items.length; a += 1) {
      const box = boxes[a];
      const line = lines[a];
      if (!box || !line) continue;
      for (let b = 0; b < items.length; b += 1) {
        if (a === b) continue;
        const neighbour = dots[b]!;
        if (pointInBox(neighbour, grow(box, DOT_RADIUS))) {
          total += COST_NAME_ON_DOT;
        } else if (distanceToSegment(neighbour, line) < DOT_RADIUS) {
          total += COST_LINE_ON_DOT;
        }
        const otherBox = boxes[b];
        const otherLine = lines[b];
        if (!otherBox || !otherLine || b < a) continue;
        if (boxesOverlap(box, otherBox)) total += COST_NAME_ON_NAME;
        if (
          segmentTouchesBox(line, otherBox) ||
          segmentTouchesBox(otherLine, box)
        ) {
          total += COST_LINE_THROUGH_NAME;
        }
        if (segmentsCross(line, otherLine)) total += COST_LINES_CROSS;
      }
    }
    return total;
  }

  // The first name placed chose against an empty photo and the last against a
  // full one, so everyone gets more goes once their neighbours exist — and each
  // sweep works in a different order, because who picks first decides who ends
  // up with nowhere to stand. The best arrangement seen is the one kept.
  const byHeight = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.y - b.item.y)
    .map(({ index }) => index);
  const byLength = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.name.length - a.item.name.length)
    .map(({ index }) => index);
  const orders = [byHeight, byLength, [...byHeight].reverse(), byLength];

  let best = {
    boxes: [...boxes],
    lines: [...lines],
    rightward: [...rightward],
  };
  let bestTotal = Number.POSITIVE_INFINITY;
  const remember = () => {
    const total = contactTotal();
    if (total < bestTotal) {
      bestTotal = total;
      best = {
        boxes: [...boxes],
        lines: [...lines],
        rightward: [...rightward],
      };
    }
    return total;
  };

  for (const index of byHeight) place(index);
  remember();
  for (let sweep = 0; sweep < REPLACEMENT_SWEEPS && bestTotal > 0; sweep += 1) {
    for (const index of orders[sweep % orders.length]!) {
      boxes[index] = null;
      lines[index] = null;
      place(index);
    }
    remember();
  }
  boxes.splice(0, boxes.length, ...best.boxes);
  lines.splice(0, lines.length, ...best.lines);
  rightward.splice(0, rightward.length, ...best.rightward);

  return items.map((item, index) => ({
    item,
    labelX: (lines[index]!.b.x / width) * 100,
    labelY: (lines[index]!.b.y / height) * 100,
    toRight: rightward[index]!,
  }));
}

// Every pair of marks that ends up actually touching, as "name / name". The
// layout aims for an empty list and the tests hold it to that; measuring the
// result rather than trusting the placement keeps the rule checkable in one
// place. Thresholds here are the bare touch — the layout demands CLEARANCE on
// top, so a healthy photo has room to spare.
export function markCollisions(
  items: ImageAnnotationItem[],
  frame: { width: number; height: number } = DEFAULT_FRAME,
): string[] {
  const parts = layoutLabels(items, frame).map((mark) => {
    const labelWidth = Math.min(
      labelPixelWidth(mark.item.name),
      frame.width - 8,
    );
    const edgeX = (mark.labelX / 100) * frame.width;
    const middleY = (mark.labelY / 100) * frame.height;
    const dot: Point = {
      x: (mark.item.x / 100) * frame.width,
      y: (mark.item.y / 100) * frame.height,
    };
    return {
      name: mark.item.name,
      dot,
      box: {
        x0: mark.toRight ? edgeX : edgeX - labelWidth,
        y0: middleY - LABEL_HEIGHT / 2,
        x1: mark.toRight ? edgeX + labelWidth : edgeX,
        y1: middleY + LABEL_HEIGHT / 2,
      },
      line: { a: dot, b: { x: edgeX, y: middleY } },
    };
  });

  const touching: string[] = [];
  for (let a = 0; a < parts.length; a += 1) {
    for (let b = a + 1; b < parts.length; b += 1) {
      const first = parts[a]!;
      const second = parts[b]!;
      const reason = boxesOverlap(first.box, second.box)
        ? "name on name"
        : pointInBox(second.dot, grow(first.box, DOT_RADIUS)) ||
            pointInBox(first.dot, grow(second.box, DOT_RADIUS))
          ? "name on dot"
          : segmentTouchesBox(first.line, second.box) ||
              segmentTouchesBox(second.line, first.box)
            ? "line through name"
            : distanceToSegment(second.dot, first.line) < DOT_RADIUS ||
                distanceToSegment(first.dot, second.line) < DOT_RADIUS
              ? "line on dot"
              : segmentsCross(first.line, second.line)
                ? "lines cross"
                : null;
      if (reason) {
        touching.push(`${first.name} / ${second.name}: ${reason}`);
      }
    }
  }
  return touching;
}

// The photo as it is actually drawn, which is what the layout measures against.
// The chat size is the tight one, so it is the size used everywhere: fullscreen
// shows the same arrangement with more room around it, never less.
function usePhotoFrame() {
  const ref = useRef<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState(DEFAULT_FRAME);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      setFrame((current) =>
        Math.abs(current.width - box.width) < 1 &&
        Math.abs(current.height - box.height) < 1
          ? current
          : { width: box.width, height: box.height },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { frame, ref };
}

// The marks themselves — dot, leader line, name. One component, so a photo in
// the chat and the same photo fullscreen cannot drift apart.
function MarksOverlay({ placed }: { placed: PlacedLabel[] }) {
  return (
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
              toRight ? "annotate-label" : "annotate-label annotate-label--left"
            }
            style={{ left: `${labelX}%`, top: `${labelY}%` }}
          >
            {item.name}
          </span>
        </span>
      ))}
    </>
  );
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
  const { frame, ref } = usePhotoFrame();
  const items = annotations && annotations.length > 0 ? annotations : null;
  // Working out where a dozen names can stand without touching is real work;
  // it is done when the marks or the photo's size change, not on every render.
  const placed = useMemo(
    () => (items ? layoutLabels(items, frame) : []),
    [items, frame],
  );

  return (
    <div className="annotated-photo">
      {zoomed ? (
        <PhotoLightbox
          frame={frame}
          marks={items}
          onClose={() => setZoomed(false)}
          onToggleOverlay={() => setOverlayOn((current) => !current)}
          overlayOn={overlayOn}
          url={`/v1/vision/image/${imageId}`}
        />
      ) : null}
      <img
        alt=""
        className="message-photo"
        onClick={() => setZoomed(true)}
        onLoad={onLoad}
        ref={ref}
        src={`/v1/vision/image/${imageId}`}
      />
      {items && overlayOn ? <MarksOverlay placed={placed} /> : null}
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
  // Which dot the finger is currently carrying. The vision model gets an
  // item's rough position, not its exact one (Oskar, 2026-08-16: "有些很边"),
  // so a mark that landed beside its thing is simply dragged onto it.
  const [dragging, setDragging] = useState<number | null>(null);
  const { frame, ref } = usePhotoFrame();

  function pointToPercent(
    element: HTMLElement,
    clientX: number,
    clientY: number,
  ): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((clientY - rect.top) / rect.height) * 1000) / 10;
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
  }

  function dragTo(event: React.PointerEvent<HTMLDivElement>) {
    if (dragging === null) return;
    event.preventDefault();
    const at = pointToPercent(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    onChange(
      marks.map((item, index) =>
        index === dragging ? { ...item, x: at.x, y: at.y } : item,
      ),
    );
  }

  function addAt(event: React.MouseEvent<HTMLDivElement>) {
    if (!adding) return;
    const at = pointToPercent(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    onChange([...marks, { name: "", x: at.x, y: at.y }]);
    setSelected(marks.length);
    setAdding(false);
  }

  const current = selected !== null ? marks[selected] : undefined;
  const placed = useMemo(() => layoutLabels(marks, frame), [marks, frame]);

  return (
    <div className="annotate-editor">
      <div
        className={
          adding ? "annotated-photo annotate-editor--adding" : "annotated-photo"
        }
        onClick={addAt}
        onPointerCancel={() => setDragging(null)}
        onPointerMove={dragTo}
        onPointerUp={() => setDragging(null)}
      >
        <img
          alt=""
          className="message-photo"
          ref={ref}
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
                className={
                  dragging === index
                    ? "annotate-dot annotate-dot--draggable annotate-dot--dragging"
                    : "annotate-dot annotate-dot--draggable"
                }
                onPointerDown={(event) => {
                  event.stopPropagation();
                  // Keep the move events on the photo frame (which measures
                  // the percentages) instead of capturing them to the dot.
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                  setDragging(index);
                  setSelected(index);
                  setAdding(false);
                }}
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
