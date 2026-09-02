const fs = require('fs');

let content = fs.readFileSync('src/components/landing-discovery.tsx', 'utf8');
content = content.replace(
  '<CategoryExplorer categories={categories} selected={selected} onCategoryChange={chooseCategory} query={query} results={results} onClear={() => setQuery("")} />',
  '<CategoryExplorer categories={categories} selected={selected} onCategoryChange={chooseCategory} query={query} results={results} onClear={() => setQuery("")} dict={dict?.categoryExplorer} />'
);
fs.writeFileSync('src/components/landing-discovery.tsx', content);
