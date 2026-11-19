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
let injectedCount = 0;

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Match: function CompName(...) {
  // If CompName starts with uppercase letter and its body uses translate() but doesn't have useAppSettings
  content = content.replace(/(function\s+[A-Z][A-Za-z0-9_]*\s*\([^)]*\)\s*\{)/g, (match) => {
    // Look ahead in the file from this match
    const idx = content.indexOf(match);
    const rest = content.slice(idx);
    // Find the end of this function body or roughly up to next function
    const nextFn = rest.slice(match.length).search(/\nfunction\s+[A-Z]/);
    const scope = nextFn === -1 ? rest.slice(match.length) : rest.slice(match.length, match.length + nextFn);
    
    // Check if within this function body, translate( is used and useAppSettings is NOT called
    if (scope.includes('translate(') && !scope.includes('useAppSettings')) {
      injectedCount++;
      return `${match}\n  const { translate } = useAppSettings();`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log('Injected useAppSettings into subcomponents:', injectedCount);
