// fix-translate-injection.cjs
// Repairs the broken pattern where `const { translate } = useAppSettings();`
// was injected inside function parameter lists instead of inside the body.
//
// Broken pattern (all variations):
//   function Foo(
//     // pull translation helper
//     const { translate } = useAppSettings();
//   params) {
//
// Also handles:
//   async function Foo(
//     // pull translation helper
//     const { translate } = useAppSettings();
//   ) {
//
//   export default function Foo(
//     // pull translation helper
//     const { translate } = useAppSettings();
//   ) {

const fs = require('fs');
const path = require('path');

function collectFiles(dir, ext = ['.jsx', '.tsx', '.js']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
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

const adminDir = path.resolve('src/pages/admin');
const files = collectFiles(adminDir);

let totalFixed = 0;

files.forEach((file) => {
  let src = fs.readFileSync(file, 'utf8');
  const original = src;

  // Pattern: function signature broken across multiple lines with the injection in the params.
  // We match: `function NAME(\n  // pull translation helper\n  const { translate } = useAppSettings();\nPARAMS) {`
  // and fix it to: `function NAME(PARAMS) {\n  const { translate } = useAppSettings();`
  //
  // The regex captures:
  //  group 1: optional `export default ` or `export `
  //  group 2: optional `async `
  //  group 3: function name
  //  group 4: the actual params (may be empty string for `()`)
  //  The body opening `{` follows

  // Replace the malformed injection inside params
  // Match (possibly multiline): `(\n  // pull translation helper\n  const { translate } = useAppSettings();\n`
  // that sits between `function NAME(` and `) {` or `params) {`

  const broken = /(\bfunction\s+\w+\s*\()\s*\n\s*\/\/ pull translation helper\s*\n\s*const \{ translate \} = useAppSettings\(\);\s*\n\s*(.*?)\) \{/gs;

  src = src.replace(broken, (match, fnOpen, params) => {
    const cleanParams = params.trim();
    const newSig = cleanParams ? `${fnOpen}${cleanParams}) {` : `${fnOpen}) {`;
    return `${newSig}\n  const { translate } = useAppSettings();`;
  });

  // Also handle `export default function` variant
  const brokenExport = /(\bexport\s+default\s+function\s+\w+\s*\()\s*\n\s*\/\/ pull translation helper\s*\n\s*const \{ translate \} = useAppSettings\(\);\s*\n\s*(.*?)\) \{/gs;

  src = src.replace(brokenExport, (match, fnOpen, params) => {
    const cleanParams = params.trim();
    const newSig = cleanParams ? `${fnOpen}${cleanParams}) {` : `${fnOpen}) {`;
    return `${newSig}\n  const { translate } = useAppSettings();`;
  });

  // Also handle `async function` variant
  const brokenAsync = /(\basync\s+function\s+\w+\s*\()\s*\n\s*\/\/ pull translation helper\s*\n\s*const \{ translate \} = useAppSettings\(\);\s*\n\s*(.*?)\) \{/gs;

  src = src.replace(brokenAsync, (match, fnOpen, params) => {
    const cleanParams = params.trim();
    const newSig = cleanParams ? `${fnOpen}${cleanParams}) {` : `${fnOpen}) {`;
    return `${newSig}\n  const { translate } = useAppSettings();`;
  });

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    totalFixed++;
  }
});

console.log(`\nDone. Fixed ${totalFixed} file(s).`);
