import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { PRACTICE_QUESTIONS, type LanguageMode } from '../data/studyData';
import { ResilientImage } from './ResilientImage';

interface PracticeExamViewProps {
  language: LanguageMode;
  bestScore: number | null;
  onCompleteExam: (score: number, total: number) => void;
}

export function PracticeExamView({
  language,
  bestScore,
  onCompleteExam,
}: PracticeExamViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);

  const showEn = language === 'en' || language === 'bilingual';
  const showJa = language === 'ja' || language === 'bilingual';

  const question = PRACTICE_QUESTIONS[currentIndex];
  const selectedOptionId = answers[question.id];
  const isChecked = Boolean(checkedQuestions[question.id]);
  const isCorrect = selectedOptionId === question.correctOptionId;

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = PRACTICE_QUESTIONS.length;

  const computeScore = () =>
    PRACTICE_QUESTIONS.reduce(
      (acc, q) => acc + (answers[q.id] === q.correctOptionId ? 1 : 0),
      0,
    );

  const handleSelectOption = (optionId: string) => {
    if (isChecked) return;
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  };

  const handleCheckAnswer = () => {
    if (!selectedOptionId) return;
    setCheckedQuestions((prev) => ({ ...prev, [question.id]: true }));
  };

  const handleFinish = () => {
    const score = computeScore();
    onCompleteExam(score, totalQuestions);
    setShowSummary(true);
  };

  const handleReset = () => {
    setAnswers({});
    setCheckedQuestions({});
    setCurrentIndex(0);
    setShowSummary(false);
  };

  if (showSummary) {
    const score = computeScore();
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 70;

    return (
      <div className="space-y-8">
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500">
                <span>Practice Assessment Complete</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span>Passing benchmark: 70%</span>
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5">
                {passed ? 'Exam Benchmark Met · 合格水準達成' : 'Additional Review Recommended · 要復習'}
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                Review each item below with its official textbook diagram and bilingual explanation.
              </p>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-xs text-slate-500">Score</p>
                <p className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                  {score}/{totalQuestions}
                </p>
                <p
                  className={`text-sm font-semibold tabular-nums flex items-center justify-end gap-1.5 mt-0.5 ${
                    passed ? 'text-[#0D7A5F]' : 'text-[#C26D00]'
                  }`}
                >
                  {passed ? (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{percentage}% · {passed ? 'Pass' : 'Review'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-lg hover:bg-[#083D6B] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Retake Exam</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-200 mt-2">
            {PRACTICE_QUESTIONS.map((q, idx) => {
              const chosen = answers[q.id];
              const correct = chosen === q.correctOptionId;
              const chosenOpt = q.options.find((o) => o.id === chosen);
              const correctOpt = q.options.find((o) => o.id === q.correctOptionId);

              return (
                <div key={q.id} className="py-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-center">
                    <ResilientImage
                      src={q.figureSrc}
                      alt={`Question ${idx + 1} diagram`}
                      className="max-h-28 w-auto object-contain rounded"
                    />
                  </div>
                  <div className="md:col-span-9 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono tabular-nums text-slate-500">
                        Q{idx + 1} · {q.topicEn}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          correct ? 'text-[#0D7A5F]' : 'text-red-700'
                        }`}
                      >
                        {correct ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {correct ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    {showEn && <p className="text-sm font-semibold text-slate-900">{q.promptEn}</p>}
                    {showJa && <p className="text-sm text-slate-700">{q.promptJa}</p>}
                    {!correct && chosenOpt && (
                      <p className="text-xs text-red-700">
                        Your answer: {language === 'ja' ? chosenOpt.textJa : chosenOpt.textEn}
                      </p>
                    )}
                    {correctOpt && (
                      <p className="text-xs font-medium text-[#0D7A5F]">
                        Correct answer: {language === 'ja' ? correctOpt.textJa : correctOpt.textEn}
                      </p>
                    )}
                    <div className="text-xs text-slate-600 leading-relaxed pt-1 space-y-1">
                      {showEn && <p>{q.explanationEn}</p>}
                      {showJa && <p className="text-slate-500">{q.explanationJa}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Header & Progress Strip */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>{question.topicEn}</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>{question.topicJa}</span>
            {bestScore !== null && (
              <>
                <span aria-hidden="true" className="mx-2">·</span>
                <span className="font-mono tabular-nums">Best: {bestScore}/{totalQuestions}</span>
              </>
            )}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Illustrated SSW Practice Exam
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tabular-nums text-slate-500 mr-2">
            {answeredCount}/{totalQuestions} answered
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Reset
          </button>
        </div>
      </section>

      {/* Question Number Navigator */}
      <nav aria-label="Question navigator" className="flex flex-wrap items-center gap-1.5">
        {PRACTICE_QUESTIONS.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const ans = answers[q.id];
          const checked = checkedQuestions[q.id];
          const right = checked && ans === q.correctOptionId;
          const wrong = checked && ans && ans !== q.correctOptionId;

          let btnStyle = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
          if (isCurrent) {
            btnStyle = 'bg-[#0B4F8A] text-white border-[#0B4F8A]';
          } else if (right) {
            btnStyle = 'bg-emerald-50 text-[#0D7A5F] border-emerald-200';
          } else if (wrong) {
            btnStyle = 'bg-red-50 text-red-700 border-red-200';
          } else if (ans) {
            btnStyle = 'bg-sky-50 text-[#0B4F8A] border-sky-200';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`w-9 h-9 rounded-lg border text-xs font-mono font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] ${btnStyle}`}
              aria-label={`Go to question ${idx + 1}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {idx + 1}
            </button>
          );
        })}
      </nav>

      {/* Two-Zone Question Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Visual Diagram Stage */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
            <span className="font-mono tabular-nums">Textbook Figure #{question.figureId}</span>
            <span>Inspect carefully before answering</span>
          </div>
          <div className="flex-1 min-h-[280px] sm:min-h-[340px] bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-center">
            <ResilientImage
              src={question.figureSrc}
              alt={`Exam diagram figure ${question.figureId}`}
              loading="eager"
              className="max-h-[340px] w-auto object-contain rounded"
            />
          </div>
        </div>

        {/* Right: Prompt, Options & Explanation */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            {showEn && (
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {question.promptEn}
              </h2>
            )}
            {showJa && (
              <p className={`leading-relaxed ${showEn ? 'text-sm text-slate-600' : 'text-lg font-bold text-slate-900'}`}>
                {question.promptJa}
              </p>
            )}
          </div>

          <div className="space-y-2.5" role="radiogroup" aria-label="Answer choices">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const isRightChoice = opt.id === question.correctOptionId;

              let optionClasses =
                'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-900';
              if (isChecked) {
                if (isRightChoice) {
                  optionClasses = 'border-[#0D7A5F] bg-emerald-50/70 text-slate-900';
                } else if (isSelected && !isRightChoice) {
                  optionClasses = 'border-red-500 bg-red-50/70 text-slate-900';
                } else {
                  optionClasses = 'border-slate-200 bg-white text-slate-500 opacity-75';
                }
              } else if (isSelected) {
                optionClasses = 'border-[#0B4F8A] bg-sky-50/70 text-slate-900';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isChecked}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors flex items-start gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] ${optionClasses}`}
                >
                  <span className="font-mono text-xs font-semibold uppercase mt-0.5 w-5 shrink-0 text-slate-500">
                    {opt.id}.
                  </span>
                  <div className="flex-1 space-y-0.5">
                    {showEn && <p className="text-sm font-medium leading-snug">{opt.textEn}</p>}
                    {showJa && (
                      <p className={showEn ? 'text-xs text-slate-600' : 'text-sm font-medium'}>
                        {opt.textJa}
                      </p>
                    )}
                  </div>
                  {isChecked && isRightChoice && (
                    <CheckCircle2 className="w-5 h-5 text-[#0D7A5F] shrink-0" aria-label="Correct option" />
                  )}
                  {isChecked && isSelected && !isRightChoice && (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0" aria-label="Incorrect option" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback Panel */}
          {isChecked && (
            <div
              className={`p-4 rounded-lg border text-sm space-y-1.5 ${
                isCorrect
                  ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                  : 'bg-amber-50/70 border-amber-200 text-slate-800'
              }`}
            >
              <p
                className={`font-semibold flex items-center gap-1.5 ${
                  isCorrect ? 'text-[#0D7A5F]' : 'text-[#C26D00]'
                }`}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Correct · 正解</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Incorrect — Review Explanation · 不正解</span>
                  </>
                )}
              </p>
              {showEn && <p className="text-xs leading-relaxed text-slate-700">{question.explanationEn}</p>}
              {showJa && <p className="text-xs leading-relaxed text-slate-600">{question.explanationJa}</p>}
            </div>
          )}

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2.5">
              {!isChecked && (
                <button
                  type="button"
                  disabled={!selectedOptionId}
                  onClick={handleCheckAnswer}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0B4F8A] rounded-lg hover:bg-[#083D6B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                >
                  Check Answer
                </button>
              )}

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0D7A5F] rounded-lg hover:bg-[#09604B] transition-colors whitespace-nowrap shrink-0"
                >
                  Finish & Score Exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
