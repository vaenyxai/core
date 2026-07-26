// Capability gates for copy that must not reach a user before the thing it
// describes exists.
//
// The Current Implementation and Data-Handling Schedule
// (docs/legal/implementation-status.md) is the source of truth for what is
// built. This file mirrors the entries the UI has to gate on, and the mirror is
// deliberately dumb: one boolean, one place, changed by whoever changes the
// Schedule and at the same time.
//
// The gate is enforced in the string lookup itself (see i18n.tsx), not by each
// component remembering to check. A notice describing a mechanism that does not
// exist is a false statement about what the software does, and "no screen
// currently renders it" is not a control — the next person to wire up a
// component would not know.
export const CAPABILITIES = {
  // feature.community-sharing.upload-engine  — Schedule: not-built
  // feature.community-sharing.upload-endpoint — Schedule: not-built
  // feature.community-sharing.deidentification-pipeline — Schedule: not-built
  // The whole of copy pack Part K depends on these three.
  flywheelUpload: false,
} as const;

// Keys that render only while their capability is on. They still live in the
// string table verbatim, so the copy audit can hold them to the pack — being
// unrenderable is not the same as being absent.
export const GATED_KEYS: Record<string, keyof typeof CAPABILITIES> = {
  "legal.consent.flywheel.activate": "flywheelUpload",
  "legal.notice.flywheel.item": "flywheelUpload",
  "legal.notice.flywheel.remove": "flywheelUpload",
};

export function isKeyRenderable(key: string): boolean {
  const capability = GATED_KEYS[key];
  return capability === undefined || CAPABILITIES[capability];
}
