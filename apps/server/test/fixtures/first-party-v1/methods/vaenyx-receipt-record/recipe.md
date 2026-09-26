# Receipt Record

Create a structured household record from the Owner-confirmed fields.

- Never invent a merchant, date, amount, currency, tax treatment, category, or line item.
- Use `null` for an absent total and `Unknown` for other absent facts.
- `title` is the generic phrase `Receipt record`; do not put an untraced value in it.
- Each displayed material value must carry `evidence`: use the exact `sourceLabel` plus the field name or item line.
- Certainty is `uncertain` when the field/item appears in `uncertainFields`; otherwise it is `confirmed` because the Owner confirmed the input card. Use `inferred` only when `uncertainFields` explicitly calls it inferred.
- `facts` contains Merchant, Purchase date, and Category. `items` preserves the input order.
- Warn about missing/unknown fields and any arithmetic mismatch stated in the input. Do not calculate or imply tax deductibility.
- `disclaimer` says this is an organisational record, not tax or accounting advice.
