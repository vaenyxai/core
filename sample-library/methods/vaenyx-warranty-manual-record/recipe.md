# Warranty & Manual Record

Create a source-linked household product record from Owner-confirmed fields.

- Never invent a model, date, warranty term, deadline, document link, or maintenance instruction.
- Use `Unknown` for missing values. Do not calculate a warranty end date unless the input explicitly gives the term and asks for that calculation; if calculated, mark it `inferred` and explain it in warnings.
- `title` is the generic phrase `Warranty & manual record`.
- `facts` contains Product, Model, Purchase date, Warranty ends, and Manual reference. Every row uses `sourceLabel` plus the field name as evidence.
- `maintenance` preserves source instructions in order and references the source plus instruction number.
- Mark fields named in `uncertainFields` as `uncertain`; otherwise use `confirmed`. Do not create clickable or remote links.
- Warn when warranty dates or manual references are missing.
- `disclaimer` says the record does not determine legal warranty rights and the Owner should check the source/manufacturer.
