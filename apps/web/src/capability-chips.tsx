// THE SEVEN CAPABILITIES, drawn (Oskar, 2026-07-31). Never emoji — nothing in
// this app is emoji: an emoji is somebody else's drawing, it changes shape on
// every platform, it cannot take the app's colour, and it cannot be dimmed to
// mean "you have this switched off". These are stroke-only paths on the app's
// 24-box, so they inherit currentColor and the off state is the SAME shape at
// lower opacity — a different shape would read as a different thing.
//
// Each capability carries two names on purpose (Oskar): the word we use
// everywhere now, and in brackets the older familiar wording, kept as a gloss
// so the switch row explains itself to anyone who learnt "Picture in" first.
import type { Lang } from "./i18n";

function LineIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="line-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

// An ear, and sound leaving a mouth: the in/out pair reads as a pair.
const IconHearing = (
  <LineIcon>
    <path d="M9 21c-1.4-1-2-2.4-2-4V9a5 5 0 0 1 10 0c0 3-3 3.4-3 6a2 2 0 1 1-4 0" />
    <path d="M11 9a1.5 1.5 0 0 1 3 0" />
  </LineIcon>
);
const IconSpeaking = (
  <LineIcon>
    <path d="M5 12h.01" />
    <path d="M9 9.5a4 4 0 0 1 0 5" />
    <path d="M13 7a8 8 0 0 1 0 10" />
    <path d="M17 4.5a12 12 0 0 1 0 15" />
  </LineIcon>
);

// An eye, and a pencil: the other in/out pair.
const IconVision = (
  <LineIcon>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </LineIcon>
);
const IconDrawing = (
  <LineIcon>
    <path d="m4 20 4.2-1L18 9.2 14.8 6 5 15.8z" />
    <path d="m14.8 6 1.6-1.6a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L18 9.2" />
  </LineIcon>
);

// Pages with a folded corner — many pages, which is the whole reason this is
// not the same capability as looking at one picture.
const IconReading = (
  <LineIcon>
    <path d="M8 3h6l5 5v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5" />
    <path d="M10 13h6M10 16h6" />
  </LineIcon>
);

// A folder with something being lifted out of it: it goes and gets.
const IconFetching = (
  <LineIcon>
    <path d="M3 7h6l2 2h10v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" />
    <path d="M12 17v-6" />
    <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
  </LineIcon>
);

const IconWeb = (
  <LineIcon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
  </LineIcon>
);

export interface CapabilityMeta {
  id: string;
  icon: React.ReactNode;
  /** The word used everywhere now. */
  name: { en: string; zh: string };
  /** The older familiar wording, shown in brackets as an explanation. */
  gloss: { en: string; zh: string };
}

// Oskar's order: what comes in, what goes out, then what it goes and gets.
export const CAPABILITY_META: CapabilityMeta[] = [
  {
    id: "hearing",
    icon: IconHearing,
    name: { en: "Hearing", zh: "听" },
    gloss: { en: "Voice in", zh: "声音进" },
  },
  {
    id: "speaking",
    icon: IconSpeaking,
    name: { en: "Speaking", zh: "念" },
    gloss: { en: "Voice out", zh: "声音出" },
  },
  {
    id: "vision",
    icon: IconVision,
    name: { en: "Vision", zh: "看" },
    gloss: { en: "Picture in", zh: "图形进" },
  },
  {
    id: "drawing",
    icon: IconDrawing,
    name: { en: "Drawing", zh: "画" },
    gloss: { en: "Picture out", zh: "图形出" },
  },
  {
    id: "reading",
    icon: IconReading,
    name: { en: "Reading", zh: "读文档" },
    gloss: { en: "Documents, PDF", zh: "多页文档、PDF" },
  },
  {
    id: "fetching",
    icon: IconFetching,
    name: { en: "Fetching", zh: "取文件" },
    gloss: { en: "Files on this machine", zh: "本机文件" },
  },
  {
    id: "web",
    icon: IconWeb,
    name: { en: "Web", zh: "上网" },
    gloss: { en: "Web pages", zh: "网页" },
  },
];

export function capabilityMeta(id: string): CapabilityMeta | undefined {
  return CAPABILITY_META.find((entry) => entry.id === id);
}

// One chip: the drawing, and the word behind it for anyone who cannot see the
// drawing or does not recognise it. A picture must never be the only carrier of
// meaning, so the word rides along in the title and the label.
export function CapabilityChip({
  available = true,
  id,
  lang,
  showName = false,
}: {
  available?: boolean;
  id: string;
  lang: Lang;
  showName?: boolean;
}) {
  const meta = capabilityMeta(id);
  if (!meta) return null;
  const name = lang === "zh" ? meta.name.zh : meta.name.en;
  const gloss = lang === "zh" ? meta.gloss.zh : meta.gloss.en;
  return (
    <span
      aria-label={`${name} (${gloss})`}
      className={available ? "capability-chip" : "capability-chip off"}
      title={`${name} (${gloss})`}
    >
      {meta.icon}
      {showName ? <span className="capability-chip-name">{name}</span> : null}
    </span>
  );
}

export function CapabilityChips({
  items,
  lang,
  unavailable = [],
}: {
  items: string[];
  lang: Lang;
  unavailable?: string[];
}) {
  if (items.length === 0) return null;
  return (
    <span className="capability-chips">
      {items.map((id) => (
        <CapabilityChip
          available={!unavailable.includes(id)}
          id={id}
          key={id}
          lang={lang}
        />
      ))}
    </span>
  );
}
