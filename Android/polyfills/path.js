const path = {
  join: (...args) => args.filter(Boolean).join('/'),
  resolve: (...args) => args.filter(Boolean).join('/'),
  basename: (p) => p.split('/').pop() || '',
  extname: (p) => { const parts = p.split('.'); return parts.length > 1 ? '.' + parts.pop() : ''; },
  dirname: (p) => { const parts = p.split('/'); parts.pop(); return parts.join('/') || '.'; },
  sep: '/',
  delimiter: ':',
};
module.exports = path;
