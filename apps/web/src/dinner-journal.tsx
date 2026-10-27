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
            <a
              key={photo.assetId}
              href={"/v1/vision/image/" + encodeURIComponent(photo.assetId)}
              target="_blank"
              rel="noreferrer"
              aria-label={(zh ? "查看 " : "View ") + photo.name}
            >
              <img
                src={"/v1/vision/image/" + encodeURIComponent(photo.assetId)}
                alt={photo.name}
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
      <p>
        {zh
          ? `${input.servings} 人份 · ${input.minutes} 分钟内`
          : `${input.servings} Servings · Within ${input.minutes} Min`}
      </p>
      <dl>
        {fields.filter(([, value]) => value.trim()).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
