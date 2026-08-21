// THE ONE PLACE THE SERVER LEARNS WHICH LANGUAGE THE APP SPEAKS.
//
// The web app keeps its language in the browser (localStorage), and the
// installer writes the install-time choice to userdata/config/language.json.
// Until 2026-08-22 nothing ever joined the two: the server only ever saw the
// installer's file, so a phone notification went out in English under a
// Chinese task title ("建筑新闻 — New result is ready."). Now the Settings
// language switch writes this file too, and every sentence the server composes
// for the Owner — push bodies above all — reads it.
//
// One file, one instance: the Owner's language is a property of THIS Vaenyx,
// not of whichever device happens to be reading it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export type AppLanguage = "en" | "zh";

function languageFile(dataDirectory: string): string {
  return resolve(dataDirectory, "..", "config", "language.json");
}

/** null = never chosen anywhere (a fresh install that skipped the question). */
export function readAppLanguage(dataDirectory: string): AppLanguage | null {
  try {
    const parsed = JSON.parse(
      readFileSync(languageFile(dataDirectory), "utf8"),
    ) as { language?: unknown };
    return parsed.language === "zh" || parsed.language === "en"
      ? parsed.language
      : null;
  } catch {
    return null;
  }
}

export function writeAppLanguage(
  dataDirectory: string,
  language: AppLanguage,
): void {
  const path = languageFile(dataDirectory);
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ language }, null, 2)}\n`);
}
