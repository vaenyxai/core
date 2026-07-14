import { type Static, Type } from "@sinclair/typebox";

export const SystemStatusSchema = Type.Object(
  {
    name: Type.Literal("Vaenyx"),
    version: Type.String(),
    status: Type.Union([Type.Literal("ready"), Type.Literal("degraded")]),
    mode: Type.Union([
      Type.Literal("development"),
      Type.Literal("test"),
      Type.Literal("production"),
    ]),
    database: Type.Object({
      engine: Type.Literal("sqlite"),
      status: Type.Union([
        Type.Literal("ready"),
        Type.Literal("unavailable"),
      ]),
    }),
    remoteAccess: Type.Object(
      {
        recommendedProvider: Type.Literal("cloudflare-tunnel-access"),
        internetExposure: Type.Literal("disabled"),
        cloudflaredInstalled: Type.Boolean(),
        cloudflaredServiceStatus: Type.Union([
          Type.Literal("missing"),
          Type.Literal("installed"),
          Type.Literal("running"),
          Type.Literal("unknown"),
        ]),
        cloudflaredVersion: Type.Union([Type.String(), Type.Null()]),
        accessPolicyRequired: Type.Literal(true),
      },
      { additionalProperties: false },
    ),
    timestamp: Type.String(),
  },
  {
    $id: "SystemStatus",
    additionalProperties: false,
  },
);

export type SystemStatus = Static<typeof SystemStatusSchema>;
