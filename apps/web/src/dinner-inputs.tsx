import { DinnerPhotos } from "./dinner-photos";
import type { DinnerInput, DinnerPhoto } from "./dinner-planner-data";

export function DinnerInputs({
  conversationId,
  language,
  draft,
  disabled,
  visionReady,
  onReading,
  onChange,
  onPhoto,
}: {
  conversationId: string;
  language: "en" | "zh";
  draft: DinnerInput;
  disabled: boolean;
  visionReady: boolean;
  onReading: (value: boolean) => void;
  onChange: (patch: Partial<DinnerInput>) => void;
  onPhoto: (photo: DinnerPhoto, ingredients: string) => void;
}) {
  const zh = language === "zh";
  return (
    <>
      {" "}
      <fieldset className="dinner-module" disabled={disabled}>
        <legend>{zh ? "家里有什么" : "What’s In The Kitchen?"}</legend>
        <DinnerPhotos
          conversationId={conversationId}
          language={language}
          photos={draft.attachments}
          disabled={disabled}
          visionReady={visionReady}
          onBusy={onReading}
          onRemove={(id) => {
            onChange({
              attachments: draft.attachments.filter((p) => p.assetId !== id),
            });
          }}
          onAdd={onPhoto}
        />
        <label>
          {zh ? "食材与数量" : "Ingredients & Quantities"}
          <textarea
            required
            maxLength={6000}
            rows={4}
            value={draft.ingredients}
            placeholder={
              zh
                ? "例如：鸡蛋 3 个、番茄 2 个、米饭 2 碗"
                : "e.g. 3 eggs, 2 tomatoes, 2 bowls of cooked rice"
            }
            onChange={(event) => {
              onChange({ ingredients: event.target.value });
            }}
          />
        </label>
        <small>
          {zh
            ? "尽量写清数量；识别重复或不准确的食材可以直接删除。"
            : "Add quantities where you can. Delete duplicate or incorrect photo suggestions."}
        </small>
      </fieldset>
    </>
  );
}
