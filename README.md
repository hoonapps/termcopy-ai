# termcopy-ai

Copy AI terminal output cleanly.

`termcopy-ai` fixes the annoying copy/paste shape you get when terminal text is visually wrapped:

```text
• The current code shows ask() runs search, checklist, and approval in order and only logs
  the result. This is not the model choosing; the code is choosing.
```

It turns that into:

```text
• The current code shows ask() runs search, checklist, and approval in order and only logs the result. This is not the model choosing; the code is choosing.
```

It is built for AI CLI tools such as Codex, Claude Code, Gemini CLI, OpenAI CLI wrappers, and any command that prints long prose in a terminal.

## Install

```bash
npm install --global termcopy-ai
```

During local development:

```bash
git clone https://github.com/hoonapps/termcopy-ai.git
cd termcopy-ai
npm install
npm link
```

## Quick Start

Copy command output directly:

```bash
codex "explain this file" | termcopy
```

Clean text that is already in your clipboard:

```bash
termcopy fix
```

Run a clipboard watcher:

```bash
termcopy watch
```

With `watch` running, select terminal text, press your normal copy shortcut, and `termcopy-ai` rewrites the clipboard into clean paragraphs automatically.

## Why There Is No Floating Button

Native terminal apps do not expose a standard JavaScript or npm API that lets a CLI package detect a drag selection and draw a floating "Copy" button inside the terminal window.

`termcopy-ai` uses the most reliable terminal-friendly workflow instead:

1. Select exactly the text you want.
2. Press your normal copy shortcut.
3. Run `termcopy fix`, or keep `termcopy watch` running.
4. Paste clean text anywhere.

For a one-key workflow, bind this command in Raycast, Alfred, Keyboard Maestro, macOS Shortcuts, or your terminal hotkey tool:

```bash
termcopy fix --quiet
```

## Commands

### `termcopy`

If text is piped in, it cleans stdin and writes the result to the clipboard:

```bash
some-ai-command | termcopy
```

If no text is piped in, it behaves like `termcopy fix` and cleans the current clipboard.

### `termcopy copy`

Always read from stdin:

```bash
pbpaste | termcopy copy
```

### `termcopy fix`

Read the current clipboard, clean it, and write it back:

```bash
termcopy fix
```

### `termcopy watch`

Poll the clipboard and clean newly copied terminal selections:

```bash
termcopy watch --interval 300
```

## Options

```text
-m, --mode <mode>       smart, paragraph, lines, raw
--no-strip-ansi         keep ANSI escape sequences
--no-copy               print without writing to clipboard
-p, --print             print cleaned text to stdout
-q, --quiet             hide status messages
```

Modes:

- `smart`: default; unwrap visual terminal line breaks while preserving bullets and code fences.
- `paragraph`: join all non-empty lines inside each paragraph.
- `lines`: trim trailing spaces but keep line breaks.
- `raw`: only normalize newlines.

## Examples

Copy and show the cleaned result:

```bash
codex "review this change" | termcopy --print
```

Clean your clipboard aggressively:

```bash
termcopy fix --mode paragraph
```

Use the shorter alias:

```bash
claude "summarize this" | tcai
```

## API

```js
import { cleanTerminalText } from "termcopy-ai";

const result = cleanTerminalText(text, { mode: "smart" });

console.log(result.text);
```

## Publishing

This package is ready for npm publishing:

```bash
npm login
npm test
npm pack --dry-run
npm publish
```

## License

MIT
