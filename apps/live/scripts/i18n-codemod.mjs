// Extract user-visible English copy from the live app into the i18n tables and replace
// each site with a `t()` call (docs/specs/004-interface-design/localization.md).
//
//   node scripts/i18n-codemod.mjs --dry  <files...>   # show what would change
//   node scripts/i18n-codemod.mjs        <files...>   # rewrite the files
//
// Why a compiler, not a regex: inserting `const { t } = useTranslation()` needs to know
// which function a string sits in, and a regex cannot tell a component from a data table.
// The English table keeps the ORIGINAL text as its value, so a rewritten file renders
// byte-for-byte what it rendered before — which is what keeps 10k existing tests green.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ATTRS = new Set(['title', 'aria-label', 'placeholder', 'alt', 'description', 'label', 'cta']);
const PROPS = new Set(['title', 'label', 'description', 'cta', 'placeholder', 'message', 'header']);

// JSX decodes HTML entities in text; a message table does not. Measured: a heading
// written `Couldn&apos;t load your shape libraries.` renders with an apostrophe in JSX and
// as the literal "&apos;" once it comes back from a table — which turned seven test files
// red. Entities are decoded on the way in, so the stored value is what the reader saw.
const ENTITIES = {
  apos: "'", quot: '"', amp: '&', lt: '<', gt: '>', nbsp: '\u00a0',
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c',
  sbquo: '\u201a', bdquo: '\u201e', lsaquo: '\u2039', rsaquo: '\u203a',
  hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', minus: '\u2212',
  times: '\u00d7', divide: '\u00f7', plusmn: '\u00b1', frac12: '\u00bd',
  deg: '\u00b0', micro: '\u00b5', para: '\u00b6', sect: '\u00a7',
  middot: '\u00b7', bull: '\u2022', dagger: '\u2020', permil: '\u2030',
  copy: '\u00a9', reg: '\u00ae', trade: '\u2122', euro: '\u20ac',
  pound: '\u00a3', yen: '\u00a5', cent: '\u00a2', circ: '\u02c6', tilde: '\u02dc',
  ensp: ' ', emsp: ' ', thinsp: ' ', shy: '\u00ad', zwnj: '', zwj: '', lrm: '', rlm: '',
};

export function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
}

/**
 * What JSX renders for a text node. JSX strips the whitespace that runs to a newline on
 * either side and joins the remaining lines with a single space, so
 *
 *     Start Sheet {index}
 *       over? Every cell…
 *
 * renders "… 1 over?" — NOT "… 1  over?" and not "… 1over?". Both mistakes were made
 * here before this function existed, and both turned assertions red. Whitespace that does
 * not touch a newline is inside a line and is kept verbatim.
 */
export function jsxTextValue(raw) {
  const lines = raw.split('\n');
  return lines
    .map((line, i) => {
      let out = line;
      if (i > 0) out = out.replace(/^[ \t]+/, '');
      if (i < lines.length - 1) out = out.replace(/[ \t]+$/, '');
      return out;
    })
    .filter((line) => line !== '')
    .join(' ');
}

/**
 * Stricter than isTranslatable: this decides whether a string in a STATEMENT position is
 * interface copy rather than an identifier, a CSS token, a constant or an email. Anything
 * it lets through still renders identically (the English table keeps the original text),
 * so the cost of a false positive is one unused key — but a false positive that lands in
 * module scope would break the file, which the scope check above already prevents.
 */
