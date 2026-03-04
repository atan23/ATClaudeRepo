import axios from 'axios';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1';

export interface GoogleBook {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string;
  genres: string[];
  description: string;
  publishedYear: number | null;
  averageRating: number;
  ratingsCount: number;
  pageCount: number | null;
  isbn: string | null;
  language: string;
}

function extractYear(dateString?: string): number | null {
  if (!dateString) return null;
  const match = dateString.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

function extractIsbn(identifiers?: Array<{ type: string; identifier: string }>): string | null {
  if (!identifiers) return null;
  const isbn13 = identifiers.find(i => i.type === 'ISBN_13');
  const isbn10 = identifiers.find(i => i.type === 'ISBN_10');
  return isbn13?.identifier || isbn10?.identifier || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGoogleBook(item: any): GoogleBook {
  const info = item.volumeInfo || {};
  return {
    id: item.id,
    title: info.title || 'Unknown Title',
    authors: info.authors || ['Unknown Author'],
    coverUrl: info.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
    genres: info.categories || [],
    description: info.description || '',
    publishedYear: extractYear(info.publishedDate),
    averageRating: info.averageRating || 0,
    ratingsCount: info.ratingsCount || 0,
    pageCount: info.pageCount || null,
    isbn: extractIsbn(info.industryIdentifiers),
    language: info.language || 'en',
  };
}

export async function searchBooks(query: string, maxResults = 10): Promise<GoogleBook[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `${GOOGLE_BOOKS_API}/volumes`;

  const params: Record<string, string | number> = {
    q: query,
    maxResults,
    langRestrict: 'en',
    printType: 'books',
  };

  if (apiKey) params.key = apiKey;

  const response = await axios.get(url, { params });
  const items = response.data.items || [];
  return items.map(parseGoogleBook);
}

export async function getBookById(googleBooksId: string): Promise<GoogleBook | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `${GOOGLE_BOOKS_API}/volumes/${googleBooksId}`;

  const params: Record<string, string> = {};
  if (apiKey) params.key = apiKey;

  const response = await axios.get(url, { params });
  return parseGoogleBook(response.data);
}

export async function getBooksByGenre(genre: string, maxResults = 10): Promise<GoogleBook[]> {
  return searchBooks(`subject:${genre}`, maxResults);
}
