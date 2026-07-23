// Reversible at-rest encryption for App Tokens (Owner decision 2026-07-22:
// tokens must be viewable/copyable again after creation). The key lives in the
// SECRETS directory — outside userdata and outside every backup — so a leaked
// backup still cannot reveal tokens: the database holds only ciphertext, hash
// and prefix. Authentication still verifies against the sha256 hash; the
// cipher exists purely so the Owner can re-view a token in Settings.
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const KEY_FILENAME = "token-vault.key";

function loadOrCreateKey(secretsDirectory: string): Buffer {
  const path = resolve(secretsDirectory, KEY_FILENAME);
  try {
    const raw = readFileSync(path, "utf8").trim();
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, "hex");
    }
  } catch {
    // Absent or unreadable: create a fresh key below.
  }
  const key = randomBytes(32);
  mkdirSync(secretsDirectory, { recursive: true });
  writeFileSync(path, `${key.toString("hex")}\n`);
  return key;
}

export function encryptAppToken(
  secretsDirectory: string,
  token: string,
): string {
  const key = loadOrCreateKey(secretsDirectory);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    data.toString("base64"),
  ].join(".");
}

// Null when the ciphertext is absent/corrupt or the key changed — the caller
// treats that as "not recoverable" (the Owner resets to get a fresh token).
export function decryptAppToken(
  secretsDirectory: string,
  ciphertext: string,
): string | null {
  try {
    const [iv, tag, data] = ciphertext.split(".");
    if (!iv || !tag || !data) return null;
    const key = loadOrCreateKey(secretsDirectory);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
