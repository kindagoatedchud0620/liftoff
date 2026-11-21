// Fails the build if any source file contains an em dash (U+2014), or if a .tsx file
// shows a forbidden acronym to the user (JSX text, attribute strings, string literals).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const EXT = /\.(ts|tsx|css)$/;
const EM_DASH = "—";
// Whole-word, case-sensitive. "lb", "in", "%", "k" and seconds like "60s" stay allowed.
const FORBIDDEN = /\b(e1RM|1RM|RPE|LP|PRs?|XP|3D|1M|3M|6M|1Y|ALL|BW|BF)\b/;
const STRING = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const rel = (f) => relative(process.cwd(), f);
const dashHits = [];
const acronymHits = [];

/** Strings a user can see: JSX text, attribute values and string literals, minus object keys and styling/test hooks. */
function visibleTexts(line) {
  const code = line.replace(/\b(className|data-testid|key|href|id|htmlFor)=("[^"]*"|'[^']*'|\{[^}]*\})/g, "");
  const texts = [];
  // Plain JSX text on its own line, e.g. a paragraph spanning several lines.
  if (/^[^=;{}<>[\]`]+$/.test(code.trim()) && !/^(\/\/|\*|\/\*)/.test(code.trim())) texts.push(code.trim());
  for (const m of code.matchAll(/[>}]([^<>{}]+)</g)) texts.push(m[1]);
  for (const m of code.matchAll(STRING)) {
    const before = code.slice(0, m.index).trimEnd();
    const after = code.slice(m.index + m[0].length).trimStart();
    // Object keys such as { "1M": ... } are not shown to users.
    if (/[{,]$/.test(before) && after.startsWith(":")) continue;
    texts.push(m[0].slice(1, -1));
  }
  return texts;
}

for (const file of walk(ROOT)) {
  const isTsx = file.endsWith(".tsx");
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const where = `${rel(file)}:${i + 1}`;
      if (line.includes(EM_DASH)) dashHits.push(where);
      if (!isTsx || /^\s*import\s/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const text of visibleTexts(line)) {
        const hit = text.match(FORBIDDEN);
        if (hit) acronymHits.push(`${where}  "${hit[0]}" in: ${line.trim()}`);
      }
    });
}

let failed = false;
if (dashHits.length) {
  console.error(`Em dashes found (${dashHits.length}):\n${dashHits.join("\n")}`);
  failed = true;
}
if (acronymHits.length) {
  console.error(`Visible acronyms found (${acronymHits.length}):\n${acronymHits.join("\n")}`);
  failed = true;
}
if (failed) process.exit(1);
console.log("No em dashes or visible acronyms found in src/.");
