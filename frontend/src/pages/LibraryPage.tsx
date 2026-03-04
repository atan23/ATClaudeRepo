import { useState, useEffect, useCallback } from 'react';
import {
  Library, Search, Filter, Upload, Plus, BookOpen, Star, MoreVertical,
  CheckCircle2, Clock, Loader2, X, LayoutGrid, List
} from 'lucide-react';
import { libraryApi } from '../api';
import { UserBook, StatusFilter, SortOption } from '../types';
import ImportModal from '../components/ImportModal';
import AddBookModal from '../components/AddBookModal';
import BookCard from '../components/BookCard';

const STATUS_OPTIONS: { value: StatusFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All Books', icon: '📚' },
  { value: 'reading', label: 'Reading', icon: '📖' },
  { value: 'read', label: 'Read', icon: '✅' },
  { value: 'want_to_read', label: 'Want to Read', icon: '🔖' },
];

function parseAuthors(a: string): string {
  try { return JSON.parse(a).join(', '); }
  catch { return a || 'Unknown'; }
}

interface BookRowProps {
  book: UserBook;
  onUpdate: () => void;
}

function BookListItem({ book, onUpdate }: BookRowProps) {
  const [updating, setUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [rating, setRating] = useState(book.rating || 0);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    setShowMenu(false);
    try {
      await libraryApi.updateBook(book.book_id, { status });
      onUpdate();
    } catch { /* ignore */ }
    setUpdating(false);
  };

  const updateRating = async (r: number) => {
    setRating(r);
    try {
      await libraryApi.updateBook(book.book_id, { rating: r });
    } catch { setRating(book.rating || 0); }
  };

  const removeBook = async () => {
    if (!confirm(`Remove "${book.title}" from your library?`)) return;
    try {
      await libraryApi.removeBook(book.book_id);
      onUpdate();
    } catch { /* ignore */ }
  };

  const statusColors = { read: 'text-green-600', reading: 'text-blue-600', want_to_read: 'text-slate-500' };
  const statusLabels = { read: 'Read', reading: 'Reading', want_to_read: 'Want to Read' };

  return (
    <div className="card px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow group">
      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-slate-100">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-blue-100 flex items-center justify-center">
            <BookOpen size={14} className="text-blue-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 truncate">{book.title}</p>
        <p className="text-xs text-slate-500 truncate">{parseAuthors(book.authors)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs ${statusColors[book.status]}`}>
            {statusLabels[book.status]}
          </span>
          {book.source !== 'manual' && (
            <span className="text-xs text-slate-400">
              via {book.source === 'kindle' ? '📱 Kindle' : '🌐 Goodreads'}
            </span>
          )}
          {book.finished_at && (
            <span className="text-xs text-slate-400">
              · {new Date(book.finished_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onClick={() => updateRating(i + 1)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={14}
              className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-300'}
            />
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {updating ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <MoreVertical size={16} className="text-slate-400" />}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 w-44">
            {book.status !== 'reading' && (
              <button onClick={() => updateStatus('reading')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                <BookOpen size={14} className="text-blue-500" /> Mark as Reading
              </button>
            )}
            {book.status !== 'read' && (
              <button onClick={() => updateStatus('read')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" /> Mark as Read
              </button>
            )}
            {book.status !== 'want_to_read' && (
              <button onClick={() => updateStatus('want_to_read')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                <Clock size={14} className="text-slate-400" /> Want to Read
              </button>
            )}
            <hr className="my-1 border-slate-100" />
            <button onClick={removeBook} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
              <X size={14} /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('created_at');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showImport, setShowImport] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sort, order: 'DESC' };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await libraryApi.getLibrary(params);
      setBooks(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, sort]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const filtered = books.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.authors.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = STATUS_OPTIONS.slice(1).reduce((acc, opt) => {
    acc[opt.value] = filtered.filter(b => b.status === opt.value);
    return acc;
  }, {} as Record<string, UserBook[]>);

  return (
    <div className="p-6 max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Library size={24} className="text-blue-600" />
            My Library
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{books.length} book{books.length !== 1 ? 's' : ''} in your collection</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload size={15} />
            Import
          </button>
          <button
            onClick={() => setShowAddBook(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} />
            Add Book
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-0.5">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.icon} {opt.label}
              {opt.value !== 'all' && (
                <span className="ml-1 text-slate-400">
                  ({books.filter(b => b.status === opt.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-8 w-52 py-1.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="input py-1.5 text-sm w-auto"
          >
            <option value="created_at">Date Added</option>
            <option value="title">Title</option>
            <option value="rating">My Rating</option>
            <option value="average_rating">Avg Rating</option>
            <option value="finished_at">Date Finished</option>
          </select>

          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 border-l border-slate-200 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={48} className="text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">
            {search ? 'No books match your search' : 'Your library is empty'}
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            {search ? 'Try a different search term' : 'Add books manually or import from Kindle/Goodreads'}
          </p>
          {!search && (
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
                Import books
              </button>
              <button onClick={() => setShowAddBook(true)} className="btn-primary text-sm">
                Add a book
              </button>
            </div>
          )}
        </div>
      ) : statusFilter !== 'all' || search ? (
        /* Flat view for filtered results */
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(book => (
              <BookCard key={book.book_id} book={book} showStatus />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(book => (
              <BookListItem key={book.book_id} book={book} onUpdate={loadLibrary} />
            ))}
          </div>
        )
      ) : (
        /* Grouped view */
        <div className="space-y-8">
          {STATUS_OPTIONS.slice(1).map(opt => {
            const sectionBooks = grouped[opt.value] || [];
            if (sectionBooks.length === 0) return null;
            return (
              <div key={opt.value}>
                <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  {opt.icon} {opt.label}
                  <span className="badge bg-slate-100 text-slate-500">{sectionBooks.length}</span>
                </h2>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sectionBooks.map(book => (
                      <BookCard key={book.book_id} book={book} showStatus />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sectionBooks.map(book => (
                      <BookListItem key={book.book_id} book={book} onUpdate={loadLibrary} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={count => {
            setShowImport(false);
            if (count > 0) loadLibrary();
          }}
        />
      )}

      {showAddBook && (
        <AddBookModal
          onClose={() => setShowAddBook(false)}
          onAdded={() => loadLibrary()}
        />
      )}
    </div>
  );
}
