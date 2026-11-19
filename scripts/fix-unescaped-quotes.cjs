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
let quotesFixed = 0;

for (const file of all) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace {translate('...')} safely
  // Notice that {translate('agency's activity')} breaks regex because of the quote
  // Let's split by `{translate('` and `')}`
  const parts = content.split("{translate('");
  if (parts.length > 1) {
    let rebuilt = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const endMarker = "')}";
      const endIdx = part.indexOf(endMarker);
      if (endIdx !== -1) {
        let inner = part.substring(0, endIdx);
        const rest = part.substring(endIdx);
        const escaped = inner.replace(/\\'/g, "'").replace(/'/g, "\\'");
        if (escaped !== inner) quotesFixed++;
        rebuilt += "{translate('" + escaped + rest;
      } else {
        rebuilt += "{translate('" + part;
      }
    }
    content = rebuilt;
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed quotes in:', file);
  }
}

console.log('Total fixed quotes:', quotesFixed);