export function looksLikeCopy(text) {
  const t = text.trim();
  if (t.length < 4 || t.length > 200) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (!/\s/.test(t)) return false; // single words are already caught as JSX text or a prop
  if (/[{}<>]|:\/\/|^\/|^\.|^#/.test(t)) return false;
  if (/[:\[\]\/]/.test(t)) return false; // tailwind variant, arbitrary value, url path
  if (/^[a-z]+(?:[A-Z][a-z0-9]+)+$/.test(t)) return false;
  if (/^[^\s@]+@[^\s@]+$/.test(t)) return false;
  // Measured: without this, "rounded-none border-0 px-3.5 py-3" and a hundred more class
  // lists were captured as copy — every whitespace-separated token lowercase-and-hyphenated.
  if (t.split(/\s+/).every((token) => /^-?[a-z][a-z0-9.-]*$/.test(token))) return false;
  if (/^(?:rgb|hsl|var|calc)\(/.test(t)) return false; // a colour or length function
  if (/^[Mm][\d.,\s-]*[a-zA-Z]/.test(t)) return false; // an SVG path
  if (/^(?:ui-|system-ui|sans-serif|serif|monospace|-apple-system)/.test(t)) return false; // a font stack
  if (/^\d+(?:\.\d+)?(?:px|em|rem|%)?\s+\d/.test(t)) return false; // "6px 6px"
  if (/\b(?:flex|grid|block|hidden|absolute|relative|inline|rounded|px|py|pt|pb|pl|pr|gap|items|justify|font|leading|tracking|opacity|ring|shadow|transition|hover|focus|dark|sm|md|lg|xl|bg|text|border|w|h|m|p|top|left|right|bottom|z|overflow|truncate|cursor|select)-/.test(t)) return false;
  return true;
}

/** Letters, at least two words or a UI-ish single word, no code. */
export function isTranslatable(raw) {
  const text = raw.trim();
  if (text.length < 2 || text.length > 120) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/[{}<>]/.test(text)) return false;
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(text)) return false; // css-ish token
  if (/^https?:|^\/|^\.|\.(ts|tsx|css|json|png|svg)$/.test(text)) return false;
  return true;
}

export function keyFor(relFile, text, used) {
  const stem = path
    .basename(relFile)
    .replace(/\.(tsx?|ts)$/, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .toLowerCase();
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 6)
    .join('-');
  let key = `${stem}.${slug}`;
  let n = 2;
  while (used.has(key)) key = `${stem}.${slug}-${n++}`;
  used.add(key);
  return key;
}

/** The nearest enclosing function whose name starts uppercase — a component. */
function enclosingComponent(node) {
  let current = node.parent;
  while (current) {
    if (
      (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current)) &&
      current.parent &&
      (ts.isVariableDeclaration(current.parent) || ts.isFunctionDeclaration(current))
    ) {
      const name = ts.isFunctionDeclaration(current)
        ? current.name?.getText()
        : current.parent.name.getText();
      if (name && /^[A-Z]/.test(name)) return current;
    }
    current = current.parent;
  }
  return null;
}

function bodyOf(fn) {
  return ts.isArrowFunction(fn) && !ts.isBlock(fn.body) ? null : fn.body;
}

/**
 * `const { t } = useTranslation()` that an earlier pass inserted is the binding we want to
 * USE, not one to avoid — treating it as a shadow made the second pass skip every file it
 * had already touched (measured: the dark-theme banner stayed English).
 */
function isOurOwnHook(decl) {
  const init = decl.initializer;
  return Boolean(
    init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'useTranslation',
  );
}

function nameBinds(name, target) {
  if (ts.isIdentifier(name)) return name.text === target;
  let found = false;
  ts.forEachChild(name, (child) => {
    if (!found && nameBinds(child, target)) found = true;
  });
  return found;
}

/**
 * Is a name `t` already in scope at this node? A theme object, a prop, a loop index — and,
 * measured the hard way, the CALLBACK PARAMETER of a `themes.map((t) => …)`, which sits
 * between the string and the component the hook would be inserted into. Shadowing any of
 * them stops the file compiling, so a string with a `t` anywhere above it is left to a
 * hand edit rather than rewritten.
 */
function hasTInScope(node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) {
      for (const param of current.parameters) if (nameBinds(param.name, 't')) return true;
    }
    if (ts.isVariableDeclaration(current) && nameBinds(current.name, 't') && !isOurOwnHook(current)) {
      return true;
    }
    if (ts.isBlock(current)) {
      for (const statement of current.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const decl of statement.declarationList.declarations) {
          if (nameBinds(decl.name, 't') && !isOurOwnHook(decl)) return true;
        }
      }
    }
    current = current.parent;
  }
  return false;
}

