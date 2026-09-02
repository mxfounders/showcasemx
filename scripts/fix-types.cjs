const fs = require('fs');

let nav = fs.readFileSync('src/components/navbar.tsx', 'utf8');
nav = nav.replace('HelpCircle, Settings, Menu, X', 'HelpCircle, Settings, Menu, X, Zap');
nav = nav.replace(/col\.links\.filter\(link=>/g, 'col.links.filter((link: any)=>');
nav = nav.replace(/\.map\(\(col\)/g, '.map((col: any)');
nav = nav.replace(/\.map\(col =>/g, '.map((col: any) =>');
fs.writeFileSync('src/components/navbar.tsx', nav);

let footer = fs.readFileSync('src/components/footer.tsx', 'utf8');
footer = footer.replace(/\.map\(\(section, index\)/g, '.map((section: any, index: number)');
footer = footer.replace(/\.map\(\(section\)/g, '.map((section: any)');
footer = footer.replace(/col\.links\.filter\(link=>/g, 'col.links.filter((link: any)=>');
footer = footer.replace(/\.map\(\(col, ci\)/g, '.map((col: any, ci: number)');
footer = footer.replace(/\.map\(\(link\)/g, '.map((link: any)');
fs.writeFileSync('src/components/footer.tsx', footer);
