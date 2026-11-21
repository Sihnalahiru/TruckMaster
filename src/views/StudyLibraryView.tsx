import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  Search,
  StickyNote,
} from 'lucide-react';
import { loadChapter } from '../lib/contentLoader';
import { ResilientImage } from '../components/ResilientImage';
import { RubyText } from '../components/RubyText';
import type {
  ChapterData,
  ContentManifest,
  LanguageDisplayPrefs,
  LearnerProgressState,
  StudySectionData,
} from '../types/truckmaster';

interface StudyLibraryViewProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  languagePrefs: LanguageDisplayPrefs;
  initialChapterId?: string;
  initialSectionId?: string;
  onUpdateLanguagePrefs: (prefs: LanguageDisplayPrefs) => void;
  onToggleSectionComplete: (sectionId: string, label: string) => void;
  onToggleSectionBookmark: (sectionId: string) => void;
  onSaveSectionNote: (sectionId: string, note: string) => void;
  onTrackLastVisited: (chapterId: string, sectionId: string) => void;
  onGoToCbt: () => void;
}

export function StudyLibraryView({
  manifest,
  progress,
  languagePrefs,
  initialChapterId,
  initialSectionId,
  onUpdateLanguagePrefs,
  onToggleSectionComplete,
  onToggleSectionBookmark,
  onSaveSectionNote,
  onTrackLastVisited,
  onGoToCbt,
}: StudyLibraryViewProps) {
  const [chapterId, setChapterId] = useState(
    initialChapterId || progress.lastVisitedSection?.chapterId || 'ch-01',
  );
  const [sectionId, setSectionId] = useState(
    initialSectionId || progress.lastVisitedSection?.sectionId || 'ch01-t01-s1',
  );
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxImg, setLightboxImg] = useState<{ src: string; caption: string } | null>(null);

  useEffect(() => {
    if (initialChapterId) setChapterId(initialChapterId);
    if (initialSectionId) setSectionId(initialSectionId);
  }, [initialChapterId, initialSectionId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadChapter(chapterId)
      .then((data) => {
        if (!active) return;
        setChapterData(data);
        const allSecs = data.topics.flatMap((t) => t.sections);
        if (!allSecs.some((s) => s.sectionId === sectionId) && allSecs.length > 0) {
          setSectionId(allSecs[0].sectionId);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load chapter');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [chapterId]);

  const flatSections = useMemo(() => {
    if (!chapterData) return [];
    return chapterData.topics.flatMap((t) =>
      t.sections.map((s) => ({ topic: t, section: s })),
    );
  }, [chapterData]);

  const currentIdx = flatSections.findIndex((item) => item.section.sectionId === sectionId);
  const currentEntry = currentIdx >= 0 ? flatSections[currentIdx] : flatSections[0] || null;
  const activeSection: StudySectionData | null = currentEntry?.section || null;
  const activeTopic = currentEntry?.topic || null;

  useEffect(() => {
    if (activeSection) {
      onTrackLastVisited(chapterId, activeSection.sectionId);
    }
  }, [chapterId, activeSection?.sectionId]);

  // Global manifest search across all 62 sections
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{
      chapterId: string;
      chapterNum: string;
      sectionId: string;
      code: string;
      titleEn: string;
      titleJa: string;
      titleSi: string;
      pages: string;
    }> = [];
    for (const ch of manifest.chapters) {
      for (const t of ch.topics) {
        for (const s of t.sections) {
          if (
            s.titleEn.toLowerCase().includes(q) ||
            s.titleJa.toLowerCase().includes(q) ||
            s.titleSi.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            String(s.printedPageStart).includes(q)
          ) {
            results.push({
              chapterId: ch.id,
              chapterNum: ch.number,
              sectionId: s.sectionId,
              code: s.code,
              titleEn: s.titleEn,
              titleJa: s.titleJa,
              titleSi: s.titleSi,
              pages: `pp. ${s.printedPageStart}–${s.printedPageEnd}`,
            });
          }
        }
      }
    }
    return results.slice(0, 12);
  }, [manifest, searchQuery]);

  const isCompleted = activeSection
    ? progress.completedSectionIds.includes(activeSection.sectionId)
    : false;
  const isBookmarked = activeSection
    ? progress.bookmarkedSectionIds.includes(activeSection.sectionId)
    : false;
  const noteValue = activeSection ? progress.sectionNotes[activeSection.sectionId] || '' : '';

  const toggleLang = (key: keyof LanguageDisplayPrefs) => {
    onUpdateLanguagePrefs({ ...languagePrefs, [key]: !languagePrefs[key] });
  };

  return (
    <div className="space-y-6">
      {/* Chapter Selector + Search Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span>Structured Textbook Library</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span className="font-mono tabular-nums">
                {progress.completedSectionIds.length}/{manifest.counts.sections} sections complete
              </span>
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Official SSW Truck Driving Syllabus
            </h1>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic, KYT, page #..."
              aria-label="Search study sections"
              className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0B4F8A]"
            />
            {searchResults.length > 0 && (
              <div className="absolute right-0 left-0 top-full mt-1.5 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.map((res) => (
                  <button
                    key={res.sectionId}
                    type="button"
                    onClick={() => {
                      setChapterId(res.chapterId);
                      setSectionId(res.sectionId);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Ch.{res.chapterNum} · {res.code} · {res.pages}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {res.titleEn}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{res.titleJa}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4 Master Syllabus Chapter Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" role="tablist" aria-label="Chapters">
          {manifest.chapters.map((ch) => {
            const active = ch.id === chapterId;
            const secIds = ch.topics.flatMap((t) => t.sections.map((s) => s.sectionId));
            const done = secIds.filter((id) => progress.completedSectionIds.includes(id)).length;
            return (
              <button
                key={ch.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setChapterId(ch.id);
                  if (secIds[0]) setSectionId(secIds[0]);
                }}
                className={`text-left p-3.5 rounded-xl border transition-colors min-h-[44px] ${
                  active
                    ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-mono ${active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    Ch. {ch.number}
                  </span>
                  <span className={`font-mono tabular-nums ${active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {done}/{secIds.length}
                  </span>
                </div>
                <p className="text-sm font-bold leading-snug truncate">{ch.titleEn}</p>
                <p className={`text-xs truncate mt-0.5 ${active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {ch.titleJa}
                </p>
              </button>
            );
          })}
        </div>

        {/* 5-Language Layer Toggle Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            5-Language Fields:
          </span>
          {(
            [
              ['showJapanese', '日本語'],
              ['showFurigana', 'ふりがな'],
              ['showRomaji', 'Romaji'],
              ['showEnglish', 'English'],
              ['showSinhala', 'සිංහල'],
            ] as Array<[keyof LanguageDisplayPrefs, string]>
          ).map(([key, label]) => {
            const on = languagePrefs[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleLang(key)}
                aria-pressed={on}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                  on
                    ? 'bg-slate-900 dark:bg-sky-500 text-white border-slate-900 dark:border-sky-500'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Split: Left Topic/Section Tree + Right Extracted Multi-Page Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Tree (4 cols) */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 lg:sticky lg:top-20 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-500 p-4">Loading chapter structure...</p>
          ) : error ? (
            <p className="text-sm text-red-600 p-4">{error}</p>
          ) : (
            chapterData?.topics.map((topic) => (
              <div key={topic.topicId} className="space-y-1.5">
                <div className="px-2 pt-1">
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Topic {topic.code} · pp. {topic.startPage}–{topic.endPage}
                  </p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {topic.titleEn}
                  </p>
                </div>
                <div className="space-y-1">
                  {topic.sections.map((sec) => {
                    const active = sec.sectionId === activeSection?.sectionId;
                    const done = progress.completedSectionIds.includes(sec.sectionId);
                    const saved = progress.bookmarkedSectionIds.includes(sec.sectionId);
                    return (
                      <button
                        key={sec.sectionId}
                        type="button"
                        onClick={() => setSectionId(sec.sectionId)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-start justify-between gap-2 min-h-[44px] ${
                          active
                            ? 'bg-[#0B4F8A]/10 dark:bg-sky-500/20 text-[#0B4F8A] dark:text-sky-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-[11px] opacity-75 mr-1.5">{sec.code}</span>
                          <span>{sec.titleEn}</span>
                          <p className="text-[11px] opacity-75 truncate mt-0.5">{sec.titleJa}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {saved && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-current" aria-label="Bookmarked" />}
                          {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#0D7A5F] dark:text-emerald-400" aria-label="Completed" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* Right Structured Source Reader (8 cols) */}
        <article className="lg:col-span-8 space-y-5">
          {loading || !activeSection || !activeTopic ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500">
              {error ? error : 'Loading verified textbook content...'}
            </div>
          ) : (
            <>
              {/* Section Header & Actions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    <span>Section {activeSection.code}</span>
                    <span aria-hidden="true" className="mx-2">·</span>
                    <span>
                      Printed pp. {activeSection.printedPageStart}–{activeSection.printedPageEnd}
                    </span>
                    <span aria-hidden="true" className="mx-2">·</span>
                    <span>{activeSection.examRelevance}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSectionBookmark(activeSection.sectionId)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border min-h-[40px] ${
                        isBookmarked
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
                      <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onToggleSectionComplete(
                          activeSection.sectionId,
                          `${activeSection.code} ${activeSection.titleEn}`,
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl min-h-[40px] ${
                        isCompleted
                          ? 'bg-[#0D7A5F] text-white'
                          : 'bg-[#0B4F8A] text-white hover:bg-[#083D6B]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white [text-wrap:balance]">
                    {activeSection.titleEn}
                  </h2>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300 font-jp">
                    {activeSection.titleJa}
                  </p>
                  {languagePrefs.showSinhala && (
                    <p className="text-sm font-semibold text-[#0B4F8A] dark:text-sky-400 font-sinhala">
                      {activeSection.titleSi}
                    </p>
                  )}
                </div>

                {/* Sinhala Technical Explanation Block (Additional content, never replacing source text!) */}
                {languagePrefs.showSinhala && (
                  <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900 space-y-1.5">
                    <p className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-300">
                      සිංහල පැහැදිලි කිරීම · Sinhala Study Explanation (Verified Topic Overview)
                    </p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-sinhala">
                      {activeSection.sinhalaSummary}
                    </p>
                  </div>
                )}

                {/* Warnings & Exam Tips */}
                {(activeSection.warnings.length > 0 || activeSection.examTips.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {activeSection.warnings.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 space-y-1.5">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Safety Warnings (Source Textbook)</span>
                        </p>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                          {activeSection.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeSection.examTips.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/70 space-y-1.5">
                        <p className="text-xs font-bold text-[#0D7A5F] dark:text-emerald-300 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Exam Key Points</span>
                        </p>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                          {activeSection.examTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extracted Source Pages — Verbatim Multi-Language Structured Cards */}
              {activeSection.pages.map((pg) => (
                <section
                  key={pg.printedPage}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                      Textbook Page {pg.printedPage}
                    </span>
                    <span className="font-mono tabular-nums">
                      EN PDF p.{pg.enPdfPage ?? '—'} · JA PDF p.{pg.jaPdfPage ?? '—'} · Status: {pg.extractionStatus}
                    </span>
                  </div>

                  {/* Original Diagrams mapped directly to this source page */}
                  {pg.images.length > 0 && (
                    <div className="p-5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
                      <div className={`grid gap-4 ${pg.images.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                        {pg.images.map((im) => (
                          <figure
                            key={im.imageId}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col items-center"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxImg({
                                  src: im.src,
                                  caption: `${im.captionEn} / ${im.captionSi}`,
                                })
                              }
                              className="w-full flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#0B4F8A] rounded-lg"
                              aria-label={`Zoom diagram ${im.imageId}`}
                            >
                              <ResilientImage
                                src={im.src}
                                alt={im.captionEn}
                                className="max-h-72 w-auto object-contain rounded"
                                fallbackLabel={im.imageId}
                              />
                            </button>
                            <figcaption className="mt-2.5 text-center space-y-0.5 text-xs">
                              <p className="font-medium text-slate-700 dark:text-slate-300">
                                {im.captionEn}
                              </p>
                              {languagePrefs.showJapanese && (
                                <p className="text-slate-500 dark:text-slate-400">{im.captionJa}</p>
                              )}
                              {languagePrefs.showSinhala && (
                                <p className="text-[#0B4F8A] dark:text-sky-400 font-sinhala">
                                  {im.captionSi}
                                </p>
                              )}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Extracted Japanese (with Ruby + Romaji) & English Source Text */}
                  <div className="p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {(languagePrefs.showJapanese || languagePrefs.showRomaji) && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Original Japanese {languagePrefs.showFurigana ? '+ Official JTA Furigana' : ''}
                        </p>
                        {pg.japaneseParagraphs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Visual / illustration page</p>
                        ) : (
                          pg.japaneseParagraphs.map((jp, idx) => (
                            <div key={idx} className="space-y-1">
                              {languagePrefs.showJapanese && (
                                <p className="text-[15px] text-slate-900 dark:text-slate-100 leading-loose">
                                  <RubyText
                                    markup={jp.rubyMarkup}
                                    showFurigana={languagePrefs.showFurigana}
                                  />
                                </p>
                              )}
                              {languagePrefs.showRomaji && jp.romaji && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {jp.romaji}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {languagePrefs.showEnglish && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Original English Textbook
                        </p>
                        {pg.englishParagraphs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Visual / illustration page</p>
                        ) : (
                          pg.englishParagraphs.map((enPara, idx) => (
                            <p
                              key={idx}
                              className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                            >
                              {enPara}
                            </p>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </section>
              ))}

              {/* Personal Study Notes + Section Navigation Footer */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="section-personal-note"
                    className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"
                  >
                    <StickyNote className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400" aria-hidden="true" />
                    <span>Personal Study Notes (Saved Offline)</span>
                  </label>
                  <button
                    type="button"
                    onClick={onGoToCbt}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Practice CBT Questions</span>
                  </button>
                </div>
                <textarea
                  id="section-personal-note"
                  rows={3}
                  value={noteValue}
                  onChange={(e) => onSaveSectionNote(activeSection.sectionId, e.target.value)}
                  placeholder="Write Sinhala / English / Japanese memory notes for this section..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white font-sinhala focus:outline-none focus:border-[#0B4F8A]"
                />

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={currentIdx <= 0}
                    onClick={() => {
                      if (currentIdx > 0) setSectionId(flatSections[currentIdx - 1].section.sectionId);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 min-h-[44px]"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Previous Section</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentIdx < 0 || currentIdx >= flatSections.length - 1}
                    onClick={() => {
                      if (currentIdx >= 0 && currentIdx < flatSections.length - 1) {
                        setSectionId(flatSections[currentIdx + 1].section.sectionId);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] disabled:opacity-40 min-h-[44px]"
                  >
                    <span>Next Section</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </section>
            </>
          )}
        </article>
      </div>

      {/* Image Zoom Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 space-y-3 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center bg-slate-50 dark:bg-slate-950 rounded-xl p-4">
              <img
                src={lightboxImg.src}
                alt={lightboxImg.caption}
                className="max-h-[72vh] w-auto object-contain rounded"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-sinhala">{lightboxImg.caption}</p>
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-700 text-white rounded-lg shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
