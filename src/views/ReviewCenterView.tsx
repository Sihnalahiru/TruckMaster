import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { loadPaper } from '../lib/contentLoader';
import { ResilientImage } from '../components/ResilientImage';
import { RubyText } from '../components/RubyText';
import type {
  CbtAttemptRecord,
  CbtPaper,
  LearnerProgressState,
} from '../types/truckmaster';

interface ReviewCenterViewProps {
  progress: LearnerProgressState;
  initialAttemptId?: string | null;
  onToggleQuestionBookmark: (questionId: string) => void;
  onOpenStudySection: (chapterId: string, sectionId: string) => void;
  onGoToCbt: () => void;
}

export function ReviewCenterView({
  progress,
  initialAttemptId,
  onToggleQuestionBookmark,
  onOpenStudySection,
  onGoToCbt,
}: ReviewCenterViewProps) {
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>(
    initialAttemptId || progress.examAttempts[0]?.attemptId || '',
  );
  const [paper, setPaper] = useState<CbtPaper | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'unanswered' | 'bookmarked'>('all');
  const [retryMode, setRetryMode] = useState(false);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialAttemptId) setSelectedAttemptId(initialAttemptId);
  }, [initialAttemptId]);

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

  if (!attempt) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Review Centre — No Submitted Papers Yet
        </h1>
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
    );
  }

  const minsTaken = Math.floor(attempt.durationSecondsTaken / 60);
  const secsTaken = attempt.durationSecondsTaken % 60;
  const incorrectQuestions =
    paper?.questions.filter((q) => attempt.answers[q.questionId] !== q.correctAnswer) || [];

  return (
    <div className="space-y-6">
      {/* Attempt Selector & Score Summary */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Submitted {new Date(attempt.completedAt).toLocaleString()} · Time {minsTaken}m {secsTaken}s
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              CBT Review Centre · {attempt.paperTitle}
            </h1>
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

        {/* Independent Dual-Section Pass/Fail Breakdown */}
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
              {attempt.theoryPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              )}
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
              {attempt.practicalPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              )}
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
              {attempt.overallPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {attempt.overallPassed ? 'OVERALL PASS · සමත්' : 'OVERALL FAIL · නැවත පුහුණු වන්න'}
              </span>
            </p>
          </div>
        </div>

        {/* Filter & Retry Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                ['all', `All (50)`],
                ['incorrect', `Incorrect`],
                ['unanswered', `Unanswered`],
                ['bookmarked', `Bookmarked`],
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

      {/* Question-by-Question 5-Language Review List */}
      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">Loading full 5-language explanations...</div>
      ) : (
        <div className="space-y-4">
          {(retryMode ? incorrectQuestions : filteredQuestions).map((q) => {
            const learnerAns = retryMode ? retryAnswers[q.questionId] : attempt.answers[q.questionId];
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
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
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

                {/* 5-Language Question Breakdown */}
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900 dark:text-white leading-loose">
                    <RubyText markup={q.japaneseRuby} showFurigana />
                  </p>
                  {showReveal && (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{q.romaji}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{q.english}</p>
                      <p className="text-sm font-semibold text-[#0B4F8A] dark:text-sky-400 font-sinhala">
                        {q.sinhala}
                      </p>
                    </>
                  )}
                </div>

                {/* Interactive Retry Buttons OR Revealed Options */}
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

                {/* Detailed Sinhala & English Explanation */}
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
  );
}
