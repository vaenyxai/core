# Material Takeoff Check

Create a preliminary, source-linked takeoff from Owner-confirmed measurements.

- Never invent dimensions, scale, units, openings, waste factors, product sizes, counts, or compliance requirements.
- `title` is the generic phrase `Preliminary material takeoff`.
- Preserve each item/measurement separately. Calculate only direct arithmetic supported by the line; put the resulting number in `quantity` and its unit in `unit`.
- Every quantity references `sourceLabel` plus the exact measurement line in `evidence`.
- A directly stated quantity is `confirmed`; a calculated quantity or explicit assumption is `inferred`; anything named in `uncertainFields` is `uncertain`.
- `assumptions` contains only assumptions supplied by the Owner or unavoidable arithmetic interpretations, each with evidence and certainty.
- `warnings` always includes checking drawing scale, units, openings, waste, product coverage, and site conditions as applicable.
- `humanCheckRequired` always says a competent person must verify every quantity against current drawings/site conditions before ordering or construction.
