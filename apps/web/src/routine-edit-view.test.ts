import { describe, expect, it } from "vitest";
import { editedRoutineView, withDinnerModules } from "./routine-edit-view";
describe("Routine display edits", () => {
  const view = {
    version: 1,
    layout: "dinner-planner-v1",
    footnote: "warranty-record",
    fields: [
      {
        key: "ingredients",
        as: "table",
        label: "Ingredients",
        labelZh: "食材",
        columns: [{ key: "name", label: "Name", labelZh: "名称" }],
      },
    ],
  };
  it("retains modular layout, translations, columns and fixed footnotes through a rename", () => {
    expect(
      editedRoutineView(view, [
        { key: "ingredients", as: "table", label: "Ingredients" },
      ]),
    ).toEqual(view);
  });
  it("changes only requested display fields and removes discarded rows", () => {
    const next = editedRoutineView(view, [
      { key: "ingredients", as: "table", label: "" },
    ]) as typeof view;
    expect(next.fields[0]).not.toHaveProperty("label");
    expect(next.fields[0]?.columns).toEqual(view.fields[0]?.columns);
    expect(next.layout).toBe(view.layout);
    expect(editedRoutineView(view, [])).toBeNull();
  });
  it("restores the Dinner module marker without changing existing fields", () => {
    expect(
      withDinnerModules({ fields: view.fields, footnote: view.footnote }),
    ).toEqual(view);
  });
});
