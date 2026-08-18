import { type Static, Type } from "@sinclair/typebox";

export const SystemStatusSchema = Type.Object(
  {
    name: Type.Literal("Vaenyx"),
    version: Type.String(),
    // The language chosen during install, used only as the app's starting
    // language on a device that has never picked one.
    installLanguage: Type.Union([
      Type.Literal("en"),
      Type.Literal("zh"),
      Type.Null(),
    ]),
    status: Type.Union([Type.Literal("ready"), Type.Literal("degraded")]),
    mode: Type.Union([
      Type.Literal("development"),
      Type.Literal("test"),
      Type.Literal("production"),
    ]),
    database: Type.Object({
      engine: Type.Literal("sqlite"),
      status: Type.Union([Type.Literal("ready"), Type.Literal("unavailable")]),
    }),
    timestamp: Type.String(),
  },
  {
    $id: "SystemStatus",
    additionalProperties: false,
  },
);

export type SystemStatus = Static<typeof SystemStatusSchema>;
