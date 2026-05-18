import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SCAN_DIRS = ["app", "components"];
const VALID_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".md"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "public"]);

const directPatterns = [
  { regex: /Ã./g, reason: "sequência com 'Ã'" },
  { regex: /Â./g, reason: "sequência com 'Â'" },
  { regex: /\uFFFD/g, reason: "caractere de substituição '�'" },
  { regex: /\u00AD/g, reason: "soft hyphen invisível" }
];

const contextPatterns = [
  { regex: /[A-Za-zÀ-ÿ]§[A-Za-zÀ-ÿ]/gu, reason: "uso de '§' dentro de palavra" },
  { regex: /[A-Za-zÀ-ÿ]ª[A-Za-zÀ-ÿ]/gu, reason: "uso de 'ª' dentro de palavra" },
  { regex: /[A-Za-zÀ-ÿ]©[A-Za-zÀ-ÿ]/gu, reason: "uso de '©' dentro de palavra" }
];

function toRelative(filePath) {
  return path.relative(ROOT_DIR, filePath).replaceAll("\\", "/");
}

function getLineFromIndex(content, index) {
  const before = content.slice(0, index);
  const line = before.split("\n").length;
  return line;
}

async function collectFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (VALID_EXTENSIONS.has(extension)) {
      files.push(entryPath);
    }
  }

  return files;
}

function findIssues(content) {
  const issues = [];

  for (const pattern of [...directPatterns, ...contextPatterns]) {
    for (const match of content.matchAll(pattern.regex)) {
      issues.push({
        index: match.index ?? 0,
        snippet: match[0],
        reason: pattern.reason
      });
    }
  }

  return issues;
}

async function main() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const fullPath = path.join(ROOT_DIR, dir);
    files.push(...(await collectFiles(fullPath)));
  }

  const report = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const issues = findIssues(content);
    if (!issues.length) continue;

    for (const issue of issues) {
      report.push({
        file: toRelative(filePath),
        line: getLineFromIndex(content, issue.index),
        reason: issue.reason,
        snippet: issue.snippet
      });
    }
  }

  if (!report.length) {
    console.log("OK: nenhum texto com padrão de codificação quebrada encontrado.");
    return;
  }

  console.error("ERRO: padrões de codificação quebrada encontrados:");
  for (const item of report.slice(0, 80)) {
    console.error(`- ${item.file}:${item.line} -> ${item.reason} (${JSON.stringify(item.snippet)})`);
  }
  if (report.length > 80) {
    console.error(`... e mais ${report.length - 80} ocorrências.`);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error("Falha ao validar codificação:", error);
  process.exit(1);
});
