const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/blog/blog-index.tsx');

let code = fs.readFileSync(file, 'utf8');

// 1. Add handlePageChange function
const handlePageChangeInjection = `
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => {
      document.getElementById('blog-posts-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
  };

  const getPageNumbers = () => {
`;
code = code.replace(/const totalPages.*\n.*paginatedPosts.*\n\n  const getPageNumbers/s, handlePageChangeInjection.trimStart());

// 2. Add id="blog-posts-top" to the section
code = code.replace('<section>', '<section id="blog-posts-top" className="scroll-mt-24">');

// 3. Replace setPage with handlePageChange in onClick handlers
code = code.replace(/onClick=\{\(\) => setPage\(p => Math\.max\(1, p - 1\)\)\}/, 'onClick={() => handlePageChange(Math.max(1, page - 1))}');
code = code.replace(/onClick=\{\(\) => setPage\(p as number\)\}/, 'onClick={() => handlePageChange(p as number)}');
code = code.replace(/onClick=\{\(\) => setPage\(p => Math\.min\(totalPages, p \+ 1\)\)\}/, 'onClick={() => handlePageChange(Math.min(totalPages, page + 1))}');

fs.writeFileSync(file, code);
