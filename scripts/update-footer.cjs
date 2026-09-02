const fs = require('fs');

let content = fs.readFileSync('src/components/footer.tsx', 'utf8');

const iconMapCode = `
const iconMap: Record<string, React.ElementType> = {
  CreditCard, FileText, Users, BarChart3, Package, Target, HeadphonesIcon,
  Building2, ShoppingBag, Factory, Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen, Send, ClipboardCheck, Settings,
  HelpCircle, LayoutDashboard, UserCircle, Rocket, Globe, Calendar, Mail, Award, Zap
};
`;

content = content.replace(
  'export function Footer() {',
  iconMapCode + '\nexport function Footer({ dict }: { dict?: any }) {'
);

content = content.replace(
  'const sections = footerSections;',
  'const sections = dict?.sections || footerSections;'
);

// If `const sections = footerSections;` doesn't exist, we might have `footerSections.map(`. Let's just do a regex replace
content = content.replace(/footerSections\.map/g, '(dict?.sections || footerSections).map');

// Icon replacement
content = content.replace(
  'icon={link.icon}',
  'icon={typeof link.icon === "string" ? iconMap[link.icon] : link.icon}'
);

content = content.replace(
  'Hecho en México',
  '{dict?.madeIn || "Hecho en México"}'
);

fs.writeFileSync('src/components/footer.tsx', content);
