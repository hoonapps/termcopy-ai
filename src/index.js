const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

const STRUCTURAL_LINE_PATTERN =
  /^\s*(?:[-*+] |[•◦▪▫] |\d+[.)] |#{1,6} |```|~~~|\| |>|\[[ xX]\] )/;

const HARD_END_PATTERN = /[.!?。！？…)]["')\]]?$/;

export function cleanTerminalText(input, options = {}) {
  const mode = options.mode ?? "smart";
  const stripAnsi = options.stripAnsi ?? true;
  const original = String(input ?? "");
  const normalized = normalizeNewlines(stripAnsi ? stripAnsiCodes(original) : original);

  if (mode === "raw") {
    return buildResult(original, normalized);
  }

  if (mode === "lines") {
    return buildResult(original, trimRightPerLine(normalized));
  }

  if (mode === "paragraph") {
    return buildResult(original, paragraphJoin(normalized));
  }

  if (mode !== "smart") {
    throw new Error(`Unsupported mode "${mode}". Use smart, paragraph, lines, or raw.`);
  }

  return buildResult(original, smartJoin(normalized));
}

export function stripAnsiCodes(text) {
  return text.replace(ANSI_PATTERN, "");
}

export function normalizeNewlines(text) {
  return text.replace(/\r\n?/g, "\n");
}

export function hasPipedInput() {
  return !process.stdin.isTTY;
}

export function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
      input += chunk;
    });
    process.stdin.on("end", () => resolve(input));
    process.stdin.on("error", reject);
  });
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatStats(result) {
  const lineLabel = result.linesRemoved === 1 ? "line break" : "line breaks";
  return `${result.linesRemoved} ${lineLabel} removed, ${result.characters} characters`;
}

function trimRightPerLine(text) {
  return text
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n");
}

function paragraphJoin(text) {
  return text
    .split(/\n{2,}/)
    .map(paragraph =>
      paragraph
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .join(" ")
    )
    .join("\n\n");
}

function smartJoin(text) {
  const lines = text.split("\n");
  const output = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^\s*(```|~~~)/.test(line)) {
      output.push(line.trimEnd());
      inFence = !inFence;
      continue;
    }

    if (inFence || trimmed === "") {
      output.push(line.trimEnd());
      continue;
    }

    const previous = output[output.length - 1];
    if (previous && shouldJoin(previous, line)) {
      output[output.length - 1] = joinLines(previous, line);
    } else {
      output.push(line.trimEnd());
    }
  }

  return output.join("\n");
}

function shouldJoin(previous, current) {
  if (!previous || !current.trim()) {
    return false;
  }

  const previousTrimmed = previous.trimEnd();
  const currentTrimmed = current.trimStart();

  if (STRUCTURAL_LINE_PATTERN.test(current)) {
    return false;
  }

  if (looksLikeCode(previous) || looksLikeCode(current)) {
    return false;
  }

  if (isBulletContinuation(previous, current)) {
    return true;
  }

  if (
    /^\s{1,6}\S/.test(current) &&
    (!HARD_END_PATTERN.test(previousTrimmed) || previousTrimmed.length >= 24)
  ) {
    return true;
  }

  if (!HARD_END_PATTERN.test(previousTrimmed) && previousTrimmed.length >= 50) {
    return true;
  }

  return (
    previousTrimmed.length >= 72 &&
    /^[\p{L}\p{N}"'([`]/u.test(currentTrimmed)
  );
}

function isBulletContinuation(previous, current) {
  return (
    /^\s*(?:[-*+] |[•◦▪▫] |\d+[.)] )/.test(previous) &&
    /^\s{1,8}\S/.test(current) &&
    !STRUCTURAL_LINE_PATTERN.test(current)
  );
}

function looksLikeCode(line) {
  if (/^\s{4,}\S/.test(line)) {
    return true;
  }

  return /^\s*(?:const|let|var|import|export|function|class|if|for|while|return)\b/.test(
    line
  );
}

function joinLines(previous, current) {
  const left = previous.trimEnd();
  const right = current.trim();

  if (!left) {
    return right;
  }

  if (/[-/([{]$/.test(left)) {
    return left + right;
  }

  return `${left} ${right}`;
}

function buildResult(original, text) {
  const originalLines = normalizeNewlines(original).split("\n").length;
  const newLines = text.split("\n").length;

  return {
    text,
    original,
    characters: text.length,
    linesRemoved: Math.max(0, originalLines - newLines)
  };
}
