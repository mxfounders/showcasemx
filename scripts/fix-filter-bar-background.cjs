const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/catalog/catalog-filter-bar.tsx');

let code = fs.readFileSync(file, 'utf8');

// Container: remove white bar and borders
code = code.replace(
  /className="sticky top-\[72px\] z-30 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 bg-white border-y border-stone-200 py-2\.5 mb-8 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar shadow-\[.*?\]"/,
  'className="sticky top-[72px] z-30 py-4 mb-6 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar bg-white/80 backdrop-blur-md"'
);

// Inactive Pill: remove border, use bg-stone-100
code = code.replace(
  /'border-stone-200 bg-white text-stone-600 group-hover:border-stone-300 group-hover:bg-stone-50'/,
  "'bg-stone-100 text-stone-600 group-hover:bg-stone-200 group-hover:text-stone-900'"
);

// Active Pill: use Suscribirse aesthetic (bg-[#E4EBFC] text-[#365DC4]) instead of black
code = code.replace(
  /'border-stone-900 bg-stone-900 text-white'/,
  "'bg-[#E4EBFC] text-[#365DC4]'"
);

// Pill base classes: remove border, adjust padding to match Suscribirse
code = code.replace(
  /className=\{`flex items-center gap-2 px-3\.5 py-1\.5 rounded-full border text-\[12\.5px\] font-medium transition-colors pointer-events-none \$\{/g,
  'className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13.5px] font-medium transition-colors pointer-events-none ${'
);

// Right side sort text: adjust size
code = code.replace(
  /text-\[13px\] font-medium text-stone-700/g,
  'text-[13.5px] font-medium text-stone-700'
);

fs.writeFileSync(file, code);
