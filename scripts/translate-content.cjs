// translate-content.cjs – codemod to wrap static JSX strings with the translate() helper (CommonJS version)
// Usage: `node scripts/translate-content.cjs`

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

const adminPagesDir = path.resolve('src/pages/admin');
const files = collectFiles(adminPagesDir);
const newEntries = {};

files.forEach((file) => {
  let src = fs.readFileSync(file, 'utf8');

  // 1️⃣ Ensure import of useAppSettings
  if (!src.includes("useAppSettings")) {
    src = "import { useAppSettings } from '@/context/index.jsx';\n" + src;
  }

  // 2️⃣ Ensure extraction of translate after the component function definition
  if (!src.includes('const { translate }')) {
    src = src.replace(/function\s+([A-Za-z0-9_]+)\s*\(/, (match, name) => {
      return `function ${name}(\n  // pull translation helper\n  const { translate } = useAppSettings();\n`;
    });
  }

  // 3️⃣ Replace plain JSX text nodes >Some text</Tag>
  const regex = />\s*([^<{][^<>]*?)\s*<\/(\w+)>/g;
  src = src.replace(regex, (full, inner, tag) => {
    const txt = inner.trim();
    if (!txt || txt.includes('{') || txt.includes('}')) return full;
    const key = makeKey(txt);
    newEntries[key] = txt;
    return `>{translate('${txt}')}</${tag}>`;
  });

  // 4️⃣ Write back
  fs.writeFileSync(file, src, 'utf8');
});

if (Object.keys(newEntries).length) {
  console.log('\n=== TRANSLATION STUB ===');
  console.log('Paste the following entries into ADMIN_TRANSLATIONS (inside the en block):');
  console.log('en: {');
  for (const [k, v] of Object.entries(newEntries)) {
    console.log(`  ${k}: '${v}',`);
  }
  console.log('},');
} else {
  console.log('No static strings detected – all pages already use translate().');
}
