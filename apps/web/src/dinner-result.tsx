import { readDinnerOutput } from "./dinner-planner-data";

export function DinnerResult({
  output,
  language = "en",
}: {
  output: unknown;
  language?: string;
}) {
  const zh = language === "zh";
  const dinner = readDinnerOutput(output);
  if (!dinner)
    return (
      <p role="alert">
        {zh
          ? "这次结果不完整，请重新生成。输入仍然保留。"
          : "This result is incomplete. Try again; your inputs are kept."}
      </p>
    );
  const shopping = dinner.ingredients.filter(
    (item) => item.source !== "available",
  );
  return (
    <article className="dinner-result">
      <div className="dinner-result-heading">
        <span className="dinner-eyebrow">
          {dinner.status === "ready"
            ? zh
              ? "今晚的晚餐"
              : "Tonight’s Dinner"
            : zh
              ? "需要补充信息"
              : "A Little More Information"}
        </span>
        <h2>{dinner.title}</h2>
        <p>{dinner.summary}</p>
        {dinner.status === "ready" && (
          <div className="dinner-pills">
            <span>
              {zh ? dinner.servings + " 人份" : dinner.servings + " Servings"}
            </span>
            <span>
              {zh
                ? "约 " + dinner.minutes + " 分钟"
                : "About " + dinner.minutes + " Min"}
            </span>
          </div>
        )}
      </div>
      {dinner.status === "ready" && (
        <>
          <section>
            <h3>{zh ? "准备食材" : "Gather Ingredients"}</h3>
            <ul className="dinner-ingredient-list">
              {dinner.ingredients.map((item, i) => (
                <li key={i}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.quantity}</small>
                  </span>
                  <span
                    className={"dinner-source dinner-source--" + item.source}
                  >
                    {item.source === "available"
                      ? zh
                        ? "已有"
                        : "Available"
                      : item.source === "buy"
                        ? zh
                          ? "需购买"
                          : "Buy"
                        : zh
                          ? "需确认"
                          : "Check"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {shopping.length > 0 && (
            <section className="dinner-shopping">
              <h3>{zh ? "购物与储藏柜检查" : "Shopping & Pantry Check"}</h3>
              {shopping.map((item, i) => (
                <label key={i}>
                  <input type="checkbox" />
                  <span>
                    {item.name} · {item.quantity}
                  </span>
                </label>
              ))}
            </section>
          )}
          <section>
            <h3>{zh ? "开始做饭" : "Let’s Cook"}</h3>
            <ol className="dinner-steps">
              {dinner.steps.map((step, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      {dinner.notes.length > 0 && (
        <section className="dinner-notes">
          <h3>{zh ? "开做前确认" : "Before You Start"}</h3>
          <ul>
            {dinner.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
