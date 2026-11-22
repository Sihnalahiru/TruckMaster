import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Lightbulb,
  List,
  Repeat,
  Search,
  Volume2,
  X,
} from 'lucide-react';
import { loadChapter } from '../lib/contentLoader';
import { playFeedbackTone } from '../lib/sound';
import { speakJapanese, stopJapaneseSpeech } from '../lib/speech';
import { ResilientImage } from '../components/ResilientImage';
import { RubyText } from '../components/RubyText';
import { HighwayTruckProgress } from '../components/RewardEffects';
import type {
  ChapterData,
  ContentManifest,
  JapaneseParagraph,
  LanguageDisplayPrefs,
  LearnerProgressState,
  StudySectionData,
} from '../types/truckmaster';

interface StudyLibraryViewProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  languagePrefs: LanguageDisplayPrefs;
  soundEnabled: boolean;
  preferredVoiceURI?: string;
  initialChapterId?: string;
  initialSectionId?: string;
  onUpdateLanguagePrefs: (prefs: LanguageDisplayPrefs) => void;
  onToggleSectionComplete: (sectionId: string, label: string) => void;
  onToggleSectionBookmark: (sectionId: string) => void;
  onTrackLastVisited: (chapterId: string, sectionId: string) => void;
  onGoToCbt: () => void;
}

interface AlignedUnit {
  unitIndex: number;
  jpItems: JapaneseParagraph[];
  enItems: string[];
  siItems: string[];
}

/**
 * Aligns Japanese, English, and Sinhala paragraphs in exact sequential interlinear order
 * so each sentence/paragraph unit renders:
 * 1. Japanese + Furigana -> 2. Romaji -> 3. English -> 4. Sinhala
 * with zero dropped paragraphs even when Japanese/English paragraph splits differ slightly.
 */
function buildAlignedUnits(
  jpList: JapaneseParagraph[],
  enList: string[],
  siList: string[],
): AlignedUnit[] {
  const cleanEn = (enList || []).filter((p) => !/^\d+$/.test(String(p).trim()));
  const cleanSi = siList || [];
  const jpCount = jpList.length;
  const enCount = cleanEn.length;
  const siCount = cleanSi.length;
  const targetCount = Math.max(enCount, siCount);

  if (jpCount === 0 && targetCount === 0) return [];

  if (targetCount === 0) {
    return jpList.map((jp, idx) => ({
      unitIndex: idx,
      jpItems: [jp],
      enItems: [],
      siItems: [],
    }));
  }

  if (jpCount === 0) {
    return Array.from({ length: targetCount }, (_, idx) => ({
      unitIndex: idx,
      jpItems: [],
      enItems: cleanEn[idx] ? [cleanEn[idx]] : [],
      siItems: cleanSi[idx] ? [cleanSi[idx]] : [],
    }));
  }

  // Exact 1-to-1 match
  if (jpCount === targetCount) {
    return Array.from({ length: targetCount }, (_, idx) => ({
      unitIndex: idx,
      jpItems: [jpList[idx]],
      enItems: cleanEn[idx] ? [cleanEn[idx]] : [],
      siItems: cleanSi[idx] ? [cleanSi[idx]] : [],
    }));
  }

  // If more Japanese paragraphs than EN/SI, distribute Japanese paragraphs proportionally into targetCount units
  if (jpCount > targetCount) {
    const units: AlignedUnit[] = Array.from({ length: targetCount }, (_, idx) => ({
      unitIndex: idx,
      jpItems: [],
      enItems: cleanEn[idx] ? [cleanEn[idx]] : [],
      siItems: cleanSi[idx] ? [cleanSi[idx]] : [],
    }));
    for (let i = 0; i < jpCount; i++) {
      const bucket = Math.min(targetCount - 1, Math.floor((i * targetCount) / jpCount));
      units[bucket].jpItems.push(jpList[i]);
    }
    return units;
  }

  // If more EN/SI paragraphs than Japanese, distribute EN/SI proportionally into jpCount units
  const units: AlignedUnit[] = Array.from({ length: jpCount }, (_, idx) => ({
    unitIndex: idx,
    jpItems: [jpList[idx]],
    enItems: [],
    siItems: [],
  }));
  for (let i = 0; i < targetCount; i++) {
    const bucket = Math.min(jpCount - 1, Math.floor((i * jpCount) / targetCount));
    if (cleanEn[i]) units[bucket].enItems.push(cleanEn[i]);
    if (cleanSi[i]) units[bucket].siItems.push(cleanSi[i]);
  }
  return units;
}

