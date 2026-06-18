import assert from "node:assert/strict";
import test from "node:test";
import { cleanTerminalText, stripAnsiCodes } from "../src/index.js";

test("unwraps visually wrapped AI bullet text", () => {
  const input = `• The current code shows ask() runs search, checklist, and approval in order and only logs\n  the result. This is not the model choosing; the code is choosing.`;

  const result = cleanTerminalText(input);

  assert.equal(
    result.text,
    "• The current code shows ask() runs search, checklist, and approval in order and only logs the result. This is not the model choosing; the code is choosing."
  );
  assert.equal(result.linesRemoved, 1);
});

test("handles Korean wrapped text", () => {
  const input = `• 현재 코드를 보니 실제로 ask()가 검색, 체크리스트, 승인 요청을 순서대로 실행하고 로그\n  만 남깁니다. 이 피드백처럼 “모델이 선택했다”가 아니라 “코드가 선택했다”입니다.`;

  const result = cleanTerminalText(input);

  assert.equal(
    result.text,
    "• 현재 코드를 보니 실제로 ask()가 검색, 체크리스트, 승인 요청을 순서대로 실행하고 로그 만 남깁니다. 이 피드백처럼 “모델이 선택했다”가 아니라 “코드가 선택했다”입니다."
  );
});

test("removes common Codex UI indentation from selected prose", () => {
  const input = `  codex

  안에서 원하는 답변 부분을 드래그 → Cmd+C → 붙여넣기 하면 됩니다.

  만약 termcopy install에서 에러가 나면 그 출력 그대로 보내줘. 그 경우 LaunchAgent 로딩
  문제를 바로 고치면 됩니다.`;

  const result = cleanTerminalText(input);

  assert.equal(
    result.text,
    "codex\n\n안에서 원하는 답변 부분을 드래그 → Cmd+C → 붙여넣기 하면 됩니다.\n\n만약 termcopy install에서 에러가 나면 그 출력 그대로 보내줘. 그 경우 LaunchAgent 로딩 문제를 바로 고치면 됩니다."
  );
});

test("removes Codex UI indentation before unwrapping bullets", () => {
  const input = `  • 현재 코드를 보니 실제로 ask()가 검색, 체크리스트, 승인 요청을 순서대로 실행하고 로그
    만 남깁니다.`;

  const result = cleanTerminalText(input);

  assert.equal(
    result.text,
    "• 현재 코드를 보니 실제로 ask()가 검색, 체크리스트, 승인 요청을 순서대로 실행하고 로그 만 남깁니다."
  );
});

test("preserves separate bullets", () => {
  const input = `- First item\n- Second item\n  continued detail`;

  const result = cleanTerminalText(input);

  assert.equal(result.text, "- First item\n- Second item continued detail");
});

test("preserves fenced code blocks", () => {
  const input = "```js\nconst value = 1;\n  console.log(value);\n```\nAfter the block\n  continues here";

  const result = cleanTerminalText(input);

  assert.equal(
    result.text,
    "```js\nconst value = 1;\n  console.log(value);\n```\nAfter the block continues here"
  );
});

test("paragraph mode joins every non-empty line inside paragraphs", () => {
  const input = "One\nline\n\nTwo\nline";

  const result = cleanTerminalText(input, { mode: "paragraph" });

  assert.equal(result.text, "One line\n\nTwo line");
});

test("lines mode only trims line endings", () => {
  const input = "One  \n  Two";

  const result = cleanTerminalText(input, { mode: "lines" });

  assert.equal(result.text, "One\n  Two");
});

test("raw mode only normalizes newlines by default", () => {
  const input = "One\r\nTwo";

  const result = cleanTerminalText(input, { mode: "raw" });

  assert.equal(result.text, "One\nTwo");
});

test("strips ANSI escape sequences", () => {
  assert.equal(stripAnsiCodes("\u001B[31mred\u001B[0m"), "red");
});
