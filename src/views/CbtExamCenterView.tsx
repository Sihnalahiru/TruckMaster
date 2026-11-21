import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Grid,
  Languages,
  Lock,
  Play,
  Send,
} from 'lucide-react';
import { loadPaper } from '../lib/contentLoader';
import { playFeedbackTone } from '../lib/sound';
import { ResilientImage } from '../components/ResilientImage';
import { RubyText } from '../components/RubyText';
import { HighwayTruckProgress } from '../components/RewardEffects';
import type {
  CbtAttemptRecord,
  CbtPaper,
  ContentManifest,
  InProgressExamState,
  LearnerProgressState,
  UserSettings,
} from '../types/truckmaster';

interface CbtExamCenterViewProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  settings: UserSettings;
  onSaveInProgress: (state: InProgressExamState | null) => void;
  onSubmitAttempt: (attempt: CbtAttemptRecord) => void;
  onOpenReview: (attemptId: string) => void;
  onExamActiveChange: (active: boolean) => void;
}

type QuizMode = 'trilingual' | 'strict_cbt';

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CbtExamCenterView({
  manifest,
  progress,
  settings,
  onSaveInProgress,
  onSubmitAttempt,
  onOpenReview,
  onExamActiveChange,
}: CbtExamCenterViewProps) {
  const [activePaper, setActivePaper] = useState<CbtPaper | null>(null);
  const [loadingPaperId, setLoadingPaperId] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('trilingual');
  const [showSinhalaInQuiz, setShowSinhalaInQuiz] = useState(true);
  const [showEnglishInQuiz, setShowEnglishInQuiz] = useState(true);
  const [showRomajiInQuiz, setShowRomajiInQuiz] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(4800);
  const [startedAt, setStartedAt] = useState<string>('');
  const [showGridModal, setShowGridModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [transitionLock, setTransitionLock] = useState(false);

  const submittedRef = useRef(false);
  const autoNextTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onExamActiveChange(Boolean(activePaper));
    return () => {
      onExamActiveChange(false);
      if (autoNextTimerRef.current) window.clearTimeout(autoNextTimerRef.current);
    };
  }, [activePaper]);

  // Countdown timer + autosave while active
  useEffect(() => {
    if (!activePaper) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          if (!submittedRef.current) {
            finalizeSubmission(activePaper, answers, flaggedIds, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activePaper, answers, flaggedIds]);

  // Autosave progress snapshot to IndexedDB
  useEffect(() => {
    if (!activePaper || submittedRef.current) return;
    onSaveInProgress({
      paperId: activePaper.paperId,
      currentIndex,
      answers,
      flaggedIds,
      remainingSeconds,
      startedAt,
    });
  }, [activePaper?.paperId, currentIndex, answers, flaggedIds, Math.floor(remainingSeconds / 10)]);

  const startOrResumePaper = async (paperId: string, resumeState?: InProgressExamState | null) => {
    setLoadingPaperId(paperId);
    submittedRef.current = false;
    playFeedbackTone('nav', settings.soundEnabled);
    try {
      const paper = await loadPaper(paperId);
      setActivePaper(paper);
      if (resumeState && resumeState.paperId === paperId) {
        setCurrentIndex(resumeState.currentIndex);
        setAnswers(resumeState.answers);
        setFlaggedIds(resumeState.flaggedIds);
        setRemainingSeconds(resumeState.remainingSeconds);
        setStartedAt(resumeState.startedAt);
      } else {
        setCurrentIndex(0);
        setAnswers({});
        setFlaggedIds([]);
        setRemainingSeconds(paper.durationSeconds);
        setStartedAt(new Date().toISOString());
      }
      setShowGridModal(false);
      setShowSubmitModal(false);
    } finally {
      setLoadingPaperId(null);
    }
  };

  const finalizeSubmission = (
    paper: CbtPaper,
    finalAnswers: Record<string, string>,
    finalFlags: string[],
    remSecs: number,
  ) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (autoNextTimerRef.current) window.clearTimeout(autoNextTimerRef.current);

    let theoryCorrect = 0;
    let practicalCorrect = 0;
    const chapterStats: Record<string, { correct: number; total: number }> = {};

    for (const q of paper.questions) {
      if (!chapterStats[q.chapterId]) chapterStats[q.chapterId] = { correct: 0, total: 0 };
      chapterStats[q.chapterId].total++;
      const isRight = finalAnswers[q.questionId] === q.correctAnswer;
      if (isRight) {
        chapterStats[q.chapterId].correct++;
        if (q.section === 'A') theoryCorrect++;
        else practicalCorrect++;
      }
    }

    const theoryPassed = theoryCorrect >= paper.sectionAPassMin;
    const practicalPassed = practicalCorrect >= paper.sectionBPassMin;
    const attempt: CbtAttemptRecord = {
      attemptId: `att-${Date.now()}`,
      paperId: paper.paperId,
      paperTitle: paper.titleEn,
      completedAt: new Date().toISOString(),
      durationSecondsTaken: Math.max(1, paper.durationSeconds - remSecs),
      answers: finalAnswers,
      flaggedIds: finalFlags,
      theoryCorrect,
      theoryTotal: paper.sectionACount,
      theoryPassed,
      practicalCorrect,
      practicalTotal: paper.sectionBCount,
      practicalPassed,
      totalCorrect: theoryCorrect + practicalCorrect,
      totalQuestions: paper.totalQuestions,
      overallPassed: theoryPassed && practicalPassed,
      chapterStats,
    };

    onSaveInProgress(null);
    onSubmitAttempt(attempt);
    setActivePaper(null);
    onOpenReview(attempt.attemptId);
  };

  // -------------------------------------------------------------------------
  // ACTIVE QUIZ / CBT INTERFACE (Supports Trilingual Sinhala Mode OR Strict JP CBT Mode)
  // -------------------------------------------------------------------------
  if (activePaper) {
    const question = activePaper.questions[currentIndex];
    const selected = answers[question.questionId];
    const isFlagged = flaggedIds.includes(question.questionId);
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = activePaper.totalQuestions - answeredCount;
    const secAAnswered = activePaper.questions
      .slice(0, 30)
      .filter((q) => Boolean(answers[q.questionId])).length;
    const secBAnswered = activePaper.questions
      .slice(30)
      .filter((q) => Boolean(answers[q.questionId])).length;

    const isTrilingual = quizMode === 'trilingual';
    const progressPct = Math.round(((currentIndex + 1) / activePaper.totalQuestions) * 100);

    const handleSelectAnswer = (optionId: string) => {
      if (transitionLock || submittedRef.current) return;
      playFeedbackTone('tap', settings.soundEnabled);
      setAnswers((prev) => ({ ...prev, [question.questionId]: optionId }));

      if (settings.autoNextInCbt && currentIndex < activePaper.totalQuestions - 1) {
        setTransitionLock(true);
        if (autoNextTimerRef.current) window.clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = window.setTimeout(() => {
          setCurrentIndex((idx) => Math.min(activePaper.totalQuestions - 1, idx + 1));
          setTransitionLock(false);
        }, 280);
      }
    };

    const toggleFlag = () => {
      playFeedbackTone('tap', settings.soundEnabled);
      setFlaggedIds((prev) =>
        prev.includes(question.questionId)
          ? prev.filter((id) => id !== question.questionId)
          : [...prev, question.questionId],
      );
    };

    return (
      <div className="space-y-4 max-w-6xl mx-auto tm-view-enter">
        {/* Top Cab Exam Header */}
        <header className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-sky-200 font-jp">
                {activePaper.titleJa} ·{' '}
                {question.section === 'A' ? '学科（正誤問題 1〜30）' : '実技・判断（選択問題 31〜50）'}
              </p>
              <p className="text-sm font-bold font-mono tabular-nums">
                問 {question.questionNumber} / {activePaper.totalQuestions}
                <span className="text-slate-400 font-normal ml-2.5">
                  解答済 {answeredCount} · 未解答 {unansweredCount} · 見直し {flaggedIds.length}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`px-3 py-2 rounded-xl font-mono text-sm font-bold tabular-nums flex items-center gap-1.5 ${
                  remainingSeconds < 600
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-amber-300'
                }`}
                aria-label="残り時間"
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowGridModal(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold min-h-[40px]"
              >
                <Grid className="w-4 h-4" aria-hidden="true" />
                <span>一覧</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D7A5F] hover:bg-[#09604B] text-white text-xs font-bold min-h-[40px] whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isTrilingual ? 'Submit' : '提出'}</span>
              </button>
            </div>
          </div>

          {/* Highway Truck Quiz Progress */}
          <HighwayTruckProgress percent={progressPct} />

          {/* Quiz Language Bar (Toggle Sinhala / English / Romaji OR Strict Exam Lock) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playFeedbackTone('tap', settings.soundEnabled);
                  setQuizMode(isTrilingual ? 'strict_cbt' : 'trilingual');
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  isTrilingual
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {isTrilingual ? (
                  <>
                    <Languages className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Trilingual Quiz</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>公式CBT (日本語のみ)</span>
                  </>
                )}
              </button>

              {isTrilingual && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackTone('tap', settings.soundEnabled);
                      setShowSinhalaInQuiz((v) => !v);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      showSinhalaInQuiz
                        ? 'bg-[#0D7A5F] text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    සිංහල
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackTone('tap', settings.soundEnabled);
                      setShowEnglishInQuiz((v) => !v);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      showEnglishInQuiz
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackTone('tap', settings.soundEnabled);
                      setShowRomajiInQuiz((v) => !v);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      showRomajiInQuiz
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Romaji
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setActivePaper(null);
              }}
              className="text-xs font-semibold text-slate-300 hover:text-white underline whitespace-nowrap"
            >
              Pause &amp; Exit
            </button>
          </div>
        </header>

        {/* Main Exam Grid: Question Stage (8 cols) + Desktop Question Navigator (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section
            key={question.questionId}
            className="tm-view-enter lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {question.section === 'A' ? '第1部 学科（○×）' : '第2部 実技（4択）'} · Q{question.questionNumber}
              </div>
              <button
                type="button"
                onClick={toggleFlag}
                aria-pressed={isFlagged}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border min-h-[38px] tm-card-press ${
                  isFlagged
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} aria-hidden="true" />
                <span>{isFlagged ? '見直し中' : 'あとで見直す'}</span>
              </button>
            </div>

            {/* Original Question Image (Uncropped) */}
            {question.imageSrc && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 flex items-center justify-center">
                <ResilientImage
                  src={question.imageSrc}
                  alt={`問${question.questionNumber}の図`}
                  loading="eager"
                  className="max-h-64 sm:max-h-80 w-auto object-contain rounded"
                />
              </div>
            )}

            {/* Question Stem: Japanese + Furigana + Optional Sinhala / English / Romaji */}
            <div className="space-y-3">
              <div className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-loose">
                <RubyText markup={question.japaneseRuby} showFurigana />
              </div>

              {isTrilingual && showRomajiInQuiz && question.romaji && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {question.romaji}
                </p>
              )}

              {isTrilingual && showSinhalaInQuiz && question.sinhala && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900">
                  <p className="text-[11px] font-bold text-[#0D7A5F] dark:text-emerald-300 mb-0.5">
                    සිංහල ප්‍රශ්නය
                  </p>
                  <p className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 font-sinhala">
                    {question.sinhala}
                  </p>
                </div>
              )}

              {isTrilingual && showEnglishInQuiz && question.english && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {question.english}
                </p>
              )}
            </div>

            {/* Answer Options (Japanese + Sinhala & English when Trilingual mode is active) */}
            <div
              className={`grid gap-3 ${
                question.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-1'
              }`}
              role="radiogroup"
              aria-label={`問${question.questionNumber}の選択肢`}
            >
              {question.options.map((opt) => {
                const isChosen = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    disabled={transitionLock}
                    onClick={() => handleSelectAnswer(opt.id)}
                    className={`tm-card-press w-full text-left p-4 rounded-2xl border-2 transition-colors min-h-[62px] flex items-start gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] ${
                      isChosen
                        ? 'border-[#0B4F8A] bg-sky-50/90 dark:bg-sky-950/50 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {question.type === 'MULTIPLE_CHOICE' && (
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-1 ${
                          isChosen
                            ? 'bg-[#0B4F8A] text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {opt.id}
                      </span>
                    )}
                    <div
                      className={`flex-1 space-y-1 ${
                        question.type === 'TRUE_FALSE' ? 'text-center' : ''
                      }`}
                    >
                      <span
                        className={`block leading-loose ${
                          question.type === 'TRUE_FALSE'
                            ? 'text-lg font-bold'
                            : 'text-sm sm:text-base font-medium'
                        }`}
                      >
                        <RubyText markup={opt.ruby} showFurigana />
                      </span>
                      {isTrilingual && showSinhalaInQuiz && opt.si && (
                        <span className="block text-xs sm:text-sm font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                          {opt.si}
                        </span>
                      )}
                      {isTrilingual && showEnglishInQuiz && opt.en && (
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {opt.en}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Previous / Next Controls */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  playFeedbackTone('nav', settings.soundEnabled);
                  setCurrentIndex((i) => Math.max(0, i - 1));
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 min-h-[44px] tm-card-press"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>前の問題</span>
              </button>

              {currentIndex < activePaper.totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    playFeedbackTone('nav', settings.soundEnabled);
                    setCurrentIndex((i) => Math.min(activePaper.totalQuestions - 1, i + 1));
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] min-h-[44px] tm-card-press"
                >
                  <span>次の問題</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-[#0D7A5F] rounded-xl hover:bg-[#09604B] min-h-[44px] tm-card-press"
                >
                  <span>解答を提出する</span>
                </button>
              )}
            </div>
          </section>

          {/* Desktop Question Navigation Grid (4 cols) */}
          <aside className="hidden lg:block lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">問題番号一覧</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                学科 {secAAnswered}/30 · 実技 {secBAnswered}/20
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  学科（1〜30）
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {activePaper.questions.slice(0, 30).map((q, idx) => {
                    const isCur = idx === currentIndex;
                    const done = Boolean(answers[q.questionId]);
                    const flg = flaggedIds.includes(q.questionId);
                    return (
                      <button
                        key={q.questionId}
                        type="button"
                        onClick={() => {
                          playFeedbackTone('nav', settings.soundEnabled);
                          setCurrentIndex(idx);
                        }}
                        className={`h-9 rounded-lg text-xs font-mono font-semibold tabular-nums border relative transition-colors ${
                          isCur
                            ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                            : flg
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-400'
                              : done
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#0D7A5F] dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {q.questionNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  実技・判断（31〜50）
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {activePaper.questions.slice(30).map((q, offset) => {
                    const idx = 30 + offset;
                    const isCur = idx === currentIndex;
                    const done = Boolean(answers[q.questionId]);
                    const flg = flaggedIds.includes(q.questionId);
                    return (
                      <button
                        key={q.questionId}
                        type="button"
                        onClick={() => {
                          playFeedbackTone('nav', settings.soundEnabled);
                          setCurrentIndex(idx);
                        }}
                        className={`h-9 rounded-lg text-xs font-mono font-semibold tabular-nums border transition-colors ${
                          isCur
                            ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                            : flg
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-400'
                              : done
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#0D7A5F] dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {q.questionNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>緑：解答済</span>
              <span>黄：見直し</span>
              <span>白：未解答</span>
            </div>
          </aside>
        </div>

        {/* Mobile Question Grid Modal */}
        {showGridModal && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowGridModal(false)}
          >
            <div
              className="tm-sheet-up bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">問題番号一覧（50問）</h3>
                <button
                  type="button"
                  onClick={() => setShowGridModal(false)}
                  className="text-xs font-semibold text-slate-500 px-2 py-1"
                >
                  閉じる
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {activePaper.questions.map((q, idx) => {
                  const isCur = idx === currentIndex;
                  const done = Boolean(answers[q.questionId]);
                  const flg = flaggedIds.includes(q.questionId);
                  return (
                    <button
                      key={q.questionId}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowGridModal(false);
                      }}
                      className={`h-11 rounded-xl text-xs font-mono font-bold tabular-nums border ${
                        isCur
                          ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                          : flg
                            ? 'bg-amber-50 text-amber-800 border-amber-400'
                            : done
                              ? 'bg-emerald-50 text-[#0D7A5F] border-emerald-300'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {q.questionNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="tm-modal-pop bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                解答を提出しますか？
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                解答済：{answeredCount}/50 · 未解答：{unansweredCount} · 見直し：{flaggedIds.length}
              </p>
              {unansweredCount > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  未解答の問題が {unansweredCount} 問残っています。提出後に解説（日本語・英語・シンハラ語）が表示されます。
                </p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl min-h-[44px]"
                >
                  試験に戻る
                </button>
                <button
                  type="button"
                  onClick={() => finalizeSubmission(activePaper, answers, flaggedIds, remainingSeconds)}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[#0D7A5F] hover:bg-[#09604B] rounded-xl min-h-[44px]"
                >
                  提出して採点する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // PAPER DIRECTORY (PAPER 01 – PAPER 15)
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>15 Practice Papers</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>750 Unique Textbook Questions</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>80 Minutes / Paper</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              CBT Exam &amp; Quiz Centre
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-sinhala">
              A කොටස (න්‍යාය 30න් 18+) සහ B කොටස (ප්‍රායෝගික 20න් 12+) සමඟ සිංහල, ඉංග්‍රීසි හා ජපන් භාෂාවලින් ප්‍රශ්න පුහුණු වන්න.
            </p>
          </div>

          {/* Quiz Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                playFeedbackTone('tap', settings.soundEnabled);
                setQuizMode('trilingual');
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
                quizMode === 'trilingual'
                  ? 'bg-[#0D7A5F] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              සිංහල + JP + EN Quiz
            </button>
            <button
              type="button"
              onClick={() => {
                playFeedbackTone('tap', settings.soundEnabled);
                setQuizMode('strict_cbt');
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap min-h-[38px] ${
                quizMode === 'strict_cbt'
                  ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Japanese Only CBT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="font-bold text-slate-900 dark:text-white">Section A — Theory (学科)</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              30 True / False · Min Pass: 18/30 (60%)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="font-bold text-slate-900 dark:text-white">Section B — Practical (実技)</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              20 Multiple Choice · Min Pass: 12/20 (60%)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900">
            <p className="font-bold text-[#0D7A5F] dark:text-emerald-300">
              {quizMode === 'trilingual' ? 'Trilingual Quiz Mode Active' : 'Official CBT Lock Active'}
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 font-sinhala">
              {quizMode === 'trilingual'
                ? 'සෑම ප්‍රශ්නයකම සහ පිළිතුරකම සිංහල, English සහ 日本語 පෙන්වයි.'
                : 'සැබෑ විභාගය මෙන් ජපන් භාෂාව සහ ふりがな පමණක් පෙන්වයි.'}
            </p>
          </div>
        </div>

        {progress.inProgressExam && (
          <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#0B4F8A] dark:text-sky-300">
                Unfinished Exam Saved: {progress.inProgressExam.paperId.toUpperCase()}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                {Object.keys(progress.inProgressExam.answers).length}/50 answered ·{' '}
                {formatTime(progress.inProgressExam.remainingSeconds)} remaining
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSaveInProgress(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() =>
                  startOrResumePaper(progress.inProgressExam!.paperId, progress.inProgressExam)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B4F8A] rounded-xl min-h-[40px] tm-card-press"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Resume Exam</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 15 Practice Papers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {manifest.papers.map((paper) => {
          const paperAttempts = progress.examAttempts.filter((a) => a.paperId === paper.paperId);
          const latest = paperAttempts[0];
          const passedEver = paperAttempts.some((a) => a.overallPassed);
          const isLoading = loadingPaperId === paper.paperId;

          return (
            <article
              key={paper.paperId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#0B4F8A]/60 dark:hover:border-sky-500/60 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>Paper {String(paper.paperNumber).padStart(2, '0')} · 80 min</span>
                  {passedEver && (
                    <span className="inline-flex items-center gap-1 text-[#0D7A5F] dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Passed
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {paper.titleEn} · {paper.titleJa}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
                  {paper.titleSi}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums pt-1">
                  30 Theory · 20 Practical · {paper.imageQuestionsCount} visual items
                </p>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                {latest && (
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-500 dark:text-slate-400">
                      Last: T {latest.theoryCorrect}/30 · P {latest.practicalCorrect}/20
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReview(latest.attemptId)}
                      className="font-sans font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                    >
                      Review
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={Boolean(loadingPaperId)}
                  onClick={() => startOrResumePaper(paper.paperId)}
                  className="tm-card-press w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] disabled:opacity-50 transition-colors"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>{isLoading ? 'Loading Paper...' : latest ? 'Retake Quiz' : 'Start Quiz'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
