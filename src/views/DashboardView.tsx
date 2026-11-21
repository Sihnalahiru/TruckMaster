import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Clock,
  Flame,
  Gauge,
  Layers,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Truck,
} from 'lucide-react';
import { computeStreaks, getTodayKey } from '../lib/storage';
import { evaluateTrophies, getDriverRank } from '../lib/gamification';
import { HighwayTruckProgress, TrophyBadgeIcon } from '../components/RewardEffects';
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
  onOpenDailyPopup: () => void;
}

export function DashboardView({
  manifest,
  progress,
  settings,
  onNavigate,
  onOpenSection,
  onOpenDailyPopup,
}: DashboardViewProps) {
  const today = getTodayKey();
  const { dailyStreak, weeklyStreak } = computeStreaks(progress.studySessions);
  const { rank, progressPct: rankPct, xpNeeded } = getDriverRank(progress.xp);
  const trophies = evaluateTrophies(progress, settings);
  const unlockedTrophiesCount = trophies.filter((t) => t.unlocked).length;

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

  const dueFlashcards = Object.values(progress.flashcards).filter((c) => c.dueDate <= today).length;
  const unstartedFlashcards = Math.max(
    0,
    manifest.counts.vocabulary + manifest.counts.kanji - Object.keys(progress.flashcards).length,
  );
  const flashcardsDueTotal = dueFlashcards + Math.min(settings.dailyFlashcardTarget, unstartedFlashcards);

  const attempts = progress.examAttempts;
  const avgScorePct =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((s, a) => s + (a.totalCorrect / a.totalQuestions) * 100, 0) / attempts.length,
        )
      : null;
  const avgTheory =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.theoryCorrect, 0) / attempts.length) * 10) / 10
      : null;
  const avgPractical =
    attempts.length > 0
      ? Math.round((attempts.reduce((s, a) => s + a.practicalCorrect, 0) / attempts.length) * 10) / 10
      : null;
  const passedCount = attempts.filter((a) => a.overallPassed).length;

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

  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - dailyTargetPct / 100);

  return (
    <div className="space-y-6">
      {/* Truck Driver Cab Cockpit Hero */}
      <section className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="bg-gradient-to-br from-slate-900 via-[#0B4F8A] to-slate-900 text-white p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200">
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  Lv.{rank.level} {rank.titleEn}
                </span>
                <span aria-hidden="true">·</span>
                <span>{rank.vehicleClass}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold tabular-nums text-white">{progress.xp} XP</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white [text-wrap:balance]">
                {settings.learnerName} — TruckMaster Cab
              </h1>
              <p className="text-sm text-sky-100 font-sinhala">
                {rank.titleSi} · ජපාන SSW ට්‍රක් රථ රියදුරු අධ්‍යයන සහ CBT පුහුණු මධ්‍යස්ථානය
              </p>

              {/* EXP Progress to Next License Class */}
              <div className="max-w-md pt-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-sky-200 tabular-nums">
                  <span>Driver License EXP</span>
                  <span>{xpNeeded > 0 ? `${xpNeeded} XP to Lv.${rank.level + 1}` : 'Max Rank Achieved'}</span>
                </div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(rankPct, 4)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Daily Focus Speedometer Card */}
            <div className="flex items-center gap-4 shrink-0 bg-slate-950/45 border border-white/15 rounded-2xl p-4">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
                  <circle
                    cx="42"
                    cy="42"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="42"
                    cy="42"
                    r={ringRadius}
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-sm font-extrabold font-mono tabular-nums text-white">
                  {dailyTargetPct}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-sky-200">Daily Target</p>
                <p className="text-lg font-extrabold font-mono tabular-nums text-white">
                  {todayMinutes} / {settings.dailyTargetMinutes}m
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={onOpenDailyPopup}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 whitespace-nowrap"
                  >
                    <Target className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Daily Tasks ({todayChecklistCount}/6)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Highway Syllabus Tracker */}
          <HighwayTruckProgress
            percent={overallStudyPct}
            leftLabel={`Overall SSW Route (${completedSectionsCount}/${totalSections} lessons)`}
            rightLabel={`${overallStudyPct}%`}
          />
        </div>

        {/* 4-Column Instrument Cluster KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-white dark:bg-slate-900">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Convoy Streak</p>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
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

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Trophies Earned</p>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span>
                {unlockedTrophiesCount}/{trophies.length}
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Rank: Lv.{rank.level} · {progress.xp} XP
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">Vocab &amp; Kanji</p>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {progress.masteredVocabIds.length}/{manifest.counts.vocabulary}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">vocab</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              Kanji {progress.masteredKanjiIds.length}/{manifest.counts.kanji} · {flashcardsDueTotal} due
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">CBT Exam Avg</p>
            <p className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400 shrink-0" aria-hidden="true" />
              <span>{avgScorePct !== null ? `${avgScorePct}%` : '—'}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {attempts.length === 0
                ? '15 papers ready'
                : `${passedCount}/${attempts.length} passed · T:${avgTheory} P:${avgPractical}`}
            </p>
          </div>
        </div>
      </section>

      {/* Main Split: Chapter Route Progress + Quick Launch / Trophies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400" aria-hidden="true" />
                  <span>4-Chapter Driving Syllabus</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full Japanese, Furigana, Romaji, English &amp; Sinhala textbook library
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('study')}
                className="text-xs font-bold text-[#0B4F8A] dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
              >
                Open Library
              </button>
            </div>

            <div className="space-y-3">
              {chapterStats.map(({ chapter, done, total, pct, examAcc, firstSectionId }) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => onOpenSection(chapter.id, firstSectionId)}
                  className="tm-card-press w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] dark:hover:border-sky-500 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        Chapter {chapter.number} · pp. {chapter.printedRange[0]}–{chapter.printedRange[1]}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                        {chapter.titleEn} · {chapter.titleJa}
                      </p>
                      <p className="text-xs text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                        {chapter.titleSi}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                        {pct}%
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {done}/{total}
                        {examAcc !== null ? ` · CBT ${examAcc}%` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-[#0B4F8A] to-[#0D7A5F] rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Trophy Cabinet Showcase */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span>Driver Trophy Cabinet</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
                  පාඩම්, වචන, කන්ජි සහ CBT විභාග සම්පූර්ණ කර කුසලාන දිනාගන්න
                </p>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {unlockedTrophiesCount}/{trophies.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trophies.map((trophy) => (
                <div
                  key={trophy.id}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                    trophy.unlocked
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
                  }`}
                >
                  <TrophyBadgeIcon tier={trophy.tier} unlocked={trophy.unlocked} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {trophy.titleEn}
                      </p>
                      <span className="text-[11px] font-mono font-semibold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {trophy.progressLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                      {trophy.titleSi}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right 5 Cols */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recommended Next Study Section */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <p className="text-xs font-bold text-[#0B4F8A] dark:text-sky-400">
              Next Dispatch Lesson
            </p>
            {recommendedNext ? (
              <>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {recommendedNext.code} · {recommendedNext.titleEn}
                  </h2>
                  <p className="text-xs text-[#0D7A5F] dark:text-emerald-400 font-sinhala mt-1">
                    {recommendedNext.titleSi}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenSection(recommendedNext!.chapterId, recommendedNext!.sectionId)
                  }
                  className="tm-card-press w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] transition-colors"
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
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Ch. {weakestChapter.chapter.number}: {weakestChapter.chapter.titleEn}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSection(weakestChapter.chapter.id, weakestChapter.firstSectionId)}
                  className="tm-card-press px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  Revise
                </button>
              </div>
            )}
          </section>

          {/* Quick Cab Controls */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Quick Controls
              </h2>
              <button
                type="button"
                onClick={onOpenDailyPopup}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                Daily Checklist ({todayChecklistCount}/6)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('flashcards')}
                className="tm-card-press p-3.5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] transition-colors"
              >
                <Layers className="w-5 h-5 text-[#0B4F8A] dark:text-sky-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Flashcards</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {flashcardsDueTotal} ready
                </p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('cbt')}
                className="tm-card-press p-3.5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0D7A5F] transition-colors"
              >
                <ClipboardCheck className="w-5 h-5 text-[#0D7A5F] dark:text-emerald-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">CBT Quiz</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">15 papers · Sinhala</p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('missions')}
                className="tm-card-press p-3.5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-colors"
              >
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Focus Timer</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {todayMinutes}m today
                </p>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="tm-card-press p-3.5 text-left rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 transition-colors"
              >
                <TrendingUp className="w-5 h-5 text-sky-600 dark:text-sky-400 mb-2" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Analytics</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Score trends</p>
              </button>
            </div>
          </section>

          {/* Recent CBT Exam History */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Recent CBT Results
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('cbt')}
                className="text-xs font-bold text-[#0B4F8A] dark:text-sky-400 hover:underline whitespace-nowrap"
              >
                All 15 Papers
              </button>
            </div>

            {attempts.length === 0 ? (
              <div className="py-6 text-center space-y-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Ready for Your First CBT Paper?
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
                  සිංහල, ඉංග්‍රීසි සහ ජපන් භාෂාවලින් CBT ප්‍රශ්න පත්‍ර පුහුණු වන්න.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('cbt')}
                  className="tm-card-press inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] min-h-[40px]"
                >
                  <span>Start Paper 01</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.slice(0, 4).map((att) => (
                  <div key={att.attemptId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {att.paperTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        T {att.theoryCorrect}/30 · P {att.practicalCorrect}/20
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
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
                        className="text-xs font-bold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity Log */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Recent EXP Log</h2>
            {progress.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete a lesson, flashcard, study session, or CBT paper to earn EXP and unlock driver ranks.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {progress.recentActivities.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-700 dark:text-slate-300 truncate">{ev.label}</span>
                    <span className="font-mono font-bold tabular-nums text-[#0D7A5F] dark:text-emerald-400 shrink-0">
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
