// The two file tools the Claude subscription backend is lent when — and only
// when — the Owner has switched Fetching on AND named at least one folder.
//
// ⚠ WHY THESE AND NOT THE SDK'S OWN `Read`. The Agent SDK ships Read, Glob and
// Grep, and the obvious-looking route is to allow Read and check each call in a
// permission callback. Three things make that the wrong shape here:
//   • `allowedTools` means auto-approve WITHOUT asking, so a tool listed there
//     never reaches the permission callback at all — the check and the audit
//     row would both silently never run, and nothing would fail loudly;
//   • Glob and Grep take an OPTIONAL path, and Grep with output_mode "content"
//     returns file contents without ever naming a file, so a gate written
//     against `file_path` waves both of them through;
//   • the built-in list grows with the dependency, so a deny-by-name list rots.
// These tools instead run IN THIS PROCESS. The gate is not beside the tool, it
// IS the tool: `access.open` does the containment check, the size cap, the text
// sniff and the audit row, and there is no other way in. The turn that gets
// these is also given `tools: []` — every built-in, Read included, stops
// existing rather than merely being denied.
import {
  createSdkMcpServer,
  type McpSdkServerConfigWithInstance,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { FetchRefusedError, type FetchAccess } from "../core/fetching.js";

const SERVER_NAME = "vaenyx_files";

// The names the SDK gives our tools once the server is attached. They go in
// `allowedTools` so the model is not stopped to ask a question nobody is there
// to answer — safe precisely because the permission is not what protects the
// disk; the handler is.
export const FETCH_TOOL_NAMES = [
  `mcp__${SERVER_NAME}__list_folder`,
  `mcp__${SERVER_NAME}__open_file`,
];

// A refusal is an ANSWER, not a crash: the model is told, in the same words the
// Owner would be told, so it can pass the reason on instead of inventing a
// reason of its own or claiming it read something it did not.
function refusal(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function said(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function reason(error: unknown): string {
  if (error instanceof FetchRefusedError) return error.message;
  return "Vaenyx could not open that.";
}

export function fetchToolServer(
  access: FetchAccess,
): McpSdkServerConfigWithInstance {
  const listFolder = tool(
    "list_folder",
    "List what is in one of the folders the Owner has allowed. Call it with no folder to see everything that is allowed.",
    {
      folder: z
        .string()
        .optional()
        .describe(
          "An allowed folder, or a folder inside one. Leave it out to list every allowed folder.",
        ),
    },
    async (args) => {
      try {
        const entries = access.list(args.folder);
        if (entries.length === 0) return said("That folder is empty.");
        return said(
          entries
            .map(
              (entry) =>
                `${entry.kind === "folder" ? "[folder] " : ""}${entry.name}${
                  entry.kind === "file" ? ` (${entry.bytes} bytes)` : ""
                }`,
            )
            .join("\n"),
        );
      } catch (error) {
        return refusal(reason(error));
      }
    },
  );

  const openFile = tool(
    "open_file",
    "Read one text file from a folder the Owner has allowed. Anything outside those folders is refused.",
    {
      path: z
        .string()
        .describe(
          "The file, either in full or relative to one of the allowed folders.",
        ),
    },
    async (args) => {
      try {
        const file = access.open(args.path);
        return said(`${file.path}\n\n${file.text}`);
      } catch (error) {
        return refusal(reason(error));
      }
    },
  );

  return createSdkMcpServer({
    name: SERVER_NAME,
    version: "1.0.0",
    tools: [listFolder, openFile],
  });
}

// What the model is told it has. Naming the folders is deliberate: without them
// the model guesses at paths, gets refused, and the Owner watches it fail three
// times before it asks what it is allowed to see.
export function fetchToolBriefing(folders: string[]): string {
  return [
    "You can open text files from the folders the Owner has allowed, and only those:",
    ...folders.map((folder) => `  ${folder}`),
    "Use list_folder to see what is there and open_file to read one. Anything outside those folders is refused — if you need something else, say which file you would need and stop. Never claim to have read a file the tool refused.",
  ].join("\n");
}
