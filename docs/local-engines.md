# Local engines — verified feasible, parked on purpose (2026-08-06)

The specialist capabilities (OCR / hearing / speaking) can run entirely on the
owner's machine. Every claim below was MEASURED on the reference machine
(Windows 11, Node 24, pure CPU, no Python, no compiler) — this file exists so
the next round starts from results, not research. The generalists (chat,
vision understanding, document reading, drawing) stay cloud-first; whether the
local engines are used is always the owner's choice, never forced.

## OCR

- `paddleocr` (npm, MIT — the JS port carries complete detection/recognition
  pre/post-processing) + `onnxruntime-node` (MIT, prebuilt Windows binaries).
  Chinese and English both came back character-perfect; 0.3–0.6 s per image;
  ~35 MB packaged (PP-OCRv6_tiny, Apache-2.0).
- **Windows' built-in OCR** (`Windows.Media.Ocr`): 0 MB, ~20 ms per image,
  the highest accuracy of everything tried, and this machine already carries
  `zh-Hans-CN`. Reachable through a resident PowerShell sidecar; the NodeRT
  binding path needs Visual Studio and is NOT viable. The right shape: probe
  at boot, use it when present, fall back to the packaged PaddleOCR when not.

## Hearing (speech to text)

- `sherpa-onnx-node` + paraformer-zh-small int8 (78 MB): 5 s of audio decodes
  in 59 ms, mixed Chinese/English utterances transcribed correctly.

## Speaking (text to speech)

- The same library + Piper VITS voices: ~14× realtime.

## ⚠️ Two licence landmines — solve BEFORE building, not after

1. `sherpa-onnx`'s Windows binaries **statically link espeak-ng (GPL-3.0)**.
   Shipping that inside the MIT installer distributes GPL code. The solution
   is a first-run download of that binary — never packaged into the installer.
2. The Chinese voice every tutorial recommends (`huayan`) has licence
   "Unknown". Use **`chaowen` (CC0, 14 MB)** instead.
