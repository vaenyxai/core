// The one document tool a tool-loop backend is lent when the conversation
// has a spilled document (extracted text too big to ride whole; see
// core/document-spill.ts). Built the same way as fetch-tools.ts and for the
// same reasons: the tool runs IN THIS PROCESS, the gate IS the handler, and
// the reader serves exactly one document — resolved server-side from the
// conversation's own rows, so the model never names a path or an id.
//
// NOT the Fetching capability: the Owner already attached this file to this
// conversation, so reading parts of it back carries the same trust as the
// attachment itself. The capability gates are not consulted and not changed.
import { z } from "zod";

import {
  DocumentPartError,
  type DocumentSpillAccess,
} from "../core/document-spill.js";
import type { ClaudeSdk, SdkMcpServer } from "./claude-sdk.js";

const SERVER_NAME = "vaenyx_document";

export const DOCUMENT_TOOL_NAMES = [`mcp__${SERVER_NAME}__read_document_part`];

// A refusal is an ANSWER, not a crash: the model hears the reason in plain
// words so it can pass it on instead of inventing one.
function refusal(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function said(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function documentToolServer(
  sdk: ClaudeSdk,
  access: DocumentSpillAccess,
): SdkMcpServer {
  const readPart = sdk.tool(
    "read_document_part",
    `Read part of the saved full text of the Owner's document${
      access.documentName ? ` (${access.documentName})` : ""
    }. It has ${access.count} ${access.unit}; ask by number.`,
    {
      from: z
        .number()
        .int()
        .min(1)
        .describe(`First ${access.unit.slice(0, -1)} to read (1-based).`),
      to: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Last one to read; leave out to read just the first."),
    },
    async (args: { from: number; to?: number }) => {
      try {
        return said(access.read(args.from, args.to ?? args.from));
      } catch (error) {
        return refusal(
          error instanceof DocumentPartError
            ? error.message
            : "Vaenyx could not read that part.",
        );
      }
    },
  );

  return sdk.createSdkMcpServer({
    name: SERVER_NAME,
    version: "1.0.0",
    tools: [readPart],
  });
}

// What the model is told it has. The count is named so it asks for real
// ranges instead of probing blindly.
export function documentToolBriefing(access: DocumentSpillAccess): string {
  return [
    `The Owner's document${
      access.documentName ? ` (${access.documentName})` : ""
    } was too large to include whole; the conversation carries a preview, and the FULL extracted text (${access.count} ${access.unit}) is saved on this machine.`,
    "Use read_document_part to read any range you actually need before answering about it. Never claim to have read a part the tool did not return.",
  ].join("\n");
}
