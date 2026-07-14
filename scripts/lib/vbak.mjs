// Encrypted backup archive (.vbak): AES-256-GCM with a scrypt-derived key.
// Layout: "VBAK1" magic · 16B scrypt salt · 12B GCM iv · 16B auth tag ·
// ciphertext of gzip(entries), entries = repeated
// <4B nameLen BE><name utf8><8B size BE><file bytes>.
// Self-contained (node builtins only) so backup/restore never grow deps.
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

const MAGIC = Buffer.from("VBAK1");

function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32);
}

function collectFiles(root, prefix = "") {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(join(root, entry.name), rel));
    } else if (entry.isFile()) {
      files.push({ rel, abs: join(root, entry.name) });
    }
  }
  return files;
}

// Pack every file under `root` (recursively) into one encrypted buffer.
export function packDirectory(root, passphrase) {
  const chunks = [];
  for (const { rel, abs } of collectFiles(root)) {
    const data = readFileSync(abs);
    const name = Buffer.from(rel, "utf8");
    const head = Buffer.alloc(12);
    head.writeUInt32BE(name.length, 0);
    head.writeBigUInt64BE(BigInt(data.length), 4);
    chunks.push(head, name, data);
  }
  const packed = gzipSync(Buffer.concat(chunks));
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), iv);
  const encrypted = Buffer.concat([cipher.update(packed), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), encrypted]);
}

// Decrypt + unpack an archive buffer into `destination`. A wrong passphrase
// fails the GCM auth tag and throws a plain-language error.
export function unpackArchive(buffer, passphrase, destination) {
  if (buffer.length < 49 || !buffer.subarray(0, 5).equals(MAGIC)) {
    throw new Error("Not a Vaenyx encrypted backup (.vbak).");
  }
  const salt = buffer.subarray(5, 21);
  const iv = buffer.subarray(21, 33);
  const tag = buffer.subarray(33, 49);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(passphrase, salt),
    iv,
  );
  decipher.setAuthTag(tag);
  let packed;
  try {
    packed = gunzipSync(
      Buffer.concat([decipher.update(buffer.subarray(49)), decipher.final()]),
    );
  } catch {
    throw new Error("Wrong backup password (or a corrupted backup file).");
  }
  let at = 0;
  while (at + 12 <= packed.length) {
    const nameLength = packed.readUInt32BE(at);
    const size = Number(packed.readBigUInt64BE(at + 4));
    at += 12;
    const name = packed.subarray(at, at + nameLength).toString("utf8");
    at += nameLength;
    if (name.includes("..") || name.startsWith("/")) {
      throw new Error("Unsafe path inside the backup archive.");
    }
    const data = packed.subarray(at, at + size);
    at += size;
    const out = resolve(destination, name);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data);
  }
}
