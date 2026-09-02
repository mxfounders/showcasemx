const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/ui/steps-accordion.tsx');

let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  'className="absolute bottom-10 left-1/2 -translate-x-1/2 origin-bottom-left -rotate-90 whitespace-nowrap"',
  'className="absolute bottom-10 left-0 right-0 flex justify-center whitespace-nowrap"'
);
code = code.replace(
  '<span className="text-lg font-semibold tracking-wide" style={{ color: step.text }}>',
  '<span className="text-lg font-medium tracking-wide" style={{ color: step.text, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>'
);
fs.writeFileSync(file, code);
