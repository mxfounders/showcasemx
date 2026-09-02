const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/catalog/catalog-filter-bar.tsx');

let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className="sticky top-\[72px\] z-30 py-4 mb-6 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar bg-white\/80 backdrop-blur-md"/,
  'className="sticky top-[72px] z-30 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 py-4 mb-6 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar bg-white/80 backdrop-blur-md"'
);

fs.writeFileSync(file, code);
