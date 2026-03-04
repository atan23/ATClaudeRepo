import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { booksApi } from '../api';

interface ImportModalProps {
  onClose: () => void;
  onImported: (count: number) => void;
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [source, setSource] = useState<'kindle' | 'goodreads'>('goodreads');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const kindleColumns = 'Title, Author, ASIN';
  const goodreadsColumns = 'Title, Author, My Rating, Exclusive Shelf, Date Read';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const res = await booksApi.import(text, source);
      setResult(res.data);
      if (res.data.imported > 0) {
        onImported(res.data.imported);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setResult({ imported: 0, errors: [error.response?.data?.error || 'Import failed'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Import Books</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Source selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Import from</label>
            <div className="grid grid-cols-2 gap-2">
              {(['goodreads', 'kindle'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    source === s
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s === 'goodreads' ? '🌐 Goodreads' : '📱 Kindle'}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">
              {source === 'goodreads' ? 'How to export from Goodreads:' : 'How to export from Kindle:'}
            </p>
            {source === 'goodreads' ? (
              <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
                <li>Go to goodreads.com → My Books</li>
                <li>Click "Import and Export" at bottom</li>
                <li>Click "Export Library" and save the CSV</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
                <li>Visit your Amazon account → Content Library</li>
                <li>Export your books list as CSV</li>
                <li>Required columns: {kindleColumns}</li>
              </ol>
            )}
            <p className="text-slate-400 pt-1">CSV columns needed: {source === 'goodreads' ? goodreadsColumns : kindleColumns}</p>
          </div>

          {/* File upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileText size={20} />
                  <div className="text-left">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500">
                  <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium">Click to select CSV file</p>
                  <p className="text-xs text-slate-400">or drag and drop</p>
                </div>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 flex items-start gap-2 ${
              result.imported > 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {result.imported > 0 ? (
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">
                {result.imported > 0 && (
                  <p className="font-medium text-green-700">Successfully imported {result.imported} books!</p>
                )}
                {result.errors.map((e, i) => (
                  <p key={i} className="text-red-600 text-xs">{e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Importing...</>
                ) : (
                  <><Upload size={16} />Import</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
