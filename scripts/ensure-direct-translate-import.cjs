const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...walk(p));
    else if (/\.(jsx|js)$/.test(item.name)) files.push(p);
  }
  return files;
}

const all = walk('src/pages/admin');
let updated = 0;

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // If file contains `useAppSettings` import from `@/context/index.jsx` or `@/context`
  // Ensure `translate` is imported directly so even if a subcomponent or function doesn't destruct it,
  // it has `translate` available without throwing ReferenceError or calling hooks illegally!
  if (content.includes("from '@/context/index.jsx'") || content.includes('from "@/context/index.jsx"')) {
    content = content.replace(/import\s*\{([^}]*)\}\s*from\s*(['"])@\/context\/index\.jsx\2;/g, (match, imports, quote) => {
      const parts = imports.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.includes('translate')) {
        parts.push('translate');
      }
      return `import { ${parts.join(', ')} } from ${quote}@/context/index.jsx${quote};`;
    });
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
  }
}

console.log('Imported translate in files:', updated);
