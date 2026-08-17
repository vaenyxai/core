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

export const OCR_ENGINES = ["mistral", "ocrspace"] as const;
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
const OCRSPACE_URL = "https://api.ocr.space/parse/image";

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
): Promise<OcrResult> {
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
  return choice.provider === "ocrspace"
    ? readWithOcrSpace(key, input)
    : readWithMistral(key, choice.model, input);
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

// OCR.space: form-encoded, key in a header, one page's text per parsed result.
// Its own failures come back inside a 200 — `IsErroredOnProcessing` with a
// message — so the status alone is not enough to know it worked.
async function readWithOcrSpace(
  key: string,
  input: { base64: string; mediaType: string },
): Promise<OcrResult> {
  const body = new URLSearchParams({
    base64Image: `data:${input.mediaType};base64,${input.base64}`,
    // Engine 1 is the one that reads Chinese; `cht`/`chs` select which script.
    // Latin text reads fine on it too, so one setting covers a household.
    OCREngine: "1",
    language: "cht",
    isOverlayRequired: "false",
    scale: "true",
  });
  const response = await fetch(OCRSPACE_URL, {
    method: "POST",
    headers: {
      apikey: key,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`OCR_ENGINE_FAILED:ocrspace:${response.status}`);
  }
  const parsed = (await response.json()) as {
    IsErroredOnProcessing?: boolean;
    OCRExitCode?: number;
    ErrorMessage?: string | string[];
    ParsedResults?: { ParsedText?: string }[];
  };
  if (parsed.IsErroredOnProcessing || (parsed.OCRExitCode ?? 1) > 2) {
    const detail = Array.isArray(parsed.ErrorMessage)
      ? parsed.ErrorMessage[0]
      : parsed.ErrorMessage;
    // A refusal wearing a 200 is still a refusal, and it has to look like one
    // to the stand-in logic — so it is thrown, with the vendor's own words.
    throw new Error(
      `OCR_ENGINE_FAILED:ocrspace:${(detail ?? "refused").slice(0, 200)}`,
    );
  }
  const pages = (parsed.ParsedResults ?? [])
    .map((page, at) => {
      const text = (page.ParsedText ?? "").trim();
      return text ? `[page ${at + 1}]\n${text}` : "";
    })
    .filter(Boolean);
  return { text: pages.join("\n\n"), engine: "ocrspace" };
}
