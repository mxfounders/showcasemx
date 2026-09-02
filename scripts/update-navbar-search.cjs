const fs = require('fs');

let content = fs.readFileSync('src/components/navbar-search.tsx', 'utf8');
content = content.replace(
  'export function NavbarSearch({onOpen}:{onOpen?:()=>void}) {',
  'export function NavbarSearch({onOpen, dict}:{onOpen?:()=>void, dict?: any}) {'
);
content = content.replace(
  'Buscar soluciones en el catálogo',
  '{dict?.searchLabel || "Buscar soluciones en el catálogo"}'
);
content = content.replace(
  '¿Qué necesitas resolver?',
  '{dict?.searchPlaceholder || "¿Qué necesitas resolver?"}'
);
content = content.replace(
  'aria-label="Buscar soluciones"',
  'aria-label={dict?.searchBtnLabel || "Buscar soluciones"}'
);
content = content.replace(
  'aria-label="Enviar búsqueda"',
  'aria-label={dict?.searchSubmitLabel || "Enviar búsqueda"}'
);
content = content.replace(
  'aria-label="Cerrar búsqueda"',
  'aria-label={dict?.searchCloseLabel || "Cerrar búsqueda"}'
);
fs.writeFileSync('src/components/navbar-search.tsx', content);

let navbar = fs.readFileSync('src/components/navbar.tsx', 'utf8');
navbar = navbar.replace('<NavbarSearch />', '<NavbarSearch dict={dict?.search} />');
navbar = navbar.replace('<NavbarSearch onOpen={() => setMobileOpen(false)} />', '<NavbarSearch onOpen={() => setMobileOpen(false)} dict={dict?.search} />');
fs.writeFileSync('src/components/navbar.tsx', navbar);
