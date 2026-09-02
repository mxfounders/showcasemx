const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/blog/blog-index.tsx');

let code = fs.readFileSync(file, 'utf8');

// The ternary structure needs a fragment around the first block
code = code.replace('{posts.length ? (', '{posts.length ? (\n            <>\n');
code = code.replace(/}\)\s*\) : \(/, '}\n            </>\n          ) : (');

fs.writeFileSync(file, code);
