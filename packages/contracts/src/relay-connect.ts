import { type Static, Type } from "@sinclair/typebox";

const opaque = Type.String({
  minLength: 43,
  maxLength: 128,
  pattern: "^[A-Za-z0-9_-]+$",
});
const address = Type.String({ minLength: 1, maxLength: 2048 });
export const RelayConnectStartSchema = Type.Object(
  {
    version: Type.Literal(1),
    client_name: Type.String({ minLength: 1, maxLength: 80 }),
    client_origin: address,
    return_uri: address,
    state: opaque,
    code_challenge: Type.String({
      minLength: 43,
      maxLength: 43,
      pattern: "^[A-Za-z0-9_-]+$",
    }),
    code_challenge_method: Type.Literal("S256"),
  },
  { additionalProperties: false },
);
export const RelayConnectExchangeSchema = Type.Object(
  {
    version: Type.Literal(1),
    code: opaque,
    code_verifier: opaque,
    client_origin: address,
    return_uri: address,
  },
  { additionalProperties: false },
);
export type RelayConnectStart = Static<typeof RelayConnectStartSchema>;
export type RelayConnectExchange = Static<typeof RelayConnectExchangeSchema>;
export interface RelayConnectRequestView {
  version: 1;
  request_id: string;
  client_name: string;
  client_origin: string;
  return_uri: string;
  expires_at: string;
  status: "pending" | "approved" | "denied";
}
