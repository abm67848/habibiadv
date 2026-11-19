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
let multilineCount = 0;

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  content = content.replace(/translate\('([\s\S]*?)'\)/g, (match, inner) => {
    if (inner.includes('\n')) {
      multilineCount++;
      changed = true;
      const normalized = inner.replace(/\r?\n\s*/g, ' ').replace(/'/g, "\\'").trim();
      return "translate('" + normalized + "')";
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed multiline string in:', file);
  }
}

console.log('Done. Fixed multiline translations:', multilineCount);
