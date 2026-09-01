const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)\.(\d+)(-dev)?$/;

export function parseVersion(value) {
  const match = VERSION_PATTERN.exec(value);
  if (!match) {
    throw new Error(
      `Version must be w.x.y.z or w.x.y.z-dev (got '${value}').`,
    );
  }

  const numbers = match.slice(1, 5).map(Number);
  if (numbers.some((part) => !Number.isSafeInteger(part))) {
    throw new Error(`Version contains an unsafe numeric segment: '${value}'.`);
  }

  return {
    major: numbers[0],
    minor: numbers[1],
    release: numbers[2],
    build: numbers[3],
    isDev: Boolean(match[5]),
  };
}

export function nextDevVersion(value) {
  const version = parseVersion(value);
  if (!version.isDev && version.build !== 0) {
    throw new Error(
      `Production version '${value}' is invalid: its fourth segment must be 0.`,
    );
  }

  return `${version.major}.${version.minor}.${version.release}.${version.build + 1}-dev`;
}

export function nextProductionVersion(value) {
  const version = parseVersion(value);
  if (!version.isDev || version.build < 1) {
    throw new Error(
      `A formal release must promote a tested -dev build (got '${value}').`,
    );
  }

  return `${version.major}.${version.minor}.${version.release + 1}.0`;
}

export function assertDevVersion(value) {
  const version = parseVersion(value);
  if (!version.isDev || version.build < 1) {
    throw new Error(`Local deployment requires a numbered -dev version (got '${value}').`);
  }
  return value;
}

function runCli() {
  const [, , command, value] = process.argv;
  if (!command || !value) {
    throw new Error(
      "Usage: node scripts/Vaenyx-Version-Policy.mjs <next-dev|next-production|assert-dev> <version>",
    );
  }

  const operations = {
    "next-dev": nextDevVersion,
    "next-production": nextProductionVersion,
    "assert-dev": assertDevVersion,
  };
  const operation = operations[command];
  if (!operation) {
    throw new Error(`Unknown version-policy command '${command}'.`);
  }
  process.stdout.write(`${operation(value)}\n`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
