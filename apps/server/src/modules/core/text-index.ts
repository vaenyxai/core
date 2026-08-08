// MAKING CHINESE FINDABLE, with no dependency and no native code.
//
// SQLite's FTS5 can index Chinese; it cannot SEGMENT it. Both stock tokenizers
// fail, in different ways, and both failures are silent — a search simply
// returns nothing, which reads like "there is no such memory":
//
//   • `unicode61` on raw Chinese treats a whole run of Han characters as ONE
//     token, so 「我们上周去超市买了牛奶」 indexes as a single word and
//     searching 「超市」 matches nothing at all.
//   • `trigram` indexes every three characters, so it cannot match a TWO
//     character word — and two characters is the commonest word length in
//     Chinese. 超市, 牛奶, 面包, 孩子, 医院: all unfindable.
//
// So the segmentation happens here, in JavaScript, before the text ever
// reaches SQLite: Intl.Segmenter splits it into words, they are joined with
// spaces, and plain `unicode61` then does exactly what it is good at. English
// passes through unchanged, so one index serves both languages.
//
// 🔴 THE QUERY MUST GO THROUGH THIS SAME FUNCTION. If a row is indexed as
// "超市 牛奶" and the query is sent as the raw "超市牛奶", the query is one
// token and matches nothing. Halving recall this way leaves no error behind,
// which is why there is one exported function and both callers use it.

/** Node's ICU data, checked at startup. See assertFullIcu below. */
export function hasFullIcu(): boolean {
  // A "small-icu" build carries English only: Intl.Segmenter still exists and
  // still runs, it just stops finding word boundaries in Chinese — the exact
  // silent degradation this whole module exists to prevent.
  //
  // `icu_small` is absent from Node's own typings, so it is read off a widened
  // view rather than by loosening the module's types. Measured on the
  // reference build (Node 24.14.0): `false`, i.e. full ICU.
  const variables = process.config.variables as unknown as {
    icu_small?: boolean;
  };
  return variables.icu_small === false;
}

export class MissingIcuError extends Error {
  constructor() {
    super(
      "This Node build has small-icu, so Chinese text cannot be segmented and " +
        "Chinese search would silently return nothing. Vaenyx needs a Node " +
        "built with full ICU (the official installers all are).",
    );
    this.name = "MissingIcuError";
  }
}

/**
 * Fail at boot rather than at the first Chinese search. A build without full
 * ICU does not break loudly on its own: everything works, and Chinese memory
 * quietly becomes unfindable.
 */
export function assertFullIcu(): void {
  if (!hasFullIcu()) throw new MissingIcuError();
}

let segmenter: Intl.Segmenter | null = null;

function wordSegmenter(): Intl.Segmenter {
  // zh-CN gives the dictionary-based Han segmentation; it leaves Latin script
  // alone, so the same instance handles a bilingual household's mixed
  // sentences without having to guess which language a message is in.
  segmenter ??= new Intl.Segmenter("zh-CN", { granularity: "word" });
  return segmenter;
}

/**
 * The one tokeniser. Returns the words of a piece of text, lower-cased,
 * punctuation and whitespace dropped.
 */
export function segmentWords(text: string): string[] {
  if (!text) return [];
  const words: string[] = [];
  for (const piece of wordSegmenter().segment(text)) {
    if (!piece.isWordLike) continue;
    const word = piece.segment.trim().toLowerCase();
    if (word) words.push(word);
  }
  return words;
}

/** What goes into the FTS5 column: the same words, space-joined. */
export function indexableText(text: string): string {
  return segmentWords(text).join(" ");
}

/**
 * What goes into a MATCH clause. Every word is quoted so FTS5's own syntax
 * characters in a person's own words cannot become operators — a memory
 * containing `NOT` or `*` or a quote must be searchable, not a syntax error.
 * Words are ANDed, which is what a household expects from a search box.
 */
export function matchQuery(text: string): string | null {
  const words = segmentWords(text);
  if (words.length === 0) return null;
  return words.map((word) => `"${word.replace(/"/g, '""')}"`).join(" AND ");
}
