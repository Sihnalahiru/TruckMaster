import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  Layers,
  Target,
  TrendingUp,
} from 'lucide-react';
import { computeStreaks, getTodayKey } from '../lib/storage';
import type {
  AppRoute,
  ContentManifest,
  LearnerProgressState,
  UserSettings,
} from '../types/truckmaster';

interface DashboardViewProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  settings: UserSettings;
  onNavigate: (route: AppRoute) => void;
  onOpenSection: (chapterId: string, sectionId: string) => void;
}

export function DashboardView({
  manifest,
  progress,
  settings,
  onNavigate,
  onOpenSection,
}: DashboardViewProps) {
  const today = getTodayKey();
  const { dailyStreak, weeklyStreak } = computeStreaks(progress.studySessions);

  const todayMinutes = progress.studySessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.minutes, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekStartStr = sevenDaysAgo.toISOString().slice(0, 10);
  const weeklyMinutes = progress.studySessions
    .filter((s) => s.date >= weekStartStr)
    .reduce((sum, s) => sum + s.minutes, 0);

  const totalSections = manifest.counts.sections;
  const completedSectionsCount = progress.completedSectionIds.length;
  const overallStudyPct = totalSections > 0 ? Math.round((completedSectionsCount / totalSections) * 100) : 0;

  const dailyTargetPct = Math.min(
    100,
    Math.round((todayMinutes / Math.max(1, settings.dailyTargetMinutes)) * 100),
  );

  // Flashcards due today
  const dueFlashcards = Object.values(progress.flashcards).filter((c) => c.dueDate <= today).length;
  const unstartedFlashcards = Math.max(
    0,
    manifest.counts.vocabulary + manifest.counts.kanji - Object.keys(progress.flashcards).length,
  );
  const flashcardsDueTotal = dueFlashcards + Math.min(settings.dailyFlashcardTarget, unstartedFlashcards);

  // CBT exam aggregates
  const attempts = progress.examAttempts;
  const avgScorePct =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((s, a) => s + (a.totalCorrect / a.totalQuestions) * 100, 0) / attempts.length,
        )
      : null;
  const avgTheory =
    attempts.length > 0
      ? Math.round(
          (attempts.reduce((s, a) => s + a.theoryCorrect, 0) / attempts.length) * 10,
        ) / 10
      : null;
  const avgPractical =
    attempts.length > 0
      ? Math.round(
          (attempts.reduce((s, a) => s + a.practicalCorrect, 0) / attempts.length) * 10,
        ) / 10
      : null;
  const passedCount = attempts.filter((a) => a.overallPassed).length;

  // Chapter-wise completion & weakest chapter
  const chapterStats = manifest.chapters.map((ch) => {
    const secIds = ch.topics.flatMap((t) => t.sections.map((s) => s.sectionId));
    const done = secIds.filter((id) => progress.completedSectionIds.includes(id)).length;
    const pct = secIds.length > 0 ? Math.round((done / secIds.length) * 100) : 0;

    let examCorrect = 0;
    let examTotal = 0;
    for (const att of attempts) {
      const cs = att.chapterStats[ch.id];
      if (cs) {
        examCorrect += cs.correct;
        examTotal += cs.total;
      }
    }
    const examAcc = examTotal > 0 ? Math.round((examCorrect / examTotal) * 100) : null;
    return { chapter: ch, done, total: secIds.length, pct, examAcc, firstSectionId: secIds[0] };
  });

  const weakestChapter = [...chapterStats].sort((a, b) => {
    const scoreA = a.examAcc !== null ? a.examAcc : a.pct;
    const scoreB = b.examAcc !== null ? b.examAcc : b.pct;
    return scoreA - scoreB;
  })[0];

  // Recommended next study section
  let recommendedNext: { chapterId: string; sectionId: string; titleEn: string; titleSi: string; code: string } | null = null;
  for (const ch of manifest.chapters) {
    for (const t of ch.topics) {
      for (const s of t.sections) {
        if (!progress.completedSectionIds.includes(s.sectionId)) {
          recommendedNext = {
            chapterId: ch.id,
            sectionId: s.sectionId,
            titleEn: s.titleEn,
            titleSi: s.titleSi,
            code: s.code,
          };
          break;
        }
      }
      if (recommendedNext) break;
    }
    if (recommendedNext) break;
  }

  const todayChecklistCount = (progress.dailyChecklist[today] || []).length;

  const achievements = [
    {
      id: 'first-section',
      title: 'First Lesson Complete',
      unlocked: completedSectionsCount >= 1,
    },
    {
      id: 'ten-vocab',
      title: '10 Trucking Terms Mastered',
      unlocked: progress.masteredVocabIds.length >= 10,
    },
    {
      id: 'first-cbt',
      title: 'First CBT Paper Completed',
      unlocked: attempts.length >= 1,
    },
    {
      id: 'cbt-pass',
      title: 'Dual-Section CBT Pass (60%/60%)',
      unlocked: passedCount >= 1,
    },
    {
      id: 'streak-3',
      title: '3-Day Focused Study Streak',
      unlocked: dailyStreak >= 3,
    },
    {
      id: 'hour-4',
      title: 'Daily 4-Hour Target Hit',
      unlocked: todayMinutes >= settings.dailyTargetMinutes,
    },
  ];

  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - dailyTargetPct / 100);

  return (
    <div className="space-y-6">
      {/* Hero Profile & Daily Focus Strip */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{settings.learnerName}</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>特定技能1号 自動車運送業（トラック）</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span className="font-mono tabular-nums text-[#0B4F8A] dark:text-sky-400 font-semibold">
                {progress.xp} XP
              </span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              Japan SSW Truck Driver Preparation
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-sinhala">
              ජපාන SSW ට්‍රක් රථ රියදුරු විභාගය සඳහා සම්පූර්ණ ත්‍රිභාෂා අධ්‍යයන සහ CBT පුහුණු වේදිකාව
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
                <circle
                  cx="42"
                  cy="42"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="42"
                  cy="42"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="text-[#0B4F8A] dark:text-sky-400 transition-all duration-300"
                />
              </svg>
              <span className="absolute text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {dailyTargetPct}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily Focused Target</p>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {todayMinutes} / {settings.dailyTargetMinutes} min
              </p>
              <button
                type="button"
                onClick={() => onNavigate('missions')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open 4-Hour Study Timer</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">Streaks</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span>{dailyStreak}d</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                / {weeklyStreak}w
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Weekly: {(weeklyMinutes / 60).toFixed(1)}h focused
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">Study Library</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {overallStudyPct}%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {completedSectionsCount} / {totalSections} sections complete
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">Lexicon &amp; Flashcards</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {progress.masteredVocabIds.length}/{manifest.counts.vocabulary}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">vocab</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Kanji {progress.masteredKanjiIds.length}/{manifest.counts.kanji} · {flashcardsDueTotal} due
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">CBT Exam Average</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {avgScorePct !== null ? `${avgScorePct}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {attempts.length === 0
                ? 'No attempts yet (15 papers ready)'
                : `${passedCount}/${attempts.length} passed · T:${avgTheory}/30 P:${avgPractical}/20`}
            </p>
          </div>
        </div>
      </section>

      {/* Main Split: Chapter Progress + Recommended Next / Weakest / Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: 4-Chapter Progress + Recent CBT History */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  4-Chapter Textbook Mastery
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  232 reconciled textbook pages across all official SSW chapters
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('study')}
                className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
              >
                Open Library
              </button>
            </div>

            <div className="space-y-4">
              {chapterStats.map(({ chapter, done, total, pct, examAcc, firstSectionId }) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => onOpenSection(chapter.id, firstSectionId)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] dark:hover:border-sky-500 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Chapter {chapter.number} · pp. {chapter.printedRange[0]}–{chapter.printedRange[1]}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {chapter.titleEn} · {chapter.titleJa}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala truncate">
                        {chapter.titleSi}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {pct}%
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {done}/{total} sec
                        {examAcc !== null ? ` · CBT ${examAcc}%` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-[#0B4F8A] dark:bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Recent CBT Exam Pass/Fail History */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                CBT Exam History
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('cbt')}
                className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline whitespace-nowrap"
              >
                All 15 Papers
              </button>
            </div>

            {attempts.length === 0 ? (
              <div className="py-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5">
                <ClipboardCheck className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  No CBT Exam Attempts Yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Each paper simulates the real 80-minute Japanese-only exam: 30 Theory True/False (min 18/30) and 20 Practical MCQ (min 12/20).
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('cbt')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] min-h-[44px]"
                >
                  <span>Start Paper 01</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.slice(0, 5).map((att) => (
                  <div key={att.attemptId} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {att.paperTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Theory {att.theoryCorrect}/30 · Practical {att.practicalCorrect}/20 ·{' '}
                        {new Date(att.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-bold font-mono tabular-nums ${
                          att.overallPassed
                            ? 'text-[#0D7A5F] dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {att.overallPassed ? 'PASS' : 'FAIL'} · {att.totalCorrect}/50
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigate('review')}
                        className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Cols: Recommended Next, Quick Launch, Achievements, Recent Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recommended Next Study Section */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <p className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-400">
              Recommended Next Step
            </p>
            {recommendedNext ? (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {recommendedNext.code} · {recommendedNext.titleEn}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-sinhala mt-1">
                    {recommendedNext.titleSi}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenSection(recommendedNext!.chapterId, recommendedNext!.sectionId)
                  }
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] transition-colors"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {progress.lastVisitedSection ? 'Continue Studying' : 'Start First Lesson'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <p className="text-sm text-[#0D7A5F] dark:text-emerald-400 font-semibold">
                All 62 study sections completed! Focus on CBT exam papers and flashcard retention.
              </p>
            )}

            {weakestChapter && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Priority Focus Area</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    Ch. {weakestChapter.chapter.number}: {weakestChapter.chapter.titleEn}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSection(weakestChapter.chapter.id, weakestChapter.firstSectionId)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  Revise
                </button>
              </div>
            )}
          </section>

          {/* Daily Mission & Quick Actions */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quick Study Actions
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Missions {todayChecklistCount}/6
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('flashcards')}
                className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Layers className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Flashcards</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {flashcardsDueTotal} ready
                </p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('cbt')}
                className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4 text-[#0D7A5F] dark:text-emerald-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">CBT Exam</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">15 full papers</p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('missions')}
                className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">4h Missions</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {todayMinutes}m today
                </p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="p-3.5 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Analytics</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Real trends</p>
              </button>
            </div>
          </section>

          {/* Achievement Badges */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Achievements</h2>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {achievements.filter((a) => a.unlocked).length}/{achievements.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {achievements.map((badge) => (
                <div key={badge.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {badge.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <Award className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true" />
                    )}
                    <span
                      className={`text-xs truncate ${
                        badge.unlocked
                          ? 'font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {badge.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {badge.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity Log */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            {progress.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your completed study sections, flashcard reviews, timer sessions, and CBT exams will appear here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {progress.recentActivities.slice(0, 6).map((ev) => (
                  <div key={ev.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-700 dark:text-slate-300 truncate">{ev.label}</span>
                    <span className="font-mono tabular-nums text-[#0D7A5F] dark:text-emerald-400 shrink-0">
                      +{ev.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
