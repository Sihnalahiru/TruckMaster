import { useEffect, useState } from 'react';
import { DiagramGalleryView } from './components/DiagramGalleryView';
import { PracticeExamView } from './components/PracticeExamView';
import { StudyGuidesView } from './components/StudyGuidesView';
import { TestBooksView } from './components/TestBooksView';
import { ALL_DIAGRAMS } from './data/imageManifest';
import { STUDY_CHAPTERS, type LanguageMode } from './data/studyData';

type WorkspaceTab = 'study' | 'practice' | 'gallery' | 'books';

const STORAGE_KEYS = {
  completedRules: 'ssw_truck_completed_rules_v1',
  bookmarks: 'ssw_truck_bookmarked_diagrams_v1',
  bestScore: 'ssw_truck_best_score_v1',
};

function readStoredArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('study');
  const [language, setLanguage] = useState<LanguageMode>('bilingual');
  const [completedRuleIds, setCompletedRuleIds] = useState<string[]>(() =>
    readStoredArray<string>(STORAGE_KEYS.completedRules),
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() =>
    readStoredArray<number>(STORAGE_KEYS.bookmarks),
  );
  const [bestScore, setBestScore] = useState<number | null>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.bestScore);
      if (!raw) return null;
      const num = parseInt(raw, 10);
      return Number.isNaN(num) ? null : num;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.completedRules, JSON.stringify(completedRuleIds));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }, [completedRuleIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(bookmarkedIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookmarkedIds]);

  const handleToggleRule = (ruleId: string) => {
    setCompletedRuleIds((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId],
    );
  };

  const handleToggleBookmark = (id: number) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCompleteExam = (score: number) => {
    setBestScore((prev) => {
      const next = prev === null ? score : Math.max(prev, score);
      try {
        window.localStorage.setItem(STORAGE_KEYS.bestScore, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const totalCheckpoints = STUDY_CHAPTERS.reduce((sum, ch) => sum + ch.keyRules.length, 0);

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'study', label: 'Study Guides' },
    { id: 'practice', label: 'Hazard Practice' },
    { id: 'gallery', label: 'Visual Gallery' },
    { id: 'books', label: 'Test Books' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] rounded"
          >
            SSW Truck Prep
          </button>

          {/* Zone 2: 4 single-line text nav links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B4F8A] ${
                    active
                      ? 'border-[#0B4F8A] text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B4F8A] rounded-lg hover:bg-[#083D6B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A]"
            >
              Start Practice
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar (scrollable single-line, non-sticky to respect 15% cap) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-4 overflow-x-auto"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`text-sm whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                active
                  ? 'border-[#0B4F8A] text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Workspace Utility Strip (below header) */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>特定技能1号 自動車運送業（トラック）</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{ALL_DIAGRAMS.length} official figures</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {completedRuleIds.length}/{totalCheckpoints} checkpoints
            </span>
            {bestScore !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#0D7A5F] font-medium">
                  Best exam: {bestScore}/10
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Display:</span>
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg" role="group" aria-label="Language display mode">
              {(
                [
                  { id: 'en', label: 'English' },
                  { id: 'bilingual', label: 'EN + 日本語' },
                  { id: 'ja', label: '日本語' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLanguage(opt.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    language === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'study' && (
          <StudyGuidesView
            language={language}
            completedRuleIds={completedRuleIds}
            onToggleRule={handleToggleRule}
            onStartPractice={() => setActiveTab('practice')}
            onOpenBooks={() => setActiveTab('books')}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeExamView
            language={language}
            bestScore={bestScore}
            onCompleteExam={handleCompleteExam}
          />
        )}

        {activeTab === 'gallery' && (
          <DiagramGalleryView
            language={language}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
          />
        )}

        {activeTab === 'books' && <TestBooksView />}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            SSW Truck Prep · Study workspace built from official English & Japanese test book resources
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('study')}
              className="hover:text-slate-900 transition-colors"
            >
              Study Guides
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className="hover:text-slate-900 transition-colors"
            >
              226 Diagrams
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('books')}
              className="hover:text-slate-900 transition-colors"
            >
              PDF Manuals
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
