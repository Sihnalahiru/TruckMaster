import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ContentManifest, LearnerProgressState } from '../types/truckmaster';

interface AnalyticsViewProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  onOpenSection: (chapterId: string, sectionId: string) => void;
}

export function AnalyticsView({ manifest, progress, onOpenSection }: AnalyticsViewProps) {
  // Build last 7 days study duration data from real sessions
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (6 - i));
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const minutes = progress.studySessions
      .filter((s) => s.date === iso)
      .reduce((sum, s) => sum + s.minutes, 0);
    return {
      day: dt.toLocaleDateString(undefined, { weekday: 'short' }),
      date: iso,
      minutes,
    };
  });

  // Exam trend data (oldest -> newest)
  const examTrendData = [...progress.examAttempts].reverse().map((att, idx) => ({
    label: `#${idx + 1} (${att.paperId.replace('paper-', 'P')})`,
    theoryPct: Math.round((att.theoryCorrect / att.theoryTotal) * 100),
    practicalPct: Math.round((att.practicalCorrect / att.practicalTotal) * 100),
    totalPct: Math.round((att.totalCorrect / att.totalQuestions) * 100),
  }));

  // Flashcard accuracy from real history
  const fcValues = Object.values(progress.flashcards);
  const fcCorrect = fcValues.reduce((s, f) => s + f.correctCount, 0);
  const fcTotal = fcValues.reduce((s, f) => s + f.correctCount + f.incorrectCount, 0);
  const fcAccuracy = fcTotal > 0 ? Math.round((fcCorrect / fcTotal) * 100) : null;

  // Avg time per question
  const avgSecPerQ =
    progress.examAttempts.length > 0
      ? Math.round(
          progress.examAttempts.reduce((s, a) => s + a.durationSecondsTaken / a.totalQuestions, 0) /
            progress.examAttempts.length,
        )
      : null;

  // Chapter performance breakdown
  const chapterBreakdown = manifest.chapters.map((ch) => {
    const secIds = ch.topics.flatMap((t) => t.sections.map((s) => s.sectionId));
    const completed = secIds.filter((id) => progress.completedSectionIds.includes(id)).length;
    let cbtCorrect = 0;
    let cbtTotal = 0;
    for (const att of progress.examAttempts) {
      const st = att.chapterStats[ch.id];
      if (st) {
        cbtCorrect += st.correct;
        cbtTotal += st.total;
      }
    }
    return {
      chapterId: ch.id,
      label: `Ch.${ch.number}`,
      titleEn: ch.titleEn,
      completionPct: Math.round((completed / Math.max(1, secIds.length)) * 100),
      cbtAccuracy: cbtTotal > 0 ? Math.round((cbtCorrect / cbtTotal) * 100) : null,
      firstSectionId: secIds[0],
    };
  });

  const totalWeeklyMins = dailyData.reduce((s, d) => s + d.minutes, 0);
  const totalMonthlyMins = progress.studySessions.reduce((s, x) => s + x.minutes, 0);

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Real Persisted Performance Telemetry
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
          Learning Analytics &amp; Weak-Area Diagnostics
        </h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">7-Day Focused Study</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {(totalWeeklyMins / 60).toFixed(1)}h
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Total logged: {(totalMonthlyMins / 60).toFixed(1)}h
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Flashcard Accuracy</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {fcAccuracy !== null ? `${fcAccuracy}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {fcTotal} card ratings recorded
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg Time / CBT Question</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {avgSecPerQ !== null ? `${avgSecPerQ}s` : '—'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Target pace: &le;96s / Q
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Lexicon Mastery</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {progress.masteredVocabIds.length + progress.masteredKanjiIds.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              of {manifest.counts.vocabulary + manifest.counts.kanji} total items
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Focused Study Minutes Bar Chart */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Daily Focused Minutes (Last 7 Days)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logged exclusively from active timer sessions and completed CBT exams
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="m" />
                <Tooltip />
                <Bar dataKey="minutes" name="Focused Minutes" fill="#0B4F8A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* CBT Theory vs Practical Accuracy Trend */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              CBT Score Trend (Theory vs Practical)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              60% passing benchmark independently for both Section A and Section B
            </p>
          </div>
          {examTrendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-6">
              Complete your first CBT practice paper to populate real Theory and Practical accuracy trends.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={examTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="theoryPct" name="Theory %" stroke="#0B4F8A" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="practicalPct" name="Practical %" stroke="#0D7A5F" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Chapter Mastery & Weak-Topic Recommendations */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Chapter Mastery &amp; Actionable Revision Recommendations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Chapter</th>
                <th className="py-2.5 pr-4 font-medium">Study Completion</th>
                <th className="py-2.5 pr-4 font-medium">CBT Accuracy</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chapterBreakdown.map((row) => (
                <tr key={row.chapterId}>
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">
                    {row.label} · {row.titleEn}
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {row.completionPct}%
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums">
                    {row.cbtAccuracy !== null ? (
                      <span
                        className={
                          row.cbtAccuracy >= 70
                            ? 'text-[#0D7A5F] dark:text-emerald-400 font-semibold'
                            : 'text-amber-700 dark:text-amber-400 font-semibold'
                        }
                      >
                        {row.cbtAccuracy}%
                      </span>
                    ) : (
                      <span className="text-slate-400">No CBT data</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenSection(row.chapterId, row.firstSectionId)}
                      className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                    >
                      Study Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
