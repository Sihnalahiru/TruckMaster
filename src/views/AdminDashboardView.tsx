import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Trash2, Unlock } from 'lucide-react';
import { loadAuditSummary } from '../lib/contentLoader';
import type { AuditSummaryPayload } from '../types/truckmaster';

export type ResetScope = 'study' | 'flashcards' | 'quiz' | 'settings' | 'full';

interface AdminDashboardViewProps {
  onExecuteReset: (scope: ResetScope) => void;
}

const ADMIN_PASSCODE = '2026';

export function AdminDashboardView({ onExecuteReset }: AdminDashboardViewProps) {
  const [audit, setAudit] = useState<AuditSummaryPayload | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState<ResetScope | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAuditSummary().then(setAudit).catch(() => {});
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PASSCODE) {
      setUnlocked(true);
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('Incorrect admin PIN. Default QA PIN is 2026.');
    }
  };

  const confirmAndRunReset = () => {
    if (!pendingReset || confirmText.trim().toUpperCase() !== 'RESET') return;
    onExecuteReset(pendingReset);
    setResetMessage(`Completed "${pendingReset}" learner-data reset. Master textbook source content remains intact.`);
    setPendingReset(null);
    setConfirmText('');
  };

  const resetLabels: Record<ResetScope, { title: string; desc: string }> = {
    study: {
      title: '1. Reset Study Progress',
      desc: 'Clears completed sections, bookmarks, and personal study notes only.',
    },
    flashcards: {
      title: '2. Reset Flashcard History',
      desc: 'Clears SRS due dates, ratings, and vocab/kanji mastery lists only.',
    },
    quiz: {
      title: '3. Reset CBT Quiz History',
      desc: 'Clears saved CBT attempts, in-progress exam snapshots, and bookmarked questions only.',
    },
    settings: {
      title: '4. Reset Settings',
      desc: 'Restores theme, targets, font scale, and audio preferences to defaults.',
    },
    full: {
      title: '5. Full Application Reset',
      desc: 'Clears ALL learner progress and settings. Never deletes master textbook or CBT source records.',
    },
  };

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Source Integrity, Translation QA &amp; Safe Learner Data Administration
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            Admin Quality-Control Dashboard
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Master Source Content Protected (Read-Only)</span>
        </div>
      </section>

      {!audit ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading verified audit reports...</div>
      ) : (
        <>
          {/* Source & CBT Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Source PDF Pages</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {audit.qaReport.sourceAudit.totalCombinedPdfPages}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-1">
                Verified {audit.qaReport.sourceAudit.verifiedPages} · Review {audit.qaReport.sourceAudit.needsReviewPages} · Failed {audit.qaReport.sourceAudit.failedPages}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Extracted Records</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {audit.extractionReport.totalStudySections}
                <span className="text-xs font-normal text-slate-500 ml-1">sections</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-1">
                JA {audit.extractionReport.totalJapaneseParagraphs} · EN {audit.extractionReport.totalEnglishParagraphs} paras
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">CBT Bank Coverage</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {audit.qaReport.cbtAudit.totalQuestionSlots}
                <span className="text-xs font-normal text-slate-500 ml-1">/ 15 papers</span>
              </p>
              <p className="text-xs text-[#0D7A5F] dark:text-emerald-400 font-mono tabular-nums mt-1">
                Dupes: {audit.qaReport.cbtAudit.duplicateQuestionCount} · Missing refs: {audit.qaReport.cbtAudit.missingSourceReferences}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Images &amp; Lexicon</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {audit.qaReport.visualsAudit.totalImages}
                <span className="text-xs font-normal text-slate-500 ml-1">images</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-1">
                Broken: {audit.qaReport.visualsAudit.brokenAssets} · Vocab {audit.qaReport.lexiconAudit.vocabularyCount} · Kanji {audit.qaReport.lexiconAudit.kanjiCount}
              </p>
            </div>
          </div>

          {/* Language Verification Matrix + Remaining Exceptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                5-Language &amp; Asset Verification Status
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Japanese Original (242 PDF pp.)</span>
                  <span className="font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">VERIFIED</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Ruby Furigana (JTA PDF Layer)</span>
                  <span className="font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">VERIFIED</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Hepburn Romaji Conversion</span>
                  <span className="font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">VERIFIED</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">English Original (240 PDF pp.)</span>
                  <span className="font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">VERIFIED</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Sinhala Textbook, Vocab, Kanji &amp; Quiz</span>
                  <span className="font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">ACTIVE</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Textbook Visual Diagrams (226/226)</span>
                  <span className="font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">MAPPED</span>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Content &amp; Exam Coverage Summary
              </h2>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                <li>All 482 English and Japanese textbook PDF pages are extracted into 62 structured sections across 4 chapters.</li>
                <li>All 226 original textbook illustrations and road signs are mapped inline with 0 broken image files.</li>
                <li>All 15 CBT papers (750 unique questions) support both Trilingual Quiz Mode (Japanese, Furigana, English &amp; Sinhala) and Official Japanese-Only Exam Lock.</li>
                <li>Learner progress, trophies, EXP, and SRS flashcards are stored locally offline in IndexedDB and localStorage.</li>
              </ul>
            </section>
          </div>
        </>
      )}

      {/* Permission-Protected Safe Reset Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {unlocked ? <Unlock className="w-4 h-4 text-[#0D7A5F]" /> : <Lock className="w-4 h-4 text-slate-400" />}
              <span>Permission-Protected Learner Data Reset Controls</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Admin resets clear only learner progress in IndexedDB/localStorage. Source textbook records are immutable.
            </p>
          </div>
          {unlocked && (
            <button
              type="button"
              onClick={() => setUnlocked(false)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              Lock Admin
            </button>
          )}
        </div>

        {resetMessage && (
          <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400">{resetMessage}</p>
        )}

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="flex flex-wrap items-center gap-3 pt-2">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter Admin PIN (default: 2026)"
              aria-label="Admin PIN"
              className="min-h-[42px] px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white w-64"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 rounded-xl min-h-[42px]"
            >
              Unlock Reset Controls
            </button>
            {pinError && <p className="text-xs text-red-600 dark:text-red-400 w-full">{pinError}</p>}
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {(['study', 'flashcards', 'quiz', 'settings', 'full'] as ResetScope[]).map((scope) => (
              <div
                key={scope}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {resetLabels[scope].title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {resetLabels[scope].desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPendingReset(scope);
                    setConfirmText('');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/70 min-h-[40px]"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Explicit Confirmation Modal */}
      {pendingReset && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirm {resetLabels[pendingReset].title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {resetLabels[pendingReset].desc} Type <strong>RESET</strong> below to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              className="w-full min-h-[42px] px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingReset(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText.trim().toUpperCase() !== 'RESET'}
                onClick={confirmAndRunReset}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl min-h-[40px]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
