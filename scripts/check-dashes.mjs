// Fails the build if any source file contains an em dash (U+2014).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const EXT = /\.(ts|tsx|css)$/;
const EM_DASH = "\u2014";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes(EM_DASH)) hits.push(`${relative(process.cwd(), file)}:${i + 1}`);
    });
}

if (hits.length) {
  console.error(`Em dashes found (${hits.length}):\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("No em dashes found in src/.");
