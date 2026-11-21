import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import {
  ALL_DIAGRAMS,
  DIAGRAM_SECTIONS,
  type DiagramItem,
  type DiagramSectionId,
} from '../data/imageManifest';
import type { LanguageMode } from '../data/studyData';
import { ResilientImage } from './ResilientImage';

interface DiagramGalleryViewProps {
  language: LanguageMode;
  bookmarkedIds: number[];
  onToggleBookmark: (id: number) => void;
}

const PAGE_SIZE = 24;

export function DiagramGalleryView({
  language,
  bookmarkedIds,
  onToggleBookmark,
}: DiagramGalleryViewProps) {
  const [section, setSection] = useState<DiagramSectionId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [page, setPage] = useState(1);
  const [activeDiagram, setActiveDiagram] = useState<DiagramItem | null>(null);

  const filteredDiagrams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_DIAGRAMS.filter((item) => {
      if (section !== 'all' && item.section !== section) return false;
      if (onlyBookmarked && !bookmarkedIds.includes(item.id)) return false;
      if (!q) return true;
      return (
        String(item.id).includes(q) ||
        item.filename.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.titleJa.toLowerCase().includes(q)
      );
    });
  }, [section, searchQuery, onlyBookmarked, bookmarkedIds]);

  const totalPages = Math.max(1, Math.ceil(filteredDiagrams.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredDiagrams.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeIdxInFiltered = activeDiagram
    ? filteredDiagrams.findIndex((d) => d.id === activeDiagram.id)
    : -1;

  useEffect(() => {
    if (!activeDiagram) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDiagram(null);
      } else if (e.key === 'ArrowRight' && activeIdxInFiltered >= 0 && activeIdxInFiltered < filteredDiagrams.length - 1) {
        setActiveDiagram(filteredDiagrams[activeIdxInFiltered + 1]);
      } else if (e.key === 'ArrowLeft' && activeIdxInFiltered > 0) {
        setActiveDiagram(filteredDiagrams[activeIdxInFiltered - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDiagram, activeIdxInFiltered, filteredDiagrams]);

  return (
    <div className="space-y-6">
      <section className="border-b border-slate-200 pb-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              <span className="font-mono tabular-nums">{ALL_DIAGRAMS.length} textbook figures</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span className="font-mono tabular-nums">{bookmarkedIds.length} bookmarked</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Official Textbook Visual Archive
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative flex items-center">
              <span className="sr-only">Search figures by number or keyword</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search figure # or keyword..."
                className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0B4F8A] w-56 sm:w-64"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setOnlyBookmarked((prev) => !prev);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                onlyBookmarked
                  ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4" aria-hidden="true" />
              <span>Bookmarked ({bookmarkedIds.length})</span>
            </button>
          </div>
        </div>

        {/* Section Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Diagram sections">
          {DIAGRAM_SECTIONS.map((sec) => {
            const active = section === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSection(sec.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {language === 'ja' ? sec.labelJa : sec.labelEn}
                <span className={`ml-1.5 font-mono tabular-nums ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                  {sec.rangeLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Results Grid */}
      {pageItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">No matching diagrams found</p>
          <p className="text-sm text-slate-500">
            Clear your search query or bookmark filter to view all 226 textbook figures.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSection('all');
              setOnlyBookmarked(false);
              setPage(1);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0B4F8A] rounded-lg hover:bg-[#083D6B] transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pageItems.map((item) => {
              const saved = bookmarkedIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveDiagram(item)}
                    className="aspect-[4/3] w-full bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-center overflow-hidden focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0B4F8A]"
                  >
                    <ResilientImage
                      src={item.src}
                      alt={item.titleEn}
                      className="max-h-full max-w-full object-contain"
                      fallbackLabel={`Figure #${item.id}`}
                    />
                  </button>
                  <div className="p-3.5 flex items-start justify-between gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setActiveDiagram(item)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        Fig. {item.id} · {item.filename}
                      </p>
                      <p className="text-sm font-medium text-slate-900 mt-1 line-clamp-2 leading-snug">
                        {language === 'ja' ? item.titleJa : item.titleEn}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(item.id)}
                      aria-label={saved ? `Remove bookmark for figure ${item.id}` : `Bookmark figure ${item.id}`}
                      aria-pressed={saved}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        saved
                          ? 'text-[#0B4F8A] bg-sky-50'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-sm">
            <p className="text-xs text-slate-500 tabular-nums">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredDiagrams.length)} of {filteredDiagrams.length} diagrams
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Prev</span>
              </button>
              <span className="text-xs font-mono tabular-nums text-slate-600 px-2">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Lightbox Modal */}
      {activeDiagram && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Figure ${activeDiagram.id} preview`}
          onClick={() => setActiveDiagram(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-mono tabular-nums text-slate-500">
                  Figure #{activeDiagram.id} · {activeDiagram.filename}
                </p>
                <h2 className="text-base font-bold text-slate-900 truncate mt-0.5">
                  {language === 'ja' ? activeDiagram.titleJa : activeDiagram.titleEn}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleBookmark(activeDiagram.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    bookmarkedIds.includes(activeDiagram.id)
                      ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{bookmarkedIds.includes(activeDiagram.id) ? 'Bookmarked' : 'Bookmark'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDiagram(null)}
                  aria-label="Close diagram preview"
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 p-6 flex items-center justify-center overflow-auto">
              <ResilientImage
                src={activeDiagram.src}
                alt={activeDiagram.titleEn}
                loading="eager"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-4 bg-white">
              <button
                type="button"
                disabled={activeIdxInFiltered <= 0}
                onClick={() => setActiveDiagram(filteredDiagrams[activeIdxInFiltered - 1])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span>Previous</span>
              </button>
              <span className="text-xs text-slate-500">
                {language === 'bilingual' ? activeDiagram.titleJa : `Use arrow keys to browse`}
              </span>
              <button
                type="button"
                disabled={activeIdxInFiltered < 0 || activeIdxInFiltered >= filteredDiagrams.length - 1}
                onClick={() => setActiveDiagram(filteredDiagrams[activeIdxInFiltered + 1])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
