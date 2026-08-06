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
  engine: "mistral";
}

export class OcrNotConnectedError extends Error {
  constructor() {
    super("OCR_NOT_CONNECTED");
    this.name = "OcrNotConnectedError";
  }
}

function mistralKey(secretsDirectory: string): string | null {
  return (
    readProviderConnections(secretsDirectory)["mistral"]?.apiKey?.trim() || null
  );
}

export function ocrEngineConnected(secretsDirectory: string): boolean {
  return mistralKey(secretsDirectory) !== null;
}

// One call, either kind of input: a whole PDF (Mistral OCR takes the document
// itself, so a scanned PDF never has to be rasterised here) or a single image.
// The answer is the pages' text under the same [page N] headers the rest of
// the document pipeline speaks.
export async function runOcr(
  secretsDirectory: string,
  input: { base64: string; mediaType: string },
): Promise<OcrResult> {
  const key = mistralKey(secretsDirectory);
  if (!key) throw new OcrNotConnectedError();

  const isPdf = input.mediaType === "application/pdf";
  const dataUrl = `data:${input.mediaType};base64,${input.base64}`;
  const response = await fetch(MISTRAL_OCR_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_OCR_MODEL,
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
