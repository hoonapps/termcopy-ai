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

Install the background cleaner once:

```bash
termcopy install
```

Now use Codex normally:

1. Select exactly the Codex response text you want in the terminal.
2. Press `Cmd+C`.
3. Paste anywhere.

The copied text is cleaned automatically in the background. You do not need to pipe Codex through another command.

## Why There Is No Floating Button

Native terminal apps do not expose a standard JavaScript or npm API that lets a CLI package detect a drag selection and draw a floating "Copy" button inside the terminal window.

`termcopy-ai` uses the most reliable terminal-friendly workflow instead:

1. `termcopy install` installs a tiny macOS LaunchAgent.
2. The LaunchAgent watches your clipboard in the background.
3. When you copy visually wrapped Codex output, it rewrites the clipboard as clean paragraphs.

If you do not want a background helper, use `termcopy fix` manually after copying.

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

### `termcopy install`

Install the macOS background cleaner:

```bash
termcopy install
```

After this, normal terminal selection plus `Cmd+C` is enough. The cleaner starts immediately and restarts at login.

### `termcopy uninstall`

Remove the macOS background cleaner:

```bash
termcopy uninstall
```

### `termcopy status`

Show whether the background cleaner is installed:

```bash
termcopy status
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

Clean Codex selections without changing how you run Codex:

```bash
termcopy install
codex
```

Then select text inside Codex, press `Cmd+C`, and paste the cleaned text.

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
