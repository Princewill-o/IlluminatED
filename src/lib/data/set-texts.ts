/**
 * Public-domain English Literature set texts on Project Gutenberg.
 * IDs checked against gutenberg.org/ebooks/<id>.
 */
export interface SetText {
  id: number;
  title: string;
  author: string;
}

export const SET_TEXTS: SetText[] = [
  { id: 46, title: "A Christmas Carol", author: "Charles Dickens" },
  {
    id: 43,
    title: "The Strange Case of Dr Jekyll and Mr Hyde",
    author: "Robert Louis Stevenson",
  },
  { id: 84, title: "Frankenstein", author: "Mary Shelley" },
  { id: 1342, title: "Pride and Prejudice", author: "Jane Austen" },
  { id: 1260, title: "Jane Eyre", author: "Charlotte Brontë" },
  { id: 1400, title: "Great Expectations", author: "Charles Dickens" },
  { id: 1533, title: "Macbeth", author: "William Shakespeare" },
  { id: 1513, title: "Romeo and Juliet", author: "William Shakespeare" },
  { id: 2097, title: "The Sign of Four", author: "Arthur Conan Doyle" },
  { id: 550, title: "Silas Marner", author: "George Eliot" },
];

/** Courses that show the "Read the set texts free" box. */
export const SET_TEXT_COURSES = new Set([
  "gcse-english-literature",
  "alevel-english-literature",
]);

export interface SetTextLinks {
  id: number;
  /** Read in the browser. */
  html: string;
  /** EPUB for e-readers. */
  epub: string;
  /** The book's page on gutenberg.org (all formats). */
  page: string;
}

/** Gutenberg's own stable URL patterns, used until (or if) Gutendex answers. */
export const fallbackLinks = (id: number): SetTextLinks => ({
  id,
  html: `https://www.gutenberg.org/ebooks/${id}.html.images`,
  epub: `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
  page: `https://www.gutenberg.org/ebooks/${id}`,
});
