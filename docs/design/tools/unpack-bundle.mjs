#!/usr/bin/env node
// Extracts readable, diffable screen sources from a Claude Design standalone HTML export.
//
// The export is a self-unpacking bundle: a root board that frames one nested bundle per screen, each
// holding the screen's HTML template (inline styles + a small `DCLogic` component) plus the React and
// dc-runtime scripts. This writes only the per-screen templates (minus runtime script tags) to
// `<out>/NN-<board-title>.html`, so a new export shows up in `git diff` as real design changes.
//
// Usage: node docs/design/tools/unpack-bundle.mjs <bundle.html> [outDir]   (Node built-ins only)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function island(html, type) {
  const m = html.match(new RegExp(`<script type="__bundler/${type}">\\s*([\\s\\S]*?)\\s*</script>`));
  return m ? JSON.parse(m[1]) : null;
}

function decode(entry) {
  const bytes = Buffer.from(entry.data, 'base64');
  return (entry.compressed ? zlib.gunzipSync(bytes) : bytes).toString('utf8');
}

function slug(title) {
  return title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const [bundlePath, outArg] = process.argv.slice(2);
if (!bundlePath) {
  console.error('Usage: node docs/design/tools/unpack-bundle.mjs <bundle.html> [outDir]');
  process.exit(2);
}
const outDir = outArg ?? path.join(path.dirname(bundlePath), 'src');

const root = fs.readFileSync(bundlePath, 'utf8').replace(/\r/g, '');
const manifest = island(root, 'manifest');
const pageOrder = island(root, 'page_order');
const template = island(root, 'template');
if (!manifest || !template || !pageOrder?.length) {
  console.error(`${bundlePath}: not a Claude Design multi-screen export (missing bundle data).`);
  process.exit(1);
}

// Board titles come from the root template: <iframe src="about:blank#<uuid>" title="...">.
const titles = {};
for (const m of template.matchAll(new RegExp(`src="about:blank#(${UUID})"[^>]*title="([^"]*)"`, 'g'))) {
  titles[m[1]] = m[2].replace(/&amp;/g, '&');
}

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.html')) fs.rmSync(path.join(outDir, f));
}

pageOrder.forEach((uuid, i) => {
  const page = decode(manifest[uuid]);
  const screen = island(page, 'template') ?? page;
  const source = screen
    .replace(new RegExp(`\\s*<script src="${UUID}"></script>`, 'g'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
  const title = titles[uuid] ?? `screen-${i + 1}`;
  const file = `${String(i + 1).padStart(2, '0')}-${slug(title)}.html`;
  fs.writeFileSync(path.join(outDir, file), source + '\n');
  console.log(`${file}  (${title})`);
});
