import { useState } from 'react';
import { Columns2, Download, FileText } from 'lucide-react';
import { PDF_BOOKS } from '../data/imageManifest';

type ReaderLayout = 'en' | 'ja' | 'split';

export function TestBooksView() {
  const [layout, setLayout] = useState<ReaderLayout>('en');

  const enBook = PDF_BOOKS[0];
  const jaBook = PDF_BOOKS[1];

  return (
    <div className="space-y-6">
      <section className="border-b border-slate-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            <span>Official PDF Manuals</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>English & Japanese Editions</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            SSW Truck Driving Test Books
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="PDF edition selector">
            <button
              type="button"
              role="tab"
              aria-selected={layout === 'en'}
              onClick={() => setLayout('en')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                layout === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English Edition
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layout === 'ja'}
              onClick={() => setLayout('ja')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                layout === 'ja' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              日本語版 (Japanese)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layout === 'split'}
              onClick={() => setLayout('split')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                layout === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Side-by-Side</span>
            </button>
          </div>
        </div>
      </section>

      {/* Download Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PDF_BOOKS.map((book) => (
          <div
            key={book.id}
            className="bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FileText className="w-4 h-4 text-[#0B4F8A] shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums">{book.sizeLabel}</span>
                <span aria-hidden="true">·</span>
                <span>PDF Document</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{book.titleEn}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{book.subtitleEn}</p>
            </div>
            <a
              href={book.url}
              download={book.filename}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download</span>
            </a>
          </div>
        ))}
      </div>

      {/* Embedded Reader */}
      <div className={`grid gap-6 ${layout === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {(layout === 'en' || layout === 'split') && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50">
              <span className="font-semibold text-slate-900">{enBook.titleEn}</span>
              <span className="font-mono tabular-nums">{enBook.sizeLabel}</span>
            </div>
            <iframe
              src={enBook.url}
              title={enBook.titleEn}
              className="w-full h-[72vh] min-h-[540px] bg-slate-100"
            />
          </section>
        )}

        {(layout === 'ja' || layout === 'split') && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50">
              <span className="font-semibold text-slate-900">{jaBook.titleJa}</span>
              <span className="font-mono tabular-nums">{jaBook.sizeLabel}</span>
            </div>
            <iframe
              src={jaBook.url}
              title={jaBook.titleJa}
              className="w-full h-[72vh] min-h-[540px] bg-slate-100"
            />
          </section>
        )}
      </div>
    </div>
  );
}
