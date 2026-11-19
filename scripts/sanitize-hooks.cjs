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

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Remove useAppSettings from non-component helper functions
  // Matches `function fnName(...) {\n const { translate } = useAppSettings();` where fnName starts with lowercase
  content = content.replace(/(async\s+)?function\s+([a-z][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{(\s*\/\/ pull translation helper)?\s*const \{ translate \} = useAppSettings\(\);/g,
    (match, asyncKw, fnName, params) => {
      console.log(`Removed invalid hook from helper ${fnName} in ${file}`);
      return `${asyncKw || ''}function ${fnName}(${params}) {`;
    }
  );

  // 2. Ensure each React Component (function starting with Uppercase) that uses translate() has const { translate } = useAppSettings();
  // Find all component declarations
  // e.g. `export default function Comp(...) {` or `function Comp(...) {`
  const compRegex = /(export\s+default\s+)?(async\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
  content = content.replace(compRegex, (match, expKw, asyncKw, compName, params) => {
    // Check if right after the opening brace, useAppSettings is already called
    return match;
  });

  // Let's specifically ensure the `export default function <Name>(...) {` has `const { translate } = useAppSettings();`
  content = content.replace(/(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/g, (match) => {
    // Check if the component body already has translate extracted
    // To be safe, check if within the next 200 chars it has useAppSettings
    const idx = content.indexOf(match);
    const sliceAfter = content.slice(idx + match.length, idx + match.length + 300);
    if (!sliceAfter.includes('useAppSettings')) {
      console.log(`Injected useAppSettings in main component in ${file}`);
      return `${match}\n  const { translate } = useAppSettings();`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log('Hook sanitization complete.');
