const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/blog/blog-index.tsx');

let code = fs.readFileSync(file, 'utf8');

// 1. Add actionButtonStyle import
code = code.replace("import { blogPosts as initialPosts, extraPosts, blogTones, formatBlogDate } from '@/lib/blog';", "import { blogPosts as initialPosts, extraPosts, blogTones, formatBlogDate } from '@/lib/blog';\nimport { actionButtonStyle } from '@/lib/brand-colors';");

// 2. Rewrite pagination block
const newPagination = `
              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-4 sm:gap-6 border-t border-stone-200 pt-10">
                  <button 
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={actionButtonStyle}
                    className="action-button flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ArrowLeft className="size-4" /> Anterior
                  </button>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    {getPageNumbers().map((p, idx) => {
                      if (p === '...') {
                        return <span key={\`ellipsis-\${idx}\`} className="flex size-10 items-center justify-center text-[13.5px] text-stone-400">...</span>;
                      }
                      return (
                        <button 
                          key={p}
                          onClick={() => handlePageChange(p as number)}
                          style={page === p ? actionButtonStyle : undefined}
                          className={\`flex size-10 items-center justify-center rounded-full text-[13.5px] font-medium transition-colors \${
                            page === p 
                              ? 'action-button shadow-sm' 
                              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                          }\`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    style={actionButtonStyle}
                    className="action-button flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Siguiente <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
`;

const regex = /\{totalPages > 1 && \(\s*<div className="mt-16 flex items-center justify-center gap-4 sm:gap-6 border-t border-stone-200 pt-10">.*?<\/div>\s*\)\}/s;
code = code.replace(regex, newPagination.trim());

fs.writeFileSync(file, code);
