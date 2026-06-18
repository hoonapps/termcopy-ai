import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

export async function installLaunchAgent(options = {}) {
  assertMacOS();

  const plistPath = getLaunchAgentPath();
  const logDir = path.join(homedir(), "Library", "Logs");
  const scriptPath = process.argv[1];
  const args = [
    process.execPath,
    scriptPath,
    "watch",
    "--quiet",
    "--mode",
    options.mode ?? "smart",
    "--interval",
    String(options.interval ?? 500)
  ];

  if (options.stripAnsi === false) {
    args.push("--no-strip-ansi");
  }

  const plist = buildLaunchAgentPlist({
    label: LAUNCH_AGENT_LABEL,
    args,
    stdoutPath: path.join(logDir, "termcopy-ai.log"),
    stderrPath: path.join(logDir, "termcopy-ai.error.log")
  });

  await mkdir(path.dirname(plistPath), { recursive: true });
  await writeFile(plistPath, plist, "utf8");
  await unloadLaunchAgent(plistPath);
  await loadLaunchAgent(plistPath);

  return { plistPath };
}

export async function uninstallLaunchAgent() {
  assertMacOS();

  const plistPath = getLaunchAgentPath();
  const installed = await fileExists(plistPath);
  await unloadLaunchAgent(plistPath);

  if (installed) {
    await rm(plistPath, { force: true });
  }

  return { removed: installed, plistPath };
}

export async function getLaunchAgentStatus() {
  const plistPath = getLaunchAgentPath();
  const installed = await fileExists(plistPath);

  return { installed, plistPath };
}

export function formatStats(result) {
  const lineLabel = result.linesRemoved === 1 ? "line break" : "line breaks";
  return `${result.linesRemoved} ${lineLabel} removed, ${result.characters} characters`;
}

const LAUNCH_AGENT_LABEL = "com.hoonapps.termcopy-ai";

function getLaunchAgentPath() {
  return path.join(homedir(), "Library", "LaunchAgents", `${LAUNCH_AGENT_LABEL}.plist`);
}

function assertMacOS() {
  if (process.platform !== "darwin") {
    throw new Error("background install is currently supported on macOS only");
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadLaunchAgent(plistPath) {
  const userId = process.getuid?.();

  if (typeof userId === "number") {
    try {
      await execFileAsync("launchctl", ["bootstrap", `gui/${userId}`, plistPath]);
      await execFileAsync("launchctl", ["kickstart", "-k", `gui/${userId}/${LAUNCH_AGENT_LABEL}`]);
      return;
    } catch {
      // Fall back to the older launchctl interface on older macOS versions.
    }
  }

  await execFileAsync("launchctl", ["load", "-w", plistPath]);
}

async function unloadLaunchAgent(plistPath) {
  const userId = process.getuid?.();

  if (typeof userId === "number") {
    try {
      await execFileAsync("launchctl", ["bootout", `gui/${userId}`, plistPath]);
      return;
    } catch {
      // Not loaded, or older macOS. Try the legacy command and ignore failures.
    }
  }

  try {
    await execFileAsync("launchctl", ["unload", plistPath]);
  } catch {
    // The agent may not be installed yet.
  }
}

function buildLaunchAgentPlist({ label, args, stdoutPath, stderrPath }) {
  const escapedArgs = args.map(arg => `    <string>${escapeXml(arg)}</string>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(label)}</string>
  <key>ProgramArguments</key>
  <array>
${escapedArgs}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${escapeXml(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(stderrPath)}</string>
</dict>
</plist>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
