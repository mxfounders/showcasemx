const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/ui/steps-accordion.tsx');

let code = fs.readFileSync(file, 'utf8');
code = code.replace("import { AnimatePresence, motion } from 'framer-motion';\n", '');
fs.writeFileSync(file, code);
