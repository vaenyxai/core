import { legalFootnote } from "./i18n";
import {
  fieldSource,
  readHouseholdOutput,
  type HouseholdInput,
  type HouseholdKind,
} from "./household-data";
import { SourcePreview } from "./household-sources";
export function HouseholdResult({
  output,
  input = null,
  kind,
  language,
}: {
  output: unknown;
  input?: HouseholdInput | null;
  kind: HouseholdKind;
  language: "en" | "zh";
}) {
  const zh = language === "zh",
    result = readHouseholdOutput(output);
  if (!result)
    return (
      <p role="alert">
        {zh
          ? "结果不完整，请重试。输入仍然保留。"
          : "Incomplete result. Try again; your inputs are kept."}
      </p>
    );
  return (
    <article className="household-result">
      <header>
        <span className="dinner-eyebrow">{zh ? "资料卡" : "Your Record"}</span>
        <h2>{result.title}</h2>
        <p>{result.summary}</p>
      </header>
      <div className="household-field-grid">
        {result.fields.map((field, i) => {
          const source = fieldSource(field, input);
          const check =
            field.uncertain || !field.value.trim() || (!!input && !source);
          return (
            <section
              key={i}
              className={"household-field" + (check ? " needs-review" : "")}
            >
              <h3>{field.label}</h3>
              <p>{field.value || (zh ? "尚未提供" : "Not Provided")}</p>
              {check && <small>{zh ? "待核对" : "Check This"}</small>}
              {field.quote && (
                <details>
                  <summary>
                    {source?.name ?? (zh ? "来源摘录" : "Source Quote")}
                  </summary>
                  <blockquote>{field.quote}</blockquote>
                  {source?.attachment && (
                    <SourcePreview source={source.attachment} />
                  )}
                  {input && !source && (
                    <small>
                      {zh
                        ? "没有找到匹配的来源原文，请核对。"
                        : "No matching source quote was found. Please check."}
                    </small>
                  )}
                </details>
              )}
            </section>
          );
        })}
      </div>
      {result.checks.length > 0 && (
        <section className="household-checks">
          <h3>{zh ? "需要核对" : "Check These Details"}</h3>
          <ul>
            {result.checks.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {result.checklist.length > 0 && (
        <section>
          <h3>{zh ? "准备清单" : "Checklist"}</h3>
          <ul>
            {result.checklist.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      {kind === "notice" ? (
        <small>
          {zh
            ? "仅整理并保存在 Vaenyx；没有发送通知或写入日历。"
            : "Organised and saved in Vaenyx. No notification sent or calendar entry created."}
        </small>
      ) : (
        <p className="routine-result-footnote">
          {legalFootnote(language, "legal.disclaimer.legal")}
        </p>
      )}
    </article>
  );
}
export function HouseholdJournalContent({
  input,
  language,
}: {
  input: HouseholdInput;
  language: "en" | "zh";
}) {
  return (
    <div className="household-journal">
      {input.sourceText && (
        <p className="household-source-text">{input.sourceText}</p>
      )}
      {Object.values(input.corrections).some(Boolean) && (
        <p>
          {language === "zh" ? "你的更正：" : "Your Corrections: "}
          {Object.values(input.corrections).filter(Boolean).join(" · ")}
        </p>
      )}
      {input.attachments.map((source) => (
        <details key={source.assetId}>
          <summary>{source.name}</summary>
          <SourcePreview source={source} />
          <p className="household-source-text">
            {source.text || (language === "zh" ? "未读出文字" : "No Text Read")}
          </p>
        </details>
      ))}
    </div>
  );
}
