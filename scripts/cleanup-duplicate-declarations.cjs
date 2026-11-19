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
let fixed = 0;

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // If translate is imported, remove local `const { translate } = useAppSettings();` inside components
  // so there is no duplicate symbol declaration!
  content = content.replace(/\s*const\s*\{\s*translate\s*\}\s*=\s*useAppSettings\(\);/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
  }
}

console.log('Cleaned up duplicate declarations in files:', fixed);
