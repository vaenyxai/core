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
  // feature.community-sharing.upload-engine — Schedule: available-off
  // (2026-07-27, Legal Set v3.1): "Live and off unless the user turns it on."
  //
  // ON because the Schedule moved, not because the code exists — the switch
  // mirrors the Schedule, and for a day the code was deployed while this stayed
  // false for exactly that reason. With it on, the K3 activation surface
  // renders; nothing uploads without that consent record, and the server also
  // refuses for any publisher who has not opted in. (upload-endpoint — the
  // community-public licence flow under ToS 18.1A — is a separate entry and
  // remains not-built; nothing here renders its strings.)
  flywheelUpload: true,
  // Importing the instructions from an Agent Skill, and exporting a Method as
  // one. Copy pack Part L. Never describe this as "Skill compatible", "runs
  // Skills" or "works with Skills" (L4): our interoperability statements are
  // descriptive only under ToS 11.5, and that holds only while we do not
  // overstate them. We import instructions and we list what was dropped.
  //
  // ON since 2026-07-26: the interface shipped, so the Schedule entry moves
  // from backend-only to active. The order matters and is deliberate — the
  // switch goes on only when a user can actually reach the feature, because
  // the Schedule has to be true at the moment it is read, not eventually.
  skillInterop: true,
} as const;

// Keys that render only while their capability is on. They still live in the
// string table verbatim, so the copy audit can hold them to the pack — being
// unrenderable is not the same as being absent.
export const GATED_KEYS: Record<string, keyof typeof CAPABILITIES> = {
  "legal.consent.flywheel.activate": "flywheelUpload",
  "legal.notice.flywheel.item": "flywheelUpload",
  "legal.notice.flywheel.remove": "flywheelUpload",
  "legal.consent.flywheel.receive": "flywheelUpload",
  "legal.consent.flywheel.receive.label": "flywheelUpload",
  "legal.consent.flywheel.sensitiveAsk": "flywheelUpload",
  "legal.notice.flywheel.contributorId": "flywheelUpload",
  "flywheel.queue.window": "flywheelUpload",
  "flywheel.queue.held": "flywheelUpload",
  "legal.notice.skill.import": "skillInterop",
  "legal.notice.skill.importedPublish": "skillInterop",
  "legal.notice.skill.export": "skillInterop",
};

export function isKeyRenderable(key: string): boolean {
  const capability = GATED_KEYS[key];
  return capability === undefined || CAPABILITIES[capability];
}
