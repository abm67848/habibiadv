// translate-content.js – self‑contained codemod to wrap static JSX strings with the translate() helper
// Usage: `node scripts/translate-content.js`
// This version does NOT depend on external npm packages (no glob),
// so it works even when the execution policy prevents installing dev deps.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ------------------------------------------------------------
// Helper: recursively collect all .jsx/.tsx files under a directory
// ------------------------------------------------------------
function collectFiles(dir, ext = ['.jsx', '.tsx']) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectFiles(fullPath, ext));
    } else if (ext.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ------------------------------------------------------------
// Helper: slugify text to generate a stable key
// ------------------------------------------------------------
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function makeKey(text) {
  const base = toSlug(text);
  const hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 4);
  return `${base}_${hash}`;
}

// ------------------------------------------------------------
// Main processing
// ------------------------------------------------------------
const adminPagesDir = path.resolve('src/pages/admin');
const files = collectFiles(adminPagesDir);
const newEntries = {};

files.forEach((file) => {
  let src = fs.readFileSync(file, 'utf8');

  // 1️⃣ Ensure import of useAppSettings
  if (!src.includes("useAppSettings")) {
    src = "import { useAppSettings } from '@/context/index.jsx';\n" + src;
  }

  // 2️⃣ Ensure we extract translate from the hook – place after the first function declaration
  if (!src.includes('const { translate }')) {
    src = src.replace(/function\s+([A-Za-z0-9_]+)\s*\(/, (match, name) => {
      return `function ${name}(\n  // get translation helper\n  const { translate } = useAppSettings();\n`;
    });
  }

  // 3️⃣ Replace plain JSX text nodes (e.g. >Hello world</Tag>)
  const regex = />\s*([^<{][^<>]*?)\s*<\/(\w+)>/g;
  src = src.replace(regex, (full, inner, tag) => {
    const txt = inner.trim();
    // skip if already an expression or empty
    if (!txt || txt.includes('{') || txt.includes('}')) return full;
    const key = makeKey(txt);
    newEntries[key] = txt;
    return `>{translate('${txt}')}</${tag}>`;
  });

  // 4️⃣ Write file back
  fs.writeFileSync(file, src, 'utf8');
});

if (Object.keys(newEntries).length) {
  console.log('\n=== TRANSLATION STUB ===');
  console.log('Paste the following entries into ADMIN_TRANSLATIONS (e.g. inside the en block):');
  console.log('en: {');
  for (const [k, v] of Object.entries(newEntries)) {
    console.log(`  ${k}: '${v}',`);
  }
  console.log('},');
} else {
  console.log('No new static strings were detected – all pages already employ translate().');
}
