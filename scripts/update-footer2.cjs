const fs = require('fs');

let content = fs.readFileSync('src/components/footer.tsx', 'utf8');

content = content.replace(
  'Software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con quienes los construyen.',
  '{dict?.description || "Software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con quienes los construyen."}'
);

content = content.replace(
  'Suscribirse al newsletter',
  '{dict?.newsletter || "Suscribirse al newsletter"}'
);

fs.writeFileSync('src/components/footer.tsx', content);
