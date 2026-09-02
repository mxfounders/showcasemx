const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/blog/blog-index.tsx');

let code = fs.readFileSync(file, 'utf8');

// 1. Add useEffect and Chevron imports
code = code.replace("import { useMemo, useState, useRef } from 'react';", "import { useMemo, useState, useRef, useEffect } from 'react';");
code = code.replace("import { ArrowLeft, ArrowRight, Check, ChevronDown, Grid2X2, List, ListFilter } from 'lucide-react';", "import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Grid2X2, List, ListFilter } from 'lucide-react';");

// 2. Add page state and reset logic
const hookInject = `
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [view, setView] = useState<View>('grid');
  const [page, setPage] = useState(1);
  const POSTS_PER_PAGE = 12;

  useEffect(() => {
    setPage(1);
  }, [query, category, sort]);
`;
code = code.replace(/const \[query.*setView.*('grid');/s, hookInject.trim());

// 3. Paginate the posts array
const paginateInject = `
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const featuredPosts = blogPosts.slice(0, 10);
`;
code = code.replace('const featuredPosts = blogPosts.slice(0, 10);', paginateInject.trim());

// 4. Update the map to use paginatedPosts
code = code.replace('{posts.map((post) => {', '{paginatedPosts.map((post) => {');

// 5. Inject Pagination UI
const paginationUI = `
            </div>
            
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2 sm:gap-4 border-t border-stone-200 pt-10">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="action-button flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 sm:px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ChevronLeft className="size-4" /> Anterior
                </button>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {getPageNumbers().map((p, idx) => {
                    if (p === '...') {
                      return <span key={\`ellipsis-\${idx}\`} className="flex size-8 sm:size-10 items-center justify-center text-stone-400">...</span>;
                    }
                    return (
                      <button 
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={\`flex size-9 sm:size-10 items-center justify-center rounded-full text-sm font-medium transition-colors \${
                          page === p 
                            ? 'bg-stone-900 text-white shadow-sm' 
                            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                        }\`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="action-button flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 sm:px-5 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-stone-900 hover:text-stone-900 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Siguiente <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          ) : (
`;
code = code.replace(/<\/div>\n\s*\) : \(/, paginationUI.trimStart());

fs.writeFileSync(file, code);