export function StudyLibraryView({
  manifest,
  progress,
  languagePrefs,
  soundEnabled,
  preferredVoiceURI,
  initialChapterId,
  initialSectionId,
  onUpdateLanguagePrefs,
  onToggleSectionComplete,
  onToggleSectionBookmark,
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
  const [topicDrawerOpen, setTopicDrawerOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; caption: string } | null>(null);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);

  useEffect(() => {
    return () => stopJapaneseSpeech();
  }, []);

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
    return results.slice(0, 14);
  }, [manifest, searchQuery]);

  const isCompleted = activeSection
    ? progress.completedSectionIds.includes(activeSection.sectionId)
    : false;
  const isBookmarked = activeSection
    ? progress.bookmarkedSectionIds.includes(activeSection.sectionId)
    : false;

  const chapterSecIds = useMemo(() => flatSections.map((x) => x.section.sectionId), [flatSections]);
  const chapterDoneCount = chapterSecIds.filter((id) =>
    progress.completedSectionIds.includes(id),
  ).length;
  const chapterPct =
    chapterSecIds.length > 0 ? Math.round((chapterDoneCount / chapterSecIds.length) * 100) : 0;

  const toggleLang = (key: keyof LanguageDisplayPrefs) => {
    playFeedbackTone('tap', soundEnabled);
    onUpdateLanguagePrefs({ ...languagePrefs, [key]: !languagePrefs[key] });
  };

  const selectSection = (nextSectionId: string) => {
    stopJapaneseSpeech();
    setSpeakingKey(null);
    playFeedbackTone('nav', soundEnabled);
    setSectionId(nextSectionId);
    setTopicDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaySentence = (key: string, text: string, rate: number, repeatCount = 1) => {
    if (speakingKey === key) {
      stopJapaneseSpeech();
      setSpeakingKey(null);
      return;
    }
    speakJapanese(text, {
      rate,
      repeatCount,
      voiceURI: preferredVoiceURI,
      onStart: () => setSpeakingKey(key),
      onEnd: () => setSpeakingKey(null),
      onError: () => setSpeakingKey(null),
    });
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Compact Portrait-First Chapter & Lesson Navigator Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          role="tablist"
          aria-label="Syllabus Chapters"
        >
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
                  stopJapaneseSpeech();
                  playFeedbackTone('nav', soundEnabled);
                  setChapterId(ch.id);
                  if (secIds[0]) setSectionId(secIds[0]);
                }}
                className={`tm-card-press text-left px-3 py-2.5 rounded-xl border transition-colors min-h-[48px] ${
                  active
                    ? 'bg-[#0B4F8A] text-white border-[#0B4F8A] shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className={active ? 'text-amber-300 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                    CH {ch.number}
                  </span>
                  <span className={active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}>
                    {done}/{secIds.length}
                  </span>
                </div>
                <p className="text-xs font-bold truncate mt-0.5">{ch.titleEn}</p>
              </button>
            );
          })}
        </div>

        {/* One-Tap Portrait Section Switcher Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentIdx <= 0}
            onClick={() => {
              if (currentIdx > 0) selectSection(flatSections[currentIdx - 1].section.sectionId);
            }}
            aria-label="Previous section"
            className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 tm-card-press"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              playFeedbackTone('tap', soundEnabled);
              setTopicDrawerOpen(true);
            }}
            className="flex-1 min-w-0 min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-[#0B4F8A] dark:hover:border-sky-400 flex items-center justify-between gap-2 text-left transition-colors tm-card-press"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <List className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {activeSection
                    ? `Lesson ${currentIdx + 1}/${flatSections.length} · ${activeSection.code}`
                    : 'Browse All Lessons'}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {activeSection ? activeSection.titleEn : 'Loading lesson...'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            disabled={currentIdx < 0 || currentIdx >= flatSections.length - 1}
            onClick={() => {
              if (currentIdx >= 0 && currentIdx < flatSections.length - 1) {
                selectSection(flatSections[currentIdx + 1].section.sectionId);
              }
            }}
            aria-label="Next section"
            className="w-11 h-11 rounded-xl bg-[#0B4F8A] text-white flex items-center justify-center shrink-0 hover:bg-[#083D6B] disabled:opacity-35 tm-card-press"
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <HighwayTruckProgress
          percent={chapterPct}
          leftLabel={`Chapter Route Progress (${chapterDoneCount}/${chapterSecIds.length} sections)`}
          rightLabel={`${chapterPct}%`}
        />

        {/* 5-Language Instant Toggle Bar (Order: Japanese+Furigana -> Romaji -> English -> Sinhala) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
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
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap shrink-0 min-h-[36px] tm-card-press ${
                    on
                      ? key === 'showSinhala'
                        ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                        : 'bg-slate-900 dark:bg-sky-500 text-white border-slate-900 dark:border-sky-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Interlinear: 日本語 → Romaji → English → සිංහල
          </p>
        </div>
      </section>

      {/* Main Full-Width Portrait-Friendly Reading Canvas */}
      <article className="space-y-5">
        {loading || !activeSection || !activeTopic ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500">
            {error ? error : 'Loading structured textbook lesson...'}
          </div>
        ) : (
          <>
            {/* Section Title & Action Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  <span>Section {activeSection.code}</span>
                  <span aria-hidden="true" className="mx-2">·</span>
                  <span>
                    pp. {activeSection.printedPageStart}–{activeSection.printedPageEnd}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleSectionBookmark(activeSection.sectionId)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border min-h-[40px] tm-card-press whitespace-nowrap ${
                      isBookmarked
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
                    <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onToggleSectionComplete(
                        activeSection.sectionId,
                        `${activeSection.code} ${activeSection.titleEn}`,
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl min-h-[40px] tm-card-press whitespace-nowrap ${
                      isCompleted
                        ? 'bg-[#0D7A5F] text-white'
                        : 'bg-[#0B4F8A] text-white hover:bg-[#083D6B]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>{isCompleted ? 'Completed' : 'Mark Complete (+25 XP)'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {languagePrefs.showJapanese && (
                  <p className="text-base font-bold text-[#0B4F8A] dark:text-sky-400">
                    {activeSection.titleJa}
                  </p>
                )}
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white [text-wrap:balance]">
                  {activeSection.titleEn}
                </h1>
                {languagePrefs.showSinhala && (
                  <p className="text-sm font-bold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                    {activeSection.titleSi}
                  </p>
                )}
              </div>

              {languagePrefs.showSinhala && (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900 space-y-1">
                  <p className="text-xs font-bold text-[#0D7A5F] dark:text-emerald-300">
                    සිංහල සාරාංශය · Topic Overview
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-sinhala">
                    {activeSection.sinhalaSummary}
                  </p>
                </div>
              )}

              {(activeSection.warnings.length > 0 || activeSection.examTips.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {activeSection.warnings.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 space-y-1.5">
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Safety Warnings</span>
                      </p>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                        {activeSection.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activeSection.examTips.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/70 space-y-1.5">
                      <p className="text-xs font-bold text-[#0B4F8A] dark:text-sky-300 flex items-center gap-1.5">
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

            {/* Extracted Textbook Pages — INTERLINEAR Sentence/Paragraph Order:
                1. Japanese + Furigana (+ Audio) -> 2. Romaji -> 3. English -> 4. Sinhala */}
            {activeSection.pages.map((pg) => {
              const alignedUnits = buildAlignedUnits(
                pg.japaneseParagraphs || [],
                pg.englishParagraphs || [],
                pg.sinhalaParagraphs || [],
              );

              return (
                <section
                  key={pg.printedPage}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 sm:px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-100">
                      Textbook Page {pg.printedPage}
                    </span>
                    <span className="font-mono tabular-nums">
                      {alignedUnits.length} unit{alignedUnits.length !== 1 ? 's' : ''}
                      {pg.images.length > 0 ? ` · ${pg.images.length} diagram${pg.images.length > 1 ? 's' : ''}` : ''}
                    </span>
                  </div>

                  {/* Original Diagrams */}
                  {pg.images.length > 0 && (
                    <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
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
                              {languagePrefs.showJapanese && (
                                <p className="text-slate-600 dark:text-slate-300 font-medium">{im.captionJa}</p>
                              )}
                              {languagePrefs.showEnglish && (
                                <p className="text-slate-600 dark:text-slate-400">{im.captionEn}</p>
                              )}
                              {languagePrefs.showSinhala && (
                                <p className="text-[#0D7A5F] dark:text-emerald-400 font-sinhala font-medium">
                                  {im.captionSi}
                                </p>
                              )}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interlinear Aligned Sentence / Paragraph Stack */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {alignedUnits.length === 0 ? (
                      <div className="p-5 text-xs text-slate-400 italic text-center">
                        Illustration page
                      </div>
                    ) : (
                      alignedUnits.map((unit) => {
                        const unitKey = `p${pg.printedPage}-u${unit.unitIndex}`;
                        const jpSpeechText = unit.jpItems.map((j) => j.plain).join(' ');
                        const isPlayingNormal = speakingKey === `${unitKey}-norm`;
                        const isPlayingSlow = speakingKey === `${unitKey}-slow`;
                        const isPlayingRepeat = speakingKey === `${unitKey}-rep`;

                        return (
                          <div
                            key={unitKey}
                            className="p-4 sm:p-6 space-y-3"
                          >
                            {/* Compact Unit Header + Inline Japanese TTS Audio Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                                p.{pg.printedPage} · #{unit.unitIndex + 1}
                              </span>

                              {jpSpeechText && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePlaySentence(`${unitKey}-norm`, jpSpeechText, 0.95, 1)
                                    }
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors whitespace-nowrap min-h-[32px] ${
                                      isPlayingNormal
                                        ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0B4F8A]'
                                    }`}
                                    aria-label="Listen in Japanese normal speed"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>{isPlayingNormal ? 'Stop' : 'Listen'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePlaySentence(`${unitKey}-slow`, jpSpeechText, 0.68, 1)
                                    }
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors whitespace-nowrap min-h-[32px] ${
                                      isPlayingSlow
                                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-500'
                                    }`}
                                    aria-label="Listen slowly"
                                  >
                                    <span>0.7x</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePlaySentence(`${unitKey}-rep`, jpSpeechText, 0.9, 2)
                                    }
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors whitespace-nowrap min-h-[32px] ${
                                      isPlayingRepeat
                                        ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0D7A5F]'
                                    }`}
                                    aria-label="Repeat sentence twice"
                                  >
                                    <Repeat className="w-3 h-3" aria-hidden="true" />
                                    <span>2x</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 1. Japanese + Furigana */}
                            {languagePrefs.showJapanese && unit.jpItems.length > 0 && (
                              <div className="space-y-1.5">
                                {unit.jpItems.map((jp, idx) => (
                                  <p
                                    key={idx}
                                    className="text-[16px] font-medium text-slate-900 dark:text-slate-100 leading-loose"
                                  >
                                    <RubyText
                                      markup={jp.rubyMarkup}
                                      showFurigana={languagePrefs.showFurigana}
                                    />
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* 2. Romaji */}
                            {languagePrefs.showRomaji && unit.jpItems.some((j) => j.romaji) && (
                              <div className="space-y-1">
                                {unit.jpItems.map(
                                  (jp, idx) =>
                                    jp.romaji && (
                                      <p
                                        key={idx}
                                        className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
                                      >
                                        {jp.romaji}
                                      </p>
                                    ),
                                )}
                              </div>
                            )}

                            {/* 3. English */}
                            {languagePrefs.showEnglish && unit.enItems.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {unit.enItems.map((enText, idx) => (
                                  <p
                                    key={idx}
                                    className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                                  >
                                    {enText}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* 4. Sinhala — Immediately attached to this exact sentence/paragraph! */}
                            {languagePrefs.showSinhala && unit.siItems.length > 0 && (
                              <div className="p-3.5 rounded-xl bg-emerald-50/55 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/60 space-y-1">
                                {unit.siItems.map((siText, idx) => (
                                  <p
                                    key={idx}
                                    className="text-[15px] font-medium text-slate-900 dark:text-emerald-100 font-sinhala leading-relaxed"
                                  >
                                    {siText}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}

            {/* Clean Bottom Lesson Pager + Quick CBT Jump */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  disabled={currentIdx <= 0}
                  onClick={() => {
                    if (currentIdx > 0) selectSection(flatSections[currentIdx - 1].section.sectionId);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 min-h-[46px] tm-card-press whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playFeedbackTone('tap', soundEnabled);
                    setTopicDrawerOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[46px] whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {currentIdx + 1}/{flatSections.length}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={currentIdx < 0 || currentIdx >= flatSections.length - 1}
                  onClick={() => {
                    if (currentIdx >= 0 && currentIdx < flatSections.length - 1) {
                      selectSection(flatSections[currentIdx + 1].section.sectionId);
                    }
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] disabled:opacity-40 min-h-[46px] tm-card-press whitespace-nowrap"
                >
                  <span>Next Lesson</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={onGoToCbt}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-[#0D7A5F] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
                <span>Practice CBT Quiz Questions (with Sinhala)</span>
              </button>
            </section>
          </>
        )}
      </article>

      {/* Portrait-Friendly Slide-Up Topic & Search Drawer */}
      {topicDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Browse Chapter Lessons"
          onClick={() => setTopicDrawerOpen(false)}
        >
          <div
            className="tm-sheet-up sm:tm-modal-pop w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Browse Lessons &amp; Search
                </h2>
                <button
                  type="button"
                  onClick={() => setTopicDrawerOpen(false)}
                  aria-label="Close lessons menu"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any topic, KYT, Sinhala, or page #..."
                  className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0B4F8A]"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {searchQuery.trim() ? (
                searchResults.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No matching lessons found.</p>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((res) => (
                      <button
                        key={res.sectionId}
                        type="button"
                        onClick={() => {
                          setChapterId(res.chapterId);
                          setSearchQuery('');
                          selectSection(res.sectionId);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] bg-slate-50 dark:bg-slate-800/50 space-y-0.5"
                      >
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Ch.{res.chapterNum} · {res.code} · {res.pages}
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{res.titleEn}</p>
                        <p className="text-xs text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                          {res.titleSi}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                chapterData?.topics.map((topic) => (
                  <div key={topic.topicId} className="space-y-1.5">
                    <div className="px-1">
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Topic {topic.code} · pp. {topic.startPage}–{topic.endPage}
                      </p>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {topic.titleEn}
                      </p>
                      <p className="text-xs text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                        {topic.titleSi}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      {topic.sections.map((sec) => {
                        const active = sec.sectionId === activeSection?.sectionId;
                        const done = progress.completedSectionIds.includes(sec.sectionId);
                        const saved = progress.bookmarkedSectionIds.includes(sec.sectionId);
                        return (
                          <button
                            key={sec.sectionId}
                            type="button"
                            onClick={() => selectSection(sec.sectionId)}
                            className={`w-full text-left px-3.5 py-3 rounded-xl border transition-colors flex items-center justify-between gap-2 min-h-[50px] ${
                              active
                                ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                                : 'bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#0B4F8A]'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">
                                <span className="font-mono opacity-80 mr-1.5">{sec.code}</span>
                                {sec.titleEn}
                              </p>
                              <p
                                className={`text-[11px] truncate mt-0.5 ${
                                  active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {sec.titleJa}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {saved && (
                                <Bookmark
                                  className={`w-4 h-4 fill-current ${active ? 'text-amber-300' : 'text-amber-500'}`}
                                  aria-label="Bookmarked"
                                />
                              )}
                              {done && (
                                <CheckCircle2
                                  className={`w-4 h-4 ${active ? 'text-emerald-300' : 'text-[#0D7A5F] dark:text-emerald-400'}`}
                                  aria-label="Completed"
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="tm-modal-pop bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 space-y-3 border border-slate-200 dark:border-slate-800"
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
