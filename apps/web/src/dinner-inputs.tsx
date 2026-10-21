import { DinnerPhotos } from "./dinner-photos";
import type { DinnerInput, DinnerPhoto } from "./dinner-planner-data";

export function DinnerInputs({
  conversationId,
  language,
  draft,
  disabled,
  visionReady,
  reviewed,
  onReviewed,
  onReading,
  onChange,
  onPhoto,
}: {
  conversationId: string;
  language: "en" | "zh";
  draft: DinnerInput;
  disabled: boolean;
  visionReady: boolean;
  reviewed: boolean;
  onReviewed: (value: boolean) => void;
  onReading: (value: boolean) => void;
  onChange: (patch: Partial<DinnerInput>) => void;
  onPhoto: (photo: DinnerPhoto, ingredients: string) => void;
}) {
  const zh = language === "zh";
  return (
    <>
      {" "}
      <fieldset className="dinner-module" disabled={disabled}>
        <legend>
          <span>1</span>
          {zh ? "家里有什么" : "What’s In The Kitchen?"}
        </legend>
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
            onReviewed(false);
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
              onReviewed(false);
            }}
          />
        </label>
        <small>
          {zh
            ? "尽量写清数量；识别重复或不准确的食材可以直接删除。"
            : "Add quantities where you can. Delete duplicate or incorrect photo suggestions."}
        </small>
        {draft.attachments.length > 0 && (
          <label className="dinner-review">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => onReviewed(event.target.checked)}
            />
            <span>
              {zh
                ? "我已检查食材与数量，以这份清单为准。"
                : "I checked the ingredients and quantities. Use this list."}
            </span>
          </label>
        )}
      </fieldset>
      <fieldset className="dinner-module" disabled={disabled}>
        <legend>
          <span>2</span>
          {zh ? "今晚怎么吃" : "Make It Fit Tonight"}
        </legend>
        <div className="dinner-row">
          <label>
            {zh ? "几个人吃" : "Servings"}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              step={1}
              required
              value={draft.servings || ""}
              onChange={(event) =>
                onChange({ servings: Number(event.target.value) })
              }
            />
          </label>
          <label>
            {zh ? "最多几分钟" : "Time Budget"}
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={180}
              step={1}
              required
              value={draft.minutes || ""}
              onChange={(event) =>
                onChange({ minutes: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <label>
          {zh ? "忌口与过敏（选填）" : "Avoidances & Allergies (Optional)"}
          <input
            maxLength={2000}
            value={draft.avoid}
            placeholder={
              zh ? "例如：不吃花生、不吃辣" : "e.g. no peanuts, no spicy food"
            }
            onChange={(event) => onChange({ avoid: event.target.value })}
          />
        </label>
        <label>
          {zh ? "可用厨具（选填）" : "Equipment (Optional)"}
          <input
            maxLength={1000}
            value={draft.equipment}
            placeholder={
              zh
                ? "例如：炒锅、电饭锅；没有烤箱"
                : "e.g. frying pan, rice cooker; no oven"
            }
            onChange={(event) => onChange({ equipment: event.target.value })}
          />
        </label>
        <label>
          {zh ? "其他想法（选填）" : "Anything Else? (Optional)"}
          <textarea
            maxLength={2000}
            rows={2}
            value={draft.preferences}
            placeholder={
              zh
                ? "例如：中式家常菜，尽量不买新食材"
                : "e.g. home-style Chinese, avoid buying extra ingredients"
            }
            onChange={(event) => onChange({ preferences: event.target.value })}
          />
        </label>
      </fieldset>
    </>
  );
}
