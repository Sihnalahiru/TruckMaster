import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Brain,
  CheckCircle2,
  Eye,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { loadPaper } from '../lib/contentLoader';
import { getTodayKey } from '../lib/storage';
import { playFeedbackTone } from '../lib/sound';
import { speakJapanese } from '../lib/speech';
import { ResilientImage } from '../components/ResilientImage';
import { RubyText } from '../components/RubyText';
import type {
  CbtAttemptRecord,
  CbtPaper,
  LearnerProgressState,
  SmartRevisionItem,
  UserSettings,
} from '../types/truckmaster';

interface ReviewCenterViewProps {
  progress: LearnerProgressState;
  settings: UserSettings;
  initialAttemptId?: string | null;
  onToggleQuestionBookmark: (questionId: string) => void;
  onRateRevisionItem: (
    itemId: string,
    rating: 'again' | 'hard' | 'good' | 'easy',
    label: string,
  ) => void;
  onOpenStudySection: (chapterId: string, sectionId: string) => void;
  onGoToCbt: () => void;
}

export function ReviewCenterView({
  progress,
  settings,
  initialAttemptId,
  onToggleQuestionBookmark,
  onRateRevisionItem,
  onOpenStudySection,
  onGoToCbt,
}: ReviewCenterViewProps) {
  const [activeTab, setActiveTab] = useState<'smart' | 'cbt'>(
    initialAttemptId ? 'cbt' : 'smart',
  );
  const [smartFilter, setSmartFilter] = useState<'due' | 'all' | 'question' | 'kanji' | 'vocab'>('due');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // CBT Review state
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>(
    initialAttemptId || progress.examAttempts[0]?.attemptId || '',
  );
  const [paper, setPaper] = useState<CbtPaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'unanswered' | 'bookmarked'>('all');
  const [retryMode, setRetryMode] = useState(false);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialAttemptId) {
      setSelectedAttemptId(initialAttemptId);
      setActiveTab('cbt');
    }
  }, [initialAttemptId]);

  const today = getTodayKey();
  const allRevisionItems: SmartRevisionItem[] = useMemo(
    () =>
      Object.values(progress.revisionQueue || {}).sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return b.missCount - a.missCount;
      }),
    [progress.revisionQueue],
  );

  const dueItems = useMemo(
    () => allRevisionItems.filter((item) => item.dueDate <= today),
    [allRevisionItems, today],
  );

  const filteredRevisionItems = useMemo(() => {
    if (smartFilter === 'due') return dueItems;
    if (smartFilter === 'all') return allRevisionItems;
    return allRevisionItems.filter((item) => item.kind === smartFilter);
  }, [allRevisionItems, dueItems, smartFilter]);

  const attempt: CbtAttemptRecord | undefined =
    progress.examAttempts.find((a) => a.attemptId === selectedAttemptId) || progress.examAttempts[0];

  useEffect(() => {
    if (!attempt) return;
    setLoading(true);
    setRetryMode(false);
    setRetryAnswers({});
    loadPaper(attempt.paperId)
      .then((p) => {
        setPaper(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [attempt?.attemptId, attempt?.paperId]);

  const filteredQuestions = useMemo(() => {
    if (!paper || !attempt) return [];
    return paper.questions.filter((q) => {
      const userAns = attempt.answers[q.questionId];
      const correct = userAns === q.correctAnswer;
      if (filter === 'incorrect') return Boolean(userAns) && !correct;
      if (filter === 'unanswered') return !userAns;
      if (filter === 'bookmarked') return progress.bookmarkedQuestionIds.includes(q.questionId);
      return true;
    });
  }, [paper, attempt, filter, progress.bookmarkedQuestionIds]);

  const minsTaken = attempt ? Math.floor(attempt.durationSecondsTaken / 60) : 0;
  const secsTaken = attempt ? attempt.durationSecondsTaken % 60 : 0;
  const incorrectQuestions =
    paper && attempt
      ? paper.questions.filter((q) => attempt.answers[q.questionId] !== q.correctAnswer)
      : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Unified Header + Mode Switcher */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-[#0B4F8A] dark:text-sky-400">
              SM-2 Spaced Repetition · Wrong Questions · Forgotten Kanji · Hard Vocabulary
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              Smart Revision Engine &amp; CBT Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sinhala mt-0.5">
              වැරදුණු ප්‍රශ්න, අමතක වන කන්ජි සහ අමාරු වචන ස්වයංක්‍රීයව Spaced Repetition ක්‍රමයෙන් පුනරීක්ෂණය වේ
            </p>
          </div>
          <div className="text-right font-mono tabular-nums text-xs">
            <p className="text-lg font-extrabold text-[#0B4F8A] dark:text-sky-400">
              {dueItems.length} Due Today
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              {allRevisionItems.length} total queued
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              playFeedbackTone('tap', settings.soundEnabled);
              setActiveTab('smart');
            }}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-colors min-h-[40px] ${
              activeTab === 'smart'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Smart Revision Queue ({dueItems.length} due)
          </button>
          <button
            type="button"
            onClick={() => {
              playFeedbackTone('tap', settings.soundEnabled);
              setActiveTab('cbt');
            }}
            className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-colors min-h-[40px] ${
              activeTab === 'cbt'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            CBT Paper Review ({progress.examAttempts.length})
          </button>
        </div>
      </section>

      {/* TAB 1: Smart Revision Engine (SM-2 Spaced Repetition) */}
      {activeTab === 'smart' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['due', `Due Today (${dueItems.length})`],
                ['all', `All Queued (${allRevisionItems.length})`],
                ['question', `Wrong Questions (${allRevisionItems.filter((i) => i.kind === 'question').length})`],
                ['kanji', `Hard Kanji (${allRevisionItems.filter((i) => i.kind === 'kanji').length})`],
                ['vocab', `Hard Vocab (${allRevisionItems.filter((i) => i.kind === 'vocab').length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSmartFilter(k)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border min-h-[36px] whitespace-nowrap ${
                  smartFilter === k
                    ? 'bg-slate-900 dark:bg-sky-500 text-white border-slate-900 dark:border-sky-500'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredRevisionItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0D7A5F] dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Brain className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {allRevisionItems.length === 0
                  ? 'Smart Revision Queue Is Ready'
                  : 'All Due Items Cleared for Today!'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sinhala max-w-lg mx-auto">
                CBT විභාග, KYT අභ්‍යාස, Simulator තීරණ, Audio ප්‍රශ්න වලදී වැරදෙන අයිතම සහ Kanji/Vocab "Difficult" ලෙස සලකුණු කරන ඒවා ස්වයංක්‍රීයව මෙහි එකතු වේ.
              </p>
              <button
                type="button"
                onClick={onGoToCbt}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#0B4F8A] rounded-xl min-h-[42px]"
              >
                Practice CBT Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRevisionItems.map((item) => {
                const isRevealed = Boolean(revealedIds[item.id]);
                const isDue = item.dueDate <= today;
                return (
                  <article
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                        <span className="uppercase font-bold text-[#0B4F8A] dark:text-sky-400">
                          {item.kind}
                        </span>
                        <span>·</span>
                        <span>{item.sourceLabel || 'TruckMaster'}</span>
                        <span>·</span>
                        <span>Missed {item.missCount}x</span>
                        <span>·</span>
                        <span className={isDue ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                          {isDue ? 'Due Now' : `Next: ${item.dueDate}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            speakJapanese(item.titleJa, {
                              rate: 0.88,
                              voiceURI: settings.preferredJapaneseVoiceURI,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Audio</span>
                        </button>
                        {item.chapterId && item.sectionId && (
                          <button
                            type="button"
                            onClick={() => onOpenStudySection(item.chapterId!, item.sectionId!)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                          >
                            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Lesson</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {item.imageSrc && (
                      <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 flex justify-center">
                        <ResilientImage
                          src={item.imageSrc}
                          alt={item.titleEn}
                          className="max-h-48 w-auto object-contain rounded"
                        />
                      </div>
                    )}

                    {/* Prompt in Interlinear Order */}
                    <div className="space-y-1.5">
                      <p className="text-base font-bold text-slate-900 dark:text-white leading-loose">
                        <RubyText markup={item.titleRuby || item.titleJa} showFurigana />
                      </p>
                      {item.romaji && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.romaji}</p>
                      )}
                      <p className="text-sm text-slate-700 dark:text-slate-300">{item.titleEn}</p>
                      <p className="text-sm font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                        {item.titleSi}
                      </p>
                    </div>

                    {!isRevealed ? (
                      <button
                        type="button"
                        onClick={() => {
                          playFeedbackTone('tap', settings.soundEnabled);
                          setRevealedIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                        className="tm-card-press w-full min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        <span>Reveal Answer &amp; Sinhala Explanation</span>
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
                          <p className="text-xs font-bold text-[#0D7A5F] dark:text-emerald-300">
                            Correct Answer &amp; Revision Note
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.answerEn}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-emerald-100 font-sinhala">
                            {item.answerSi}
                          </p>
                          {item.explanationSi && item.explanationSi !== item.answerSi && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-sinhala pt-1">
                              {item.explanationSi}
                            </p>
                          )}
                        </div>

                        {/* SM-2 Spaced Repetition Rating Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                          {(
                            [
                              ['again', 'Again (1d)', 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'],
                              ['hard', 'Hard', 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'],
                              ['good', 'Good (+XP)', 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-[#0B4F8A] dark:text-sky-300'],
                              ['easy', 'Mastered', 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-[#0D7A5F] dark:text-emerald-300'],
                            ] as const
                          ).map(([rating, label, cls]) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => {
                                onRateRevisionItem(item.id, rating, item.titleJa);
                                setRevealedIds((prev) => ({ ...prev, [item.id]: false }));
                              }}
                              className={`tm-card-press min-h-[42px] px-2 py-2 rounded-xl border text-xs font-bold ${cls}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Historical CBT Paper Review */}
      {activeTab === 'cbt' &&
        (!attempt ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              No Submitted CBT Papers Yet
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-sinhala">
              CBT ප්‍රශ්න පත්‍රයක් සම්පූර්ණ කර භාර දුන් පසු සිංහල, ඉංග්‍රීසි සහ රෝමාජි පැහැදිලි කිරීම් මෙහිදී විවෘත වේ.
            </p>
            <button
              type="button"
              onClick={onGoToCbt}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-xl min-h-[44px]"
            >
              Open CBT Exam Centre
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    Submitted {new Date(attempt.completedAt).toLocaleString()} · Time {minsTaken}m {secsTaken}s
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {attempt.paperTitle}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {progress.examAttempts.length > 1 && (
                    <select
                      value={attempt.attemptId}
                      onChange={(e) => setSelectedAttemptId(e.target.value)}
                      aria-label="Select historical attempt"
                      className="min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {progress.examAttempts.map((a) => (
                        <option key={a.attemptId} value={a.attemptId}>
                          {a.paperTitle} — {a.totalCorrect}/50 ({a.overallPassed ? 'PASS' : 'FAIL'})
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={onGoToCbt}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B4F8A] rounded-xl min-h-[40px]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Retake / New Paper</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Section A · Theory (Min 18/30)</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {attempt.theoryCorrect} / {attempt.theoryTotal}
                  </p>
                  <p
                    className={`text-xs font-bold mt-1 flex items-center gap-1 ${
                      attempt.theoryPassed ? 'text-[#0D7A5F] dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {attempt.theoryPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{attempt.theoryPassed ? 'SECTION A PASSED' : 'SECTION A FAILED'}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Section B · Practical (Min 12/20)</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {attempt.practicalCorrect} / {attempt.practicalTotal}
                  </p>
                  <p
                    className={`text-xs font-bold mt-1 flex items-center gap-1 ${
                      attempt.practicalPassed ? 'text-[#0D7A5F] dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {attempt.practicalPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{attempt.practicalPassed ? 'SECTION B PASSED' : 'SECTION B FAILED'}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Overall Result (Both ≥ 60%)</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {attempt.totalCorrect} / {attempt.totalQuestions}
                  </p>
                  <p
                    className={`text-xs font-bold mt-1 flex items-center gap-1 ${
                      attempt.overallPassed ? 'text-[#0D7A5F] dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {attempt.overallPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{attempt.overallPassed ? 'OVERALL PASS · සමත්' : 'OVERALL FAIL'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {(
                    [
                      ['all', 'All (50)'],
                      ['incorrect', 'Incorrect'],
                      ['unanswered', 'Unanswered'],
                      ['bookmarked', 'Bookmarked'],
                    ] as const
                  ).map(([f, label]) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setFilter(f);
                        setRetryMode(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${
                        !retryMode && filter === f
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {incorrectQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRetryMode((r) => !r)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl border min-h-[38px] ${
                      retryMode
                        ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {retryMode ? 'Exit Retry Mode' : `Retry Incorrect (${incorrectQuestions.length})`}
                  </button>
                )}
              </div>
            </section>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Loading full 5-language explanations...
              </div>
            ) : (
              <div className="space-y-4">
                {(retryMode ? incorrectQuestions : filteredQuestions).map((q) => {
                  const learnerAns = retryMode
                    ? retryAnswers[q.questionId]
                    : attempt.answers[q.questionId];
                  const isCorrect = learnerAns === q.correctAnswer;
                  const saved = progress.bookmarkedQuestionIds.includes(q.questionId);
                  const showReveal = !retryMode || Boolean(retryAnswers[q.questionId]);

                  return (
                    <article
                      key={q.questionId}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                          <span>
                            Q{q.questionNumber} · Section {q.section} · {q.chapterId.toUpperCase()} · p.{q.sourcePage}
                          </span>
                          {showReveal && (
                            <span
                              className={`font-sans font-bold inline-flex items-center gap-1 ${
                                isCorrect ? 'text-[#0D7A5F] dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {!learnerAns ? 'Unanswered' : isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenStudySection(q.chapterId, q.sectionId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                          >
                            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Open Study Section</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleQuestionBookmark(q.questionId)}
                            aria-label={`Bookmark question ${q.questionNumber}`}
                            className={`p-1.5 rounded-lg border ${
                              saved
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-700 dark:text-amber-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {q.imageSrc && (
                        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex justify-center">
                          <ResilientImage
                            src={q.imageSrc}
                            alt={`Question ${q.questionNumber} diagram`}
                            className="max-h-56 w-auto object-contain rounded"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-base font-semibold text-slate-900 dark:text-white leading-loose">
                          <RubyText markup={q.japaneseRuby} showFurigana />
                        </p>
                        {showReveal && (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{q.romaji}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{q.english}</p>
                            <p className="text-sm font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                              {q.sinhala}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const isRightOpt = opt.id === q.correctAnswer;
                          const isUserOpt = opt.id === learnerAns;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={!retryMode || Boolean(retryAnswers[q.questionId])}
                              onClick={() =>
                                setRetryAnswers((prev) => ({ ...prev, [q.questionId]: opt.id }))
                              }
                              className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm space-y-1 ${
                                showReveal && isRightOpt
                                  ? 'border-[#0D7A5F] bg-emerald-50/70 dark:bg-emerald-950/40'
                                  : showReveal && isUserOpt && !isRightOpt
                                    ? 'border-red-400 bg-red-50/70 dark:bg-red-950/40'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {q.type === 'MULTIPLE_CHOICE' ? `${opt.id}. ` : ''}
                                  <RubyText markup={opt.ruby} showFurigana />
                                </span>
                                {showReveal && isRightOpt && (
                                  <span className="text-[11px] font-bold text-[#0D7A5F] dark:text-emerald-400 shrink-0">
                                    Correct
                                  </span>
                                )}
                                {showReveal && isUserOpt && !isRightOpt && (
                                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 shrink-0">
                                    Your answer
                                  </span>
                                )}
                              </div>
                              {showReveal && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-sinhala">
                                  {opt.en} · {opt.si}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {showReveal && (
                        <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900 space-y-1.5 text-xs">
                          <p className="font-bold text-[#0B4F8A] dark:text-sky-300">
                            විස්තරාත්මක සිංහල පැහැදිලි කිරීම · Source: {q.sourceBook} (p. {q.sourcePage})
                          </p>
                          <p className="text-sm text-slate-800 dark:text-slate-200 font-sinhala">
                            {q.explanationSi}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">{q.explanationEn}</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
