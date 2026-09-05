// OCR — turning a picture of words into the words (capability `ocr`,
// 图转文). The eighth capability, and the one whose engine must NEVER default
// to the main model: a general vision model used as OCR INVENTS characters.
// Dedicated OCR anchors its output in the image's features and fails loudly —
// garbage you can see; a VLM generates token by token and, where the ink is
// unclear, writes something that merely looks plausible — a fluent wrong
// number you cannot see. On a quote, the number goes into money. (Measured
// no-invention rates: dedicated ~93%; GPT-5.5 78%, Qwen3-VL 80.6%.)
//
// This round is the ONLINE engine only. The local engines (PaddleOCR via
// onnxruntime, and Windows' built-in OCR) are verified feasible on this very
// machine and recorded in docs/local-engines.md for a later round.
import { readProviderConnections } from "../models/connections.js";
import {
  readEnginePair,
  runWithBackup,
  type EngineChoice,
  type EngineRunNote,
} from "../models/engine-slots.js";

// One engine, and that is a deliberate state rather than a gap. OCR.space was
// added on 2026-08-16 as the free stand-in and removed on 2026-08-18: measured
// against the Owner's own key, engine 1 answered HTTP 502 in every language
// (60s, 25s, 9s), and engine 2 — which did read a drawn "12345" correctly
// twice — then returned 502/503 for everything under light use. A stand-in
// that works occasionally is worse than a named gap, because it gets trusted.
// OCR's stand-in may still never be a chat model (see the note above).
export const OCR_ENGINES = ["mistral"] as const;
export type OcrEngine = (typeof OCR_ENGINES)[number];

// Mistral OCR: already a connected provider (one key, the shared pool), a
// dedicated document-OCR model rather than a chat model, ~$2-4 per thousand
// pages, 170 languages with strong Chinese, and per-block confidence — the
// raw material for "say so when the read is uncertain". Google Cloud Vision
// remains the documented alternative (1000 pages/month free forever, no
// training on submissions) but needs a card even for the free tier and its
// own pipeline; not built this round.
const MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_OCR_MODEL = "mistral-ocr-latest";

export interface OcrResult {
  text: string;
  engine: OcrEngine;
  /** Which reader answered, and — when the stand-in did — why the main one
   *  could not. The caller says it out loud; it is never a quiet swap. */
  note?: EngineRunNote;
}

export class OcrNotConnectedError extends Error {
  constructor() {
    super("OCR_NOT_CONNECTED");
    this.name = "OcrNotConnectedError";
  }
}

function keyFor(secretsDirectory: string, provider: string): string | null {
  return (
    readProviderConnections(secretsDirectory)[provider]?.apiKey?.trim() || null
  );
}

/** The reader this instance would use. Falls back to Mistral for an install
 *  set up before OCR had a slot of its own — that is what it was doing. */
function ocrPrimary(secretsDirectory: string): EngineChoice | null {
  const chosen = readEnginePair(secretsDirectory, "ocr").primary;
  if (chosen) return chosen;
  return keyFor(secretsDirectory, "mistral") ? { provider: "mistral" } : null;
}

export function ocrEngineConnected(secretsDirectory: string): boolean {
  const primary = ocrPrimary(secretsDirectory);
  return Boolean(primary && keyFor(secretsDirectory, primary.provider));
}

// One call, either kind of input: a whole PDF (Mistral OCR takes the document
// itself, so a scanned PDF never has to be rasterised here) or a single image.
// The answer is the pages' text under the same [page N] headers the rest of
// the document pipeline speaks.
export async function runOcr(
  secretsDirectory: string,
  input: { base64: string; mediaType: string },
  options: { engineOverride?: EngineChoice } = {},
): Promise<OcrResult> {
  if (options.engineOverride) {
    // One side of the pair, alone: a Test of that engine and nothing else.
    const choice = options.engineOverride;
    const read = await readWith(secretsDirectory, choice, input);
    return {
      ...read,
      note: { provider: choice.provider, model: choice.model ?? null },
    };
  }
  const primary = ocrPrimary(secretsDirectory);
  if (!primary) throw new OcrNotConnectedError();
  const pair = {
    primary,
    backup: readEnginePair(secretsDirectory, "ocr").backup,
  };
  const read = await runWithBackup(
    pair,
    (choice) => readWith(secretsDirectory, choice, input),
    "en",
  );
  return { ...read.value, note: read.note };
}

function readWith(
  secretsDirectory: string,
  choice: EngineChoice,
  input: { base64: string; mediaType: string },
): Promise<OcrResult> {
  const key = keyFor(secretsDirectory, choice.provider);
  if (!key) throw new OcrNotConnectedError();
  return readWithMistral(key, choice.model, input);
}

async function readWithMistral(
  key: string,
  model: string | undefined,
  input: { base64: string; mediaType: string },
): Promise<OcrResult> {
  const isPdf = input.mediaType === "application/pdf";
  const dataUrl = `data:${input.mediaType};base64,${input.base64}`;
  const response = await fetch(MISTRAL_OCR_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model?.trim() || MISTRAL_OCR_MODEL,
      document: isPdf
        ? { type: "document_url", document_url: dataUrl }
        : { type: "image_url", image_url: dataUrl },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    // The status is enough for the caller's sentence; the body goes nowhere
    // near a user (it is the vendor's raw error).
    throw new Error(`OCR_ENGINE_FAILED:mistral:${response.status}`);
  }
  const parsed = (await response.json()) as {
    pages?: { index?: number; markdown?: string }[];
  };
  const pages = (parsed.pages ?? [])
    .map((page, at) => {
      const text = (page.markdown ?? "").trim();
      if (!text) return "";
      return `[page ${(page.index ?? at) + 1}]\n${text}`;
    })
    .filter(Boolean);
  return { text: pages.join("\n\n"), engine: "mistral" };
}
