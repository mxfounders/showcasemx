const fs = require('fs');

let navbarSearch = fs.readFileSync('src/components/navbar-search.tsx', 'utf8');
navbarSearch = navbarSearch.replace("import { useRouter } from 'next/navigation';", "import { useRouter, usePathname } from 'next/navigation';");
navbarSearch = navbarSearch.replace("const router = useRouter();", "const router = useRouter();\n  const pathname = usePathname();");
navbarSearch = navbarSearch.replace(
  "router.push(`/?q=${encodeURIComponent(query)}#catalogo`);",
  "const locale = pathname.split('/')[1] || 'es'; router.push(`/${locale}/?q=${encodeURIComponent(query)}#catalogo`);"
);
fs.writeFileSync('src/components/navbar-search.tsx', navbarSearch);
