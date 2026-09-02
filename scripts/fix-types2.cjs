const fs = require('fs');

let nav = fs.readFileSync('src/components/navbar.tsx', 'utf8');
nav = nav.replace(/currentMenu\.columns\.filter\(col=>/g, 'currentMenu.columns.filter((col: any)=>');
nav = nav.replace(/menu\.columns\.filter\(col=>/g, 'menu.columns.filter((col: any)=>');
fs.writeFileSync('src/components/navbar.tsx', nav);

let footer = fs.readFileSync('src/components/footer.tsx', 'utf8');
footer = footer.replace(/section\.cols\.filter\(col=>/g, 'section.cols.filter((col: any)=>');
footer = footer.replace(/\(dict\?\.sections \|\| footerSections\)\.map\(\(section, sectionIndex\)/g, '(dict?.sections || footerSections).map((section: any, sectionIndex: number)');
footer = footer.replace(/\(dict\?\.sections \|\| footerSections\)\.map\(\(section, index\)/g, '(dict?.sections || footerSections).map((section: any, index: number)');
footer = footer.replace(/\(dict\?\.sections \|\| footerSections\)\.map\(\(section\)/g, '(dict?.sections || footerSections).map((section: any)');
fs.writeFileSync('src/components/footer.tsx', footer);
