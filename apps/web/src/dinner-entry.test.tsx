import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DinnerPhotos } from "./dinner-photos";
import {
  existingRoutineConversation,
  suggestedDinner,
} from "./suggested-routines";
import type { LibraryRoutineSummary, VaenyxThread } from "@vaenyx/contracts";

const dinner = {
  id: "vaenyx-dinner-planner",
  view: { version: 1, layout: "dinner-planner-v1" },
} as LibraryRoutineSummary;

describe("Dinner entry points", () => {
  it("requests rear camera for capture, while the album permits multiple files without capture", () => {
    const html = renderToStaticMarkup(
      <DinnerPhotos
        conversationId="test"
        language="en"
        photos={[]}
        disabled={false}
        visionReady
        onAdd={() => {}}
        onRemove={() => {}}
        onBusy={() => {}}
      />,
    );
    const inputs = html.match(/<input[^>]+>/g)!;
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toContain('capture="environment"');
    expect(inputs[0]).not.toContain("multiple");
    expect(inputs[1]).not.toContain("capture");
    expect(inputs[1]).toContain("multiple");
    expect(html).toContain("Take Photo");
    expect(html).toContain("Choose Photos");
  });
  it.each([
    { disabled: true, visionReady: true },
    { disabled: false, visionReady: false },
  ])("blocks both upload sources when unavailable: %j", (availability) => {
    const html = renderToStaticMarkup(
      <DinnerPhotos
        conversationId="test"
        language="zh"
        photos={[]}
        {...availability}
        onAdd={() => {}}
        onRemove={() => {}}
        onBusy={() => {}}
      />,
    );
    expect(html.match(/<input[^>]+disabled=""/g)).toHaveLength(2);
  });
  it("recommends only installed modular Dinner that remains on the shelf", () => {
    expect(suggestedDinner([dinner], [])).toBe(dinner);
    expect(suggestedDinner([dinner], [dinner.id])).toBeUndefined();
    expect(suggestedDinner([], [])).toBeUndefined();
    expect(suggestedDinner([{ ...dinner, view: null }], [])).toBeUndefined();
    expect(
      suggestedDinner([{ ...dinner, id: "old-dinner" }], []),
    ).toBeUndefined();
  });
  it("reuses the most recent active Dinner without reviving archived conversations", () => {
    const threads = [
      {
        routineId: dinner.id,
        status: "active",
        conversationId: "older",
        updatedAt: "2026-01-01",
      },
      {
        routineId: dinner.id,
        status: "archived",
        conversationId: "archived",
        updatedAt: "2026-03-01",
      },
      {
        routineId: dinner.id,
        status: "active",
        conversationId: "latest",
        updatedAt: "2026-02-01",
      },
      {
        routineId: "other",
        status: "active",
        conversationId: "other",
        updatedAt: "2026-04-01",
      },
    ] as VaenyxThread[];
    expect(existingRoutineConversation(threads, dinner.id)).toBe("latest");
    expect(
      existingRoutineConversation(
        threads.filter((t) => t.status === "archived"),
        dinner.id,
      ),
    ).toBeNull();
  });
});
