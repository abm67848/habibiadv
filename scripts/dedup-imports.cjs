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
let cleaned = 0;

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Combine duplicate imports from '@/context/index.jsx' or '@/context'
  // Collect all imported identifiers from '@/context/index.jsx'
  const contextImportRegex = /import\s*\{([^}]*)\}\s*from\s*(['"])@\/context(?:\/index(?:\.jsx)?)?\2;/g;
  let matches = [...content.matchAll(contextImportRegex)];
  if (matches.length > 1) {
    let allTokens = new Set();
    matches.forEach(m => {
      m[1].split(',').map(s => s.trim()).filter(Boolean).forEach(t => allTokens.add(t));
    });
    // Replace first match with consolidated import, and remove the others
    let first = true;
    content = content.replace(contextImportRegex, () => {
      if (first) {
        first = false;
        return `import { ${[...allTokens].join(', ')} } from '@/context/index.jsx';`;
      }
      return '';
    });
  } else if (matches.length === 1) {
    // Deduplicate within the single import
    let tokens = matches[0][1].split(',').map(s => s.trim()).filter(Boolean);
    let uniqueTokens = [...new Set(tokens)];
    if (tokens.length !== uniqueTokens.length) {
      content = content.replace(contextImportRegex, `import { ${uniqueTokens.join(', ')} } from '@/context/index.jsx';`);
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    cleaned++;
  }
}

console.log('Consolidated context imports in files:', cleaned);
