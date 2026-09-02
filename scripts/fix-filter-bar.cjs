const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/catalog/catalog-filter-bar.tsx');

let code = fs.readFileSync(file, 'utf8');
code = code.replace(/className=\{\\`flex/g, 'className={`flex');
code = code.replace(/none \\\$\{/g, 'none ${');
code = code.replace(/\\`\}/g, '`}');

fs.writeFileSync(file, code);
