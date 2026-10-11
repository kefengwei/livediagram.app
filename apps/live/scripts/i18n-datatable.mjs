// Turns a module-scope copy table into one that carries KEYS instead of English
// (docs/specs/004-interface-design/localization.md). A data table has no `t` to call, so
// the render site translates; the English stays beside the key as the fallback and as
// what the catalogue's own tests compare against.
//
//   node apps/live/scripts/i18n-datatable.mjs --dry   <table.ts>
//   node apps/live/scripts/i18n-datatable.mjs --apply <table.ts>
//
// Only STRING-LITERAL fields on an object literal that also has a string-literal `key`
// are touched: generated rows (a template literal label) are left to a hand edit.
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const FIELDS = ['label', 'description', 'alsoIn'];
// The key prefix, so the same pass serves any table: --namespace palette for the
// palette's catalogue, settings for the settings catalogue.
const NAMESPACE = (() => {
  const i = process.argv.indexOf('--namespace');
  return i >= 0 ? process.argv[i + 1] : 'settings';
})();

export function processTable(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];
  const entries = [];
  const walk = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const props = new Map();
      for (const p of node.properties) {
        if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) props.set(p.name.text, p);
      }
      // A category carries `id` where a row carries `key`; both wear a `label`.
      const idProp = props.get('id');
      if (!props.has('key') && idProp && ts.isStringLiteral(idProp.initializer)) {
        const label = props.get('label');
        if (label && ts.isStringLiteral(label.initializer) && !props.has('labelKey')) {
          const key = `${NAMESPACE}.category.${idProp.initializer.text}.label`;
          entries.push({ key, text: label.initializer.text });
          edits.push({ at: label.getEnd(), text: `, labelKey: '${key}' as const` });
        }
      }
      const keyProp = props.get('key');
      const rowKey =
        keyProp && ts.isStringLiteral(keyProp.initializer) ? keyProp.initializer.text : null;
      if (rowKey) {
        for (const field of FIELDS) {
          const prop = props.get(field);
          if (!prop || !ts.isStringLiteral(prop.initializer)) continue;
          if (props.has(`${field}Key`)) continue;
          const key = `${NAMESPACE}.${rowKey}.${field}`;
          entries.push({ key, text: prop.initializer.text });
          edits.push({ at: prop.getEnd(), text: `, ${field}Key: '${key}' as const` });
        }
        // A choice row's options are copy too ("Top / Footer / Off"), and they live in an
        // array of { id, label } just below the row's own label.
        const options = props.get('options');
        if (options && ts.isArrayLiteralExpression(options.initializer)) {
          for (const element of options.initializer.elements) {
            if (!ts.isObjectLiteralExpression(element)) continue;
            const fields = new Map();
            for (const p of element.properties) {
              if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) fields.set(p.name.text, p);
            }
            const id = fields.get('id');
            const label = fields.get('label');
            if (!id || !ts.isStringLiteral(id.initializer)) continue;
            if (!label || !ts.isStringLiteral(label.initializer)) continue;
            if (fields.has('labelKey')) continue;
            const key = `${NAMESPACE}.${rowKey}.option.${id.initializer.text}`;
            entries.push({ key, text: label.initializer.text });
            edits.push({ at: label.getEnd(), text: `, labelKey: '${key}' as const` });
          }
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
  let code = source;
  for (const e of edits.sort((a, b) => b.at - a.at)) code = code.slice(0, e.at) + e.text + code.slice(e.at);
  return { code, entries };
}

if (process.argv[1] && process.argv[1].endsWith('i18n-datatable.mjs')) {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const nsAt = args.indexOf('--namespace');
  const file = args.find((a, i) => !a.startsWith('--') && i !== nsAt + 1);
  const source = readFileSync(file, 'utf8');
  const { code, entries } = processTable(file, source);
  console.log(`${entries.length} fields across ${new Set(entries.map((e) => e.key.split('.').slice(0, 2).join('.'))).size} rows`);
  if (apply) {
    writeFileSync(file, code);
    writeFileSync(process.env.I18N_ENTRIES_OUT ?? 'i18n-datatable-entries.json', JSON.stringify(entries, null, 1));
    console.log('written');
  } else {
    for (const e of entries.slice(0, 20)) console.log('  ' + e.key + ' = ' + JSON.stringify(e.text));
  }
}
