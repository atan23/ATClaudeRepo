import { useState } from 'react';
import { Star, Plus, BookOpen, Check, Clock } from 'lucide-react';
import { Book, UserBook } from '../types';
import { libraryApi } from '../api';

function parseAuthors(authorsJson: string): string {
  try {
    const arr: string[] = JSON.parse(authorsJson);
    return arr.slice(0, 2).join(', ');
  } catch {
    return authorsJson || 'Unknown';
  }
}

function StarRating({ rating, max = 5, size = 'sm' }: { rating: number; max?: number; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 12 : 16;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={px}
          className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  );
}

interface BookCardProps {
  book: Book | UserBook;
  onAddToLibrary?: (bookId: number) => void;
  showStatus?: boolean;
  recommendation?: { reason: string };
}

export default function BookCard({ book, onAddToLibrary, showStatus, recommendation }: BookCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const userBook = 'status' in book ? book as UserBook : null;

  const authors = parseAuthors(book.authors);

  const handleAdd = async () => {
    if (adding || added) return;
    setAdding(true);
    try {
      if (book.google_books_id) {
        await libraryApi.addBook({ googleBooksId: book.google_books_id });
      } else {
        await libraryApi.addBook({ bookId: book.id });
      }
      setAdded(true);
      onAddToLibrary?.(book.id);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 409) {
        setAdded(true);
      }
    } finally {
      setAdding(false);
    }
  };

  const statusColors = {
    read: 'bg-green-100 text-green-700',
    reading: 'bg-blue-100 text-blue-700',
    want_to_read: 'bg-slate-100 text-slate-600',
  };

  const statusLabels = {
    read: 'Read',
    reading: 'Reading',
    want_to_read: 'Want to Read',
  };

  const statusIcons = {
    read: <Check size={10} />,
    reading: <BookOpen size={10} />,
    want_to_read: <Clock size={10} />,
  };

  return (
    <div className="card group flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Cover */}
      <div className="relative bg-slate-100 aspect-[2/3] overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
            <BookOpen size={40} className="text-blue-400" />
          </div>
        )}

        {/* Status badge */}
        {showStatus && userBook && (
          <div className={`absolute top-2 left-2 badge ${statusColors[userBook.status]}`}>
            {statusIcons[userBook.status]}
            {statusLabels[userBook.status]}
          </div>
        )}

        {/* Source badge */}
        {userBook && userBook.source !== 'manual' && (
          <div className="absolute top-2 right-2 badge bg-slate-800/70 text-white backdrop-blur-sm">
            {userBook.source === 'kindle' ? '📱' : '🌐'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-0.5 leading-snug">
          {book.title}
        </h3>
        <p className="text-xs text-slate-500 mb-2 truncate">{authors}</p>

        {/* Recommendation reason */}
        {recommendation && (
          <p className="text-xs text-blue-600 mb-2 line-clamp-2 bg-blue-50 rounded px-2 py-1">
            ✨ {recommendation.reason}
          </p>
        )}

        {/* Rating */}
        {userBook?.rating ? (
          <div className="flex items-center gap-1.5 mb-2">
            <StarRating rating={userBook.rating} />
            <span className="text-xs text-slate-500">Your rating</span>
          </div>
        ) : book.average_rating && book.average_rating > 0 ? (
          <div className="flex items-center gap-1.5 mb-2">
            <StarRating rating={book.average_rating} />
            <span className="text-xs text-slate-400">{book.average_rating.toFixed(1)}</span>
          </div>
        ) : null}

        {/* Genres */}
        <div className="flex flex-wrap gap-1 mb-3 mt-auto">
          {(() => {
            try {
              const genres: string[] = JSON.parse(book.genres || '[]');
              return genres.slice(0, 2).map(g => (
                <span key={g} className="badge bg-slate-100 text-slate-600">{g}</span>
              ));
            } catch { return null; }
          })()}
        </div>

        {/* Add to library button (only for recommendation cards) */}
        {!showStatus && !userBook && (
          <button
            onClick={handleAdd}
            disabled={adding || added}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              added
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'btn-primary'
            }`}
          >
            {added ? (
              <><Check size={12} /> Added</>
            ) : adding ? (
              <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Adding...</>
            ) : (
              <><Plus size={12} /> Add to Library</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
