import { loadBooks, buildLibrary } from '$lib/books.js';

export function load() {
  const books = loadBooks();
  const library = buildLibrary(books);
  return { library };
}
