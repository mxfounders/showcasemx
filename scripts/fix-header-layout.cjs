const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/catalog/category-page-layout.tsx');

let code = fs.readFileSync(file, 'utf8');

const oldHeader = `<div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-stone-500 leading-relaxed">{description}</p>
      </div>`;

const newHeader = `<div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12 lg:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-[42px] font-semibold tracking-tight leading-[1.05] md:max-w-md lg:max-w-lg shrink-0">
          {title}
        </h1>
        <p className="max-w-lg text-[17px] leading-relaxed text-stone-500 md:pt-2">
          {description}
        </p>
      </div>`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync(file, code);