export function processFile(relFile, source, usedKeys) {
  const sf = ts.createSourceFile(relFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const entries = [];
  const needsHook = new Set();

  // A string OUTSIDE a component cannot be rewritten: a module-level data table has no
  // `t` to call, and inventing one would break the module at import time. Those tables
  // (palette tile definitions, the settings catalogue, the shortcut sections) are handled
  // separately — the codemod reports nothing for them rather than producing broken code.
  const record = (node, text) => {
    const fn = enclosingComponent(node);
    if (!fn || !bodyOf(fn)) return null;
    if (hasTInScope(node)) return null;
    const value = decodeEntities(text);
    const key = keyFor(relFile, value, usedKeys);
    entries.push({ key, text: value });
    needsHook.add(fn);
    return key;
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      // The value carries what JSX would have rendered, whitespace included, so the
      // replacement is nothing but the call — no leftover indentation, no doubled space.
      const value = jsxTextValue(node.text);
      if (isTranslatable(value)) {
        const key = record(node, value);
        if (key) {
          // getFullStart(), NOT getStart(): the TypeScript scanner treats a JSX text
          // node's leading whitespace as trivia, so getStart() points at the first
          // non-blank character and the whitespace before it survives the splice — which
          // rendered "Allow  Acme Editor" (two spaces) once the node became a call.
          edits.push({ start: node.getFullStart(), end: node.getEnd(), text: `{t('${key}')}` });
        }
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText();
      if (ATTRS.has(name) && isTranslatable(node.initializer.text)) {
        const key = record(node, node.initializer.text);
        if (key) {
          edits.push({
            start: node.initializer.getStart(sf),
            end: node.initializer.getEnd(),
            text: `{t('${key}')}`,
          });
        }
      }
    } else if (
      ts.isPropertyAssignment(node) &&
      ts.isStringLiteral(node.initializer) &&
      /^[A-Za-z_$][\w$]*$/.test(node.name.getText()) &&
      PROPS.has(node.name.getText()) &&
      isTranslatable(node.initializer.text)
    ) {
      const key = record(node, node.initializer.text);
      if (key) {
        edits.push({
          start: node.initializer.getStart(sf),
          end: node.initializer.getEnd(),
          text: `t('${key}')`,
        });
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // A string in a statement position: `const title = toDark ? 'A' : 'B'`, `return 'X'`,
      // an array of labels. Measured as the second gap after the JSX/property pass: the
      // dark-theme banner's two sentences lived here and stayed English.
      const parent = node.parent;
      const handledElsewhere =
        ts.isJsxAttribute(parent) ||
        ts.isPropertyAssignment(parent) ||
        ts.isImportDeclaration(parent) ||
        ts.isExportDeclaration(parent) ||
        ts.isLiteralTypeNode(parent) ||
        ts.isImportSpecifier(parent) ||
        ts.isExternalModuleReference(parent);
      const statementish =
        ts.isVariableDeclaration(parent) ||
        ts.isConditionalExpression(parent) ||
        ts.isReturnStatement(parent) ||
        ts.isArrayLiteralExpression(parent) ||
        ts.isBinaryExpression(parent) ||
        ts.isParenthesizedExpression(parent);
      if (!handledElsewhere && statementish && looksLikeCopy(node.text)) {
        const key = record(node, node.text);
        if (key) edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `t('${key}')` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (edits.length === 0) return { code: source, entries };

  // The hook goes in at the top of each component that now needs it.
  for (const fn of needsHook) {
    const body = bodyOf(fn);
    if (!body) continue;
    const already = body.statements.some(
      (s) =>
        ts.isVariableStatement(s) &&
        s.declarationList.declarations.some((d) => d.initializer && /useTranslation\(\)/.test(d.initializer.getText())),
    );
    if (already) continue;
    const open = body.getStart(sf) + 1;
    edits.push({ start: open, end: open, text: `\n  const { t } = useTranslation();` });
  }

  const hasImport = /from '@\/lib\/i18n'/.test(source);
  if (!hasImport) {
    // A leading directive ('use client') must stay the FIRST statement, so the import goes
    // after the last directive rather than at offset 0 — putting it first silently turned
    // client components into server ones and failed the build.
    const statements = sf.statements;
    let insertAt = statements.length > 0 ? statements[0].getStart(sf) : 0;
    for (const statement of statements) {
      const isDirective =
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        (statement.expression.text === 'use client' || statement.expression.text === 'use strict');
      if (isDirective) insertAt = statement.getEnd();
      else break;
    }
    edits.push({ start: insertAt, end: insertAt, text: `\nimport { useTranslation } from '@/lib/i18n';` });
  }

  edits.sort((a, b) => b.start - a.start);
  let code = source;
  for (const e of edits) code = code.slice(0, e.start) + e.text + code.slice(e.end);
  return { code, entries };
}


// --- CLI -------------------------------------------------------------------
//   node apps/live/scripts/i18n-codemod.mjs --dry   [--limit N]
//   node apps/live/scripts/i18n-codemod.mjs --apply [--limit N]
//
// Scans apps/live, takes the N files with the most extractable strings (default: all),
// rewrites them, and folds the new keys into lib/i18n/messages/{en,zh}.ts — keeping every
// translation zh.ts already has.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIVE = path.resolve(HERE, '..');
const APP_ROOT = path.resolve(LIVE, '..', '..');

function sources(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || /node_modules|\.next|out|dist|__fixtures__/.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

function tableFrom(file) {
  const map = new Map();
  let source = '';
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    return map;
  }
  // The generator writes JSON-quoted keys, so the reader must read JSON-quoted keys.
  // Reading only single quotes silently emptied the table once, which is a mistake worth
  // a comment: every `t()` in the app fell back to its own key.
  for (const line of source.split('\n')) {
    const hit = line.match(/^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*"),$/);
    if (hit) map.set(JSON.parse(hit[1]), JSON.parse(hit[2]));
  }
  return map;
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Number.POSITIVE_INFINITY;

  const enFile = path.join(LIVE, 'lib/i18n/messages/en.ts');
  const zhFile = path.join(LIVE, 'lib/i18n/messages/zh.ts');
  const en = tableFrom(enFile);
  const zh = tableFrom(zhFile);
  const used = new Set(en.keys());

  const rows = [];
  for (const file of sources(LIVE)) {
    const rel = path.relative(APP_ROOT, file).replace(/\\/g, '/');
    if (rel.includes('lib/i18n/messages')) continue;
    const source = readFileSync(file, 'utf8');
    // A page/layout directly under app/ with no 'use client' is a Server Component; a hook
    // inserted there cannot run (measured: the /workbench/pair prerender died on it).
    if (/^app\/.*(page|layout)\.tsx?$/.test(rel) && !/^['"]use client['"]/m.test(source)) continue;
    try {
      const { code, entries } = processFile(rel, source, used);
      if (entries.length > 0 && code !== source) rows.push({ file, n: entries.length, code, entries });
    } catch {
      // A file the compiler cannot parse is left untouched rather than half-rewritten.
    }
  }
  rows.sort((a, b) => b.n - a.n);
  const batch = rows.slice(0, limit);
  const added = batch.flatMap((row) => row.entries);

  console.log(`candidates: ${rows.length} files / ${rows.reduce((s, r) => s + r.n, 0)} strings`);
  console.log(`batch     : ${batch.length} files / ${added.length} strings`);
  console.log(`remaining : ${rows.length - batch.length} files / ${rows.slice(batch.length).reduce((s, r) => s + r.n, 0)} strings`);
  if (!apply) return;

  for (const row of batch) writeFileSync(row.file, row.code);
  for (const entry of added) en.set(entry.key, entry.text);

  const body = (map) => [...map.entries()].map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  writeFileSync(
    enFile,
    `// The English table — the SOURCE of every user-visible string in the live app\n` +
      `// (docs/specs/004-interface-design/localization.md). Other locales are typed against its\n` +
      `// keys, so adding one here is a compile error everywhere it is not translated yet.\n//\n` +
      `// Most of this file is generated by \`scripts/i18n-codemod.mjs\`. A generated value is\n` +
      `// always the exact English JSX rendered, so a rewritten component renders identically.\n` +
      `export const en = {\n${body(en)}\n} as const;\n`,
  );
  const merged = new Map([...en.keys()].map((key) => [key, zh.get(key) ?? en.get(key)]));
  writeFileSync(
    zhFile,
    `import type { en } from './en';\n\n` +
      `// 简体中文 (docs/specs/004-interface-design/localization.md). Typed against the English\n` +
      `// table: a key that exists there and not here is a compile error.\n//\n` +
      `// A value still equal to its English source is UNTRANSLATED. Translate in place; never\n` +
      `// leave a value empty.\nexport const zh: Record<keyof typeof en, string> = {\n${body(merged)}\n};\n`,
  );
  console.log(`tables    : en ${en.size} keys, zh ${[...en.keys()].filter((k) => zh.has(k)).length} translated`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
