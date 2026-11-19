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
const collected = new Set();
for (const file of all) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(/translate\('([\s\S]*?)'\)/g);
  for (const m of matches) {
    if (m[1]) collected.add(m[1].replace(/\\'/g, "'"));
  }
}

console.log('Unique translate strings collected:', collected.size);
fs.writeFileSync('scripts/collected-strings.json', JSON.stringify([...collected], null, 2), 'utf8');
