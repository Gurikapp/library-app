import matter from 'gray-matter';
import { marked } from 'marked';

export function loadBooks() {
  const modules = import.meta.glob('../content/books/*.md', {
    eager: true,
    query: '?raw',
    import: 'default'
  });

  const books = [];

  for (const [path, raw] of Object.entries(modules)) {
    const { data, content } = matter(raw);
    const slug = path.split('/').pop().replace('.md', '');

    books.push({
      slug,
      title: data.title || 'Без названия',
      shelf: parseInt(data.shelf) || 1,
      position: parseInt(data.position) || 1,
      color: data.color || '#4a3728',
      spineColor: data.spineColor || '#2d2218',
      textColor: data.textColor || '#f0e6d3',
      content
    });
  }

  return books;
}

export function buildLibrary(books) {
  const CASES = 4;
  const SHELVES_PER_CASE = 12;
  const POSITIONS_PER_SHELF = 11;

  // library[caseIdx][shelfIdx][posIdx] = book | null
  const library = Array.from({ length: CASES }, () =>
    Array.from({ length: SHELVES_PER_CASE }, () =>
      Array.from({ length: POSITIONS_PER_SHELF }, () => null)
    )
  );

  for (const book of books) {
    // shelf is 1-based global shelf number (1–48 across all 4 cases)
    const shelfGlobal = Math.max(1, book.shelf) - 1; // 0-indexed
    const caseIdx = Math.floor(shelfGlobal / SHELVES_PER_CASE) % CASES;
    const shelfIdx = shelfGlobal % SHELVES_PER_CASE;
    const posIdx = Math.max(0, Math.min(book.position - 1, POSITIONS_PER_SHELF - 1));

    // Only place if slot is empty
    if (library[caseIdx][shelfIdx][posIdx] === null) {
      library[caseIdx][shelfIdx][posIdx] = book;
    }
  }

  return library;
}
