#!/usr/bin/env node

import { Command } from "commander";
import clipboard from "clipboardy";
import {
  cleanTerminalText,
  formatStats,
  hasPipedInput,
  readStdin,
  sleep
} from "../src/index.js";

const program = new Command();

program
  .name("termcopy")
  .description("Copy AI terminal output without accidental visual line breaks.")
  .version("0.1.0")
  .option("-m, --mode <mode>", "cleaning mode: smart, paragraph, lines, raw", "smart")
  .option("--no-strip-ansi", "keep ANSI escape sequences")
  .option("--no-copy", "print cleaned text without writing to the clipboard")
  .option("-p, --print", "print cleaned text to stdout")
  .option("-q, --quiet", "hide status messages")
  .action(async options => {
    if (hasPipedInput()) {
      await copyFromStdin(options);
      return;
    }

    await fixClipboard(options);
  });

program
  .command("copy")
  .description("Read stdin, clean it, and write it to the clipboard.")
  .option("-m, --mode <mode>", "cleaning mode: smart, paragraph, lines, raw", "smart")
  .option("--no-strip-ansi", "keep ANSI escape sequences")
  .option("--no-copy", "print cleaned text without writing to the clipboard")
  .option("-p, --print", "print cleaned text to stdout")
  .option("-q, --quiet", "hide status messages")
  .action(copyFromStdin);

program
  .command("fix")
  .description("Clean the current clipboard text and write it back.")
  .option("-m, --mode <mode>", "cleaning mode: smart, paragraph, lines, raw", "smart")
  .option("--no-strip-ansi", "keep ANSI escape sequences")
  .option("--no-copy", "print cleaned text without writing to the clipboard")
  .option("-p, --print", "print cleaned text to stdout")
  .option("-q, --quiet", "hide status messages")
  .action(fixClipboard);

program
  .command("watch")
  .description("Watch the clipboard and automatically clean newly copied terminal selections.")
  .option("-m, --mode <mode>", "cleaning mode: smart, paragraph, lines, raw", "smart")
  .option("--no-strip-ansi", "keep ANSI escape sequences")
  .option("-i, --interval <ms>", "clipboard polling interval in milliseconds", parseInterval, 500)
  .option("-q, --quiet", "hide status messages")
  .action(watchClipboard);

program.parseAsync(process.argv).catch(error => {
  process.stderr.write(`termcopy: ${error.message}\n`);
  process.exitCode = 1;
});

async function copyFromStdin(options) {
  const input = await readStdin();
  await writeCleaned(input, options, "Copied");
}

async function fixClipboard(options) {
  const input = await clipboard.read();
  await writeCleaned(input, options, "Fixed clipboard");
}

async function writeCleaned(input, options, label) {
  const result = cleanTerminalText(input, {
    mode: options.mode,
    stripAnsi: options.stripAnsi
  });

  if (options.copy !== false) {
    await clipboard.write(result.text);
  }

  if (options.print) {
    process.stdout.write(result.text);
    if (result.text && !result.text.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if (!options.quiet) {
    process.stderr.write(`${label}: ${formatStats(result)}\n`);
  }
}

async function watchClipboard(options) {
  let lastSeen = await clipboard.read().catch(() => "");
  let lastWritten = lastSeen;

  if (!options.quiet) {
    process.stderr.write(
      `Watching clipboard every ${options.interval}ms. Press Ctrl+C to stop.\n`
    );
  }

  while (true) {
    await sleep(options.interval);

    const current = await clipboard.read().catch(() => lastSeen);
    if (current === lastSeen || current === lastWritten) {
      continue;
    }

    lastSeen = current;
    const result = cleanTerminalText(current, {
      mode: options.mode,
      stripAnsi: options.stripAnsi
    });

    if (result.text !== current) {
      await clipboard.write(result.text);
      lastWritten = result.text;

      if (!options.quiet) {
        process.stderr.write(`Cleaned clipboard: ${formatStats(result)}\n`);
      }
    }
  }
}

function parseInterval(value) {
  const interval = Number.parseInt(value, 10);
  if (!Number.isFinite(interval) || interval < 100) {
    throw new Error("interval must be a number greater than or equal to 100");
  }

  return interval;
}
