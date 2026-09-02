const fs = require('fs');

let content = fs.readFileSync('src/components/navbar.tsx', 'utf8');

// The icons are stored as strings in dict, so we need a mapping object.
const iconMapCode = `
const iconMap: Record<string, React.ElementType> = {
  CreditCard, FileText, Users, BarChart3, Package, Target, HeadphonesIcon,
  Building2, ShoppingBag, Factory, Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen, Send, ClipboardCheck, Settings,
  HelpCircle, LayoutDashboard, UserCircle, Rocket, Globe, Calendar, Mail, Award, Zap
};
`;

// Replace `export function Navbar({ authenticated = false }` with `export function Navbar({ authenticated = false, dict }`
content = content.replace(
  'export function Navbar({ authenticated = false }: { authenticated?: boolean }) {',
  'export function Navbar({ authenticated = false, dict }: { authenticated?: boolean, dict?: any }) {'
);

// We need to inject iconMap right before export function Navbar
content = content.replace(
  'export function Navbar({ authenticated = false, dict }',
  iconMapCode + '\nexport function Navbar({ authenticated = false, dict }'
);

// We should replace `const menus: Record<string, MenuData> = { ... };` 
// with `const defaultMenus: Record<string, MenuData> = { ... };` so it doesn't break,
// or we can just let `menus = dict?.menus` inside Navbar.
// But we need to map the string icons to React components.

content = content.replace(
  'const currentMenu = activeMenu ? menus[activeMenu] : null;',
  `const rawMenus = dict?.menus || menus;
  const currentMenu = activeMenu ? rawMenus[activeMenu] : null;`
);

// Inside the render of `currentMenu.columns` we need to map the icon.
// Change `const Icon = item.icon;` to `const Icon = typeof item.icon === 'string' ? iconMap[item.icon] : item.icon;`
content = content.replace(
  'const Icon = item.icon;',
  'const Icon = typeof item.icon === "string" ? iconMap[item.icon] : item.icon;'
);

content = content.replace(
  'const Icon = link.icon;',
  'const Icon = typeof link.icon === "string" ? iconMap[link.icon] : link.icon;'
);

content = content.replace(
  '{authenticated ? "Ir a mi panel" : "Entrar"}',
  '{authenticated ? (dict?.dashboard || "Ir a mi panel") : (dict?.login || "Entrar")}'
);

content = content.replace(
  '>Suscribirse <span',
  '>{dict?.subscribe || "Suscribirse"} <span'
);

content = content.replace(
  '{authenticated ? "Ir a mi panel" : "Entrar"}',
  '{authenticated ? (dict?.dashboard || "Ir a mi panel") : (dict?.login || "Entrar")}'
);

content = content.replace(
  '>Suscribirse <span',
  '>{dict?.subscribe || "Suscribirse"} <span'
);

content = content.replace(
  '{key === "compradores" ? "Para compradores" : key === "fundadores" ? "Para fundadores" : "Recursos"}',
  '(dict?.menus?.[key]?.heading) || (key === "compradores" ? "Para compradores" : key === "fundadores" ? "Para fundadores" : "Recursos")'
);

content = content.replace(
  '{key === "compradores" ? "Para compradores" : key === "fundadores" ? "Para fundadores" : "Recursos"}',
  '(dict?.menus?.[key]?.heading) || (key === "compradores" ? "Para compradores" : key === "fundadores" ? "Para fundadores" : "Recursos")'
);


fs.writeFileSync('src/components/navbar.tsx', content);
