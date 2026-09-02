const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/catalog/catalog-filter-bar.tsx');

let code = fs.readFileSync(file, 'utf8');

const oldButton = `<button 
                    className="pointer-events-auto ml-1 -mr-1 p-0.5 rounded-full hover:bg-white/20"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(pathname + '?' + createQueryString(filter.id, null), { scroll: false });
                    }}
                  >`;

const newButton = `<button 
                    className="pointer-events-auto relative z-10 ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(pathname + '?' + createQueryString(filter.id, null), { scroll: false });
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >`;

// Notice I also changed hover:bg-white/20 to hover:bg-black/10 because on a pastel blue background, black/10 gives a nice standard darkened circle for hover.

if (code.includes('className="pointer-events-auto ml-1 -mr-1')) {
  code = code.replace(oldButton, newButton);
  fs.writeFileSync(file, code);
  console.log("Fixed button!");
} else {
  console.log("Could not find the button string.");
}
