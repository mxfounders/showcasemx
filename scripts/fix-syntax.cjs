const fs = require('fs');

let nav = fs.readFileSync('src/components/navbar-search.tsx', 'utf8');
nav = nav.replace(
  'placeholder="{dict?.searchPlaceholder || "¿Qué necesitas resolver?"}"',
  'placeholder={dict?.searchPlaceholder || "¿Qué necesitas resolver?"}'
);
fs.writeFileSync('src/components/navbar-search.tsx', nav);

let cat = fs.readFileSync('src/components/category-explorer.tsx', 'utf8');
cat = cat.replace(
  '"{dict?.previewNoticeReal || "Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de shwcs."}"',
  '(dict?.previewNoticeReal || "Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de shwcs.")'
);
cat = cat.replace(
  '"{dict?.previewNoticeMock || "Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real."}"',
  '(dict?.previewNoticeMock || "Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real.")'
);
fs.writeFileSync('src/components/category-explorer.tsx', cat);
