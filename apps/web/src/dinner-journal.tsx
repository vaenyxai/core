import { AnnotatedPhoto } from "./photo-marks";
import type { DinnerInput } from "./dinner-planner-data";

export function DinnerJournalContent({
  input,
  language,
}: {
  input: DinnerInput;
  language: "en" | "zh";
}) {
  const zh = language === "zh";
  const fields: [string, string][] = [
    [zh ? "食材和数量" : "Ingredients & Quantities", input.ingredients],
    [zh ? "忌口和过敏" : "Avoidances & Allergies", input.avoid],
    [zh ? "厨具" : "Equipment", input.equipment],
    [zh ? "其他偏好" : "Preferences", input.preferences],
  ];
  return (
    <div className="dinner-journal">
      {input.attachments.length > 0 && (
        <div className="dinner-photo-grid">
          {input.attachments.map((photo) => (
            <AnnotatedPhoto
              key={photo.assetId}
              imageId={photo.assetId}
              annotations={photo.annotations ?? null}
              compact
            />
          ))}
        </div>
      )}
      {input.servings && input.minutes ? (
        <p>
          {zh
            ? `${input.servings} 人份 · ${input.minutes} 分钟内`
            : `${input.servings} Servings · Within ${input.minutes} Min`}
        </p>
      ) : null}
      <dl>
        {fields
          .filter(([, value]) => value.trim())
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
