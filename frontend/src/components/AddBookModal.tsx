import { useState, useEffect, useCallback } from 'react';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import { booksApi, libraryApi } from '../api';

interface SearchResult {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string;
  publishedYear: number | null;
  averageRating: number;
  description: string;
}

interface AddBookModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddBookModal({ onClose, onAdded }: AddBookModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await booksApi.search(q);
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleAdd = async (book: SearchResult) => {
    setAdding(book.id);
    try {
      await libraryApi.addBook({ googleBooksId: book.id });
      setAdded(prev => new Set([...prev, book.id]));
      onAdded();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 409) {
        setAdded(prev => new Set([...prev, book.id]));
      }
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Add Book to Library</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              className="input pl-9"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                Searching...
              </div>
            )}

            {!loading && results.length === 0 && query && (
              <p className="text-center py-8 text-slate-400 text-sm">No books found for "{query}"</p>
            )}

            {!loading && results.length === 0 && !query && (
              <p className="text-center py-8 text-slate-400 text-sm">
                Start typing to search for books...
              </p>
            )}

            {results.map(book => (
              <div
                key={book.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 group"
              >
                <div className="w-10 h-14 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{book.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {book.authors?.join(', ') || 'Unknown'}
                  </p>
                  {book.publishedYear && (
                    <p className="text-xs text-slate-400">{book.publishedYear}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAdd(book)}
                  disabled={adding === book.id || added.has(book.id)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    added.has(book.id)
                      ? 'bg-green-100 text-green-700'
                      : 'btn-primary'
                  }`}
                >
                  {adding === book.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : added.has(book.id) ? (
                    '✓ Added'
                  ) : (
                    <><Plus size={12} /> Add</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
