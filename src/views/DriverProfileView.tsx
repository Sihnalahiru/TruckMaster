import { useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Flame,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  Trophy,
  Upload,
} from 'lucide-react';
import { KYT_SCENARIOS } from '../data/kytScenarios';
import { computeStreaks, getTodayKey } from '../lib/storage';
import { evaluateTrophies, getDriverRank } from '../lib/gamification';
import { playFeedbackTone } from '../lib/sound';
import { DRIVER_AVATARS, DriverAvatarBadge } from '../components/DriverAvatar';
import { TrophyBadgeIcon } from '../components/RewardEffects';
import type {
  AppRoute,
  ContentManifest,
  LearnerProgressState,
  PersonalNoteItem,
  UserSettings,
} from '../types/truckmaster';

interface DriverProfileViewProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  onSavePersonalNote: (note: PersonalNoteItem) => void;
  onDeletePersonalNote: (noteId: string) => void;
  onRestoreBackup: (payload: { settings?: UserSettings; progress?: LearnerProgressState }) => void;
  onOpenSection: (chapterId: string, sectionId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

const WEEKDAYS = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export function DriverProfileView({
  manifest,
  progress,
  settings,
  onUpdateSettings,
  onSavePersonalNote,
  onDeletePersonalNote,
  onRestoreBackup,
  onOpenSection,
  onNavigate,
}: DriverProfileViewProps) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteChapter, setNoteChapter] = useState('general');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const today = getTodayKey();
  const { dailyStreak, weeklyStreak } = computeStreaks(progress.studySessions);
  const { rank, progressPct, xpNeeded } = getDriverRank(progress.xp);
  const trophies = evaluateTrophies(progress, settings);
  const unlockedCount = trophies.filter((t) => t.unlocked).length;

  // Build 7-day calendar strip (last 7 days including today)
  const weeklyCalendar = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - (6 - i));
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const mins = progress.studySessions
        .filter((s) => s.date === iso)
        .reduce((sum, s) => sum + s.minutes, 0);
      const scheduled = (settings.studyDaysOfWeek || [1, 2, 3, 4, 5, 6, 0]).includes(dt.getDay());
      return {
        iso,
        dayName: dt.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: dt.getDate(),
        mins,
        isToday: iso === today,
        hitTarget: mins >= settings.dailyTargetMinutes,
        scheduled,
      };
    });
  }, [progress.studySessions, settings.dailyTargetMinutes, settings.studyDaysOfWeek, today]);

  // Resolve bookmarked study sections
  const bookmarkedSections = useMemo(() => {
    const out: Array<{ chapterId: string; sectionId: string; code: string; titleEn: string; titleSi: string }> = [];
    for (const ch of manifest.chapters) {
      for (const t of ch.topics) {
        for (const s of t.sections) {
          if (progress.bookmarkedSectionIds.includes(s.sectionId)) {
            out.push({
              chapterId: ch.id,
              sectionId: s.sectionId,
              code: s.code,
              titleEn: s.titleEn,
              titleSi: s.titleSi,
            });
          }
        }
      }
    }
    return out;
  }, [manifest, progress.bookmarkedSectionIds]);

  const bookmarkedKyts = useMemo(
    () => KYT_SCENARIOS.filter((sc) => (progress.bookmarkedKytIds || []).includes(sc.id)),
    [progress.bookmarkedKytIds],
  );

  const toggleStudyDay = (dayNum: number) => {
    playFeedbackTone('tap', settings.soundEnabled);
    const current = settings.studyDaysOfWeek || [1, 2, 3, 4, 5, 6, 0];
    const exists = current.includes(dayNum);
    const next = exists ? current.filter((d) => d !== dayNum) : [...current, dayNum];
    onUpdateSettings({ ...settings, studyDaysOfWeek: next.length ? next : [dayNum] });
  };

  const handleAddNote = () => {
    if (!noteTitle.trim() && !noteBody.trim()) return;
    const item: PersonalNoteItem = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim() || 'Study Note',
      body: noteBody.trim(),
      chapterId: noteChapter,
      updatedAt: new Date().toISOString(),
    };
    onSavePersonalNote(item);
    setNoteTitle('');
    setNoteBody('');
    playFeedbackTone('xp', settings.soundEnabled);
  };

  const handleExportJson = () => {
    const bundle = {
      app: 'TruckMaster',
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      settings,
      progress,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truckmaster-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Full offline backup JSON downloaded.');
  };

  const handleExportSummary = () => {
    const lines = [
      `TruckMaster SSW Progress Report — ${today}`,
      `Driver: ${settings.learnerName} (Lv.${rank.level} ${rank.titleEn} · ${progress.xp} XP)`,
      `Study Sections Completed: ${progress.completedSectionIds.length}/${manifest.counts.sections}`,
      `Mastered Vocabulary: ${progress.masteredVocabIds.length}/${manifest.counts.vocabulary}`,
      `Mastered Kanji: ${progress.masteredKanjiIds.length}/${manifest.counts.kanji}`,
      `KYT Lab Scenes Completed: ${Object.keys(progress.kytResults || {}).length}/${KYT_SCENARIOS.length}`,
      `Simulator Scenarios Completed: ${Object.keys(progress.simulatorResults || {}).length}`,
      `CBT Exam Attempts: ${progress.examAttempts.length} (Passed: ${progress.examAttempts.filter((a) => a.overallPassed).length})`,
      `Streak: ${dailyStreak} day(s) / ${weeklyStreak} week(s)`,
      `Trophies Unlocked: ${unlockedCount}/${trophies.length}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truckmaster-progress-summary-${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Readable progress summary exported.');
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid');
        onRestoreBackup({ settings: parsed.settings, progress: parsed.progress });
        setStatusMessage('Backup restored successfully!');
      } catch {
        setStatusMessage('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Driver Identity & Truck Avatar Selector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <DriverAvatarBadge avatarId={settings.avatarId} size="lg" />
            <div>
              <p className="text-xs font-mono text-[#0B4F8A] dark:text-sky-400">
                Lv.{rank.level} {rank.titleEn} · {progress.xp} XP
              </p>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {settings.learnerName}
              </h1>
              <p className="text-xs text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                {rank.titleSi} · {xpNeeded > 0 ? `${xpNeeded} XP to next license rank` : 'Max Rank Reached'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                <Flame className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                {dailyStreak}d streak
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                <Trophy className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                {unlockedCount}/{trophies.length}
              </span>
            </div>
          </div>
        </div>

        {/* EXP Bar */}
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0B4F8A] to-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(progressPct, 5)}%` }}
          />
        </div>

        {/* Name & Avatar Picker */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-sm space-y-1">
            <label htmlFor="profile-driver-name" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Driver Callsign / Name
            </label>
            <input
              id="profile-driver-name"
              type="text"
              value={settings.learnerName}
              onChange={(e) => onUpdateSettings({ ...settings, learnerName: e.target.value })}
              className="w-full min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
            Truck Driver Profile Avatar · රියදුරු අවතාරය තෝරන්න
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {DRIVER_AVATARS.map((av) => {
              const active = settings.avatarId === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    playFeedbackTone('tap', settings.soundEnabled);
                    onUpdateSettings({ ...settings, avatarId: av.id });
                  }}
                  className={`tm-card-press p-3 rounded-2xl border flex items-center gap-3 text-left transition-colors ${
                    active
                      ? 'border-[#0B4F8A] bg-sky-50/60 dark:bg-sky-950/35'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <DriverAvatarBadge avatarId={av.id} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {av.nameEn}
                    </p>
                    <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                      {av.nameSi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Weekly Study Calendar & Custom Learning Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400" aria-hidden="true" />
              <span>Weekly Study Calendar</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Goal: {settings.dailyTargetMinutes}m / day
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weeklyCalendar.map((day) => {
              const pct = Math.min(100, Math.round((day.mins / Math.max(1, settings.dailyTargetMinutes)) * 100));
              return (
                <div
                  key={day.iso}
                  className={`p-2.5 rounded-xl border text-center space-y-1.5 ${
                    day.isToday
                      ? 'border-[#0B4F8A] bg-sky-50/70 dark:bg-sky-950/35'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{day.dayName}</p>
                  <p className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {day.dayNum}
                  </p>
                  <div className="h-10 w-2.5 mx-auto rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-end">
                    <div
                      className={`w-full rounded-full ${
                        day.hitTarget ? 'bg-[#0D7A5F]' : 'bg-[#0B4F8A]'
                      }`}
                      style={{ height: `${Math.max(pct, day.mins > 0 ? 15 : 0)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {day.mins}m
                  </p>
                </div>
              );
            })}
          </div>

          {/* Custom Daily & Weekly Learning Schedule */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
              <span>Custom Weekly Study Schedule &amp; Reminders</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => {
                const on = (settings.studyDaysOfWeek || [1, 2, 3, 4, 5, 6, 0]).includes(w.day);
                return (
                  <button
                    key={w.day}
                    type="button"
                    onClick={() => toggleStudyDay(w.day)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border min-h-[36px] ${
                      on
                        ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="sched-time" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Reminder Time
                </label>
                <input
                  id="sched-time"
                  type="time"
                  value={settings.reminderTime || '19:30'}
                  onChange={(e) => onUpdateSettings({ ...settings, reminderTime: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="sched-mins" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Daily Target (min)
                </label>
                <input
                  id="sched-mins"
                  type="number"
                  min={15}
                  max={600}
                  step={15}
                  value={settings.dailyTargetMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      dailyTargetMinutes: Math.max(15, Number(e.target.value) || 240),
                    })
                  }
                  className="w-full min-h-[40px] px-3 py-1.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Favorites & Bookmarks Hub */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Favorites &amp; Bookmarks</span>
          </h2>

          {bookmarkedSections.length === 0 &&
          bookmarkedKyts.length === 0 &&
          progress.bookmarkedQuestionIds.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
              තවම පාඩම් හෝ KYT දර්ශන Bookmark කර නැත. Study Library, KYT Lab හෝ Review Centre තුළින් Save/Bookmark කරන්න.
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {bookmarkedSections.map((sec) => (
                <button
                  key={sec.sectionId}
                  type="button"
                  onClick={() => onOpenSection(sec.chapterId, sec.sectionId)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] flex items-center gap-2.5"
                >
                  <BookOpen className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {sec.code} · {sec.titleEn}
                    </p>
                    <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                      {sec.titleSi}
                    </p>
                  </div>
                </button>
              ))}
              {bookmarkedKyts.map((kyt) => (
                <button
                  key={kyt.id}
                  type="button"
                  onClick={() => onNavigate('kyt')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 flex items-center gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{kyt.titleEn}</p>
                    <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                      {kyt.titleSi}
                    </p>
                  </div>
                </button>
              ))}
              {progress.bookmarkedQuestionIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('review')}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0D7A5F] text-xs font-bold text-[#0D7A5F] dark:text-emerald-400"
                >
                  {progress.bookmarkedQuestionIds.length} Bookmarked CBT Question(s) → Open Review
                </button>
              )}
            </div>
          )}

          {/* Export, Backup & Restore */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Progress Export, Backup &amp; Restore
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportSummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[38px]"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export Report</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[38px]"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Backup JSON</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[38px]"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restore</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                }}
              />
            </div>
            {statusMessage && (
              <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400">{statusMessage}</p>
            )}
          </div>
        </section>
      </div>

      {/* Personal Study Notes (Offline Notebook) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0D7A5F] dark:text-emerald-400" aria-hidden="true" />
            <span>Personal Study Notebook (Saved Offline)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
            ඔබේ වැදගත් SSW මතක සටහන් (සිංහල, ඉංග්‍රීසි හෝ ජපන් භාෂාවෙන්) මෙහි ආරක්ෂිතව සුරකින්න.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title (e.g. 4-hour rest rule)"
            className="sm:col-span-2 min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <select
            value={noteChapter}
            onChange={(e) => setNoteChapter(e.target.value)}
            aria-label="Tag note chapter"
            className="min-h-[42px] px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="general">General Note</option>
            <option value="ch-01">Chapter 01 · Basics</option>
            <option value="ch-02">Chapter 02 · Operations</option>
            <option value="ch-03">Chapter 03 · Cargo</option>
            <option value="ch-04">Chapter 04 · KYT</option>
          </select>
        </div>

        <textarea
          rows={3}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="Write your study reminder or formula here..."
          className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-sinhala"
        />

        <button
          type="button"
          onClick={handleAddNote}
          className="tm-card-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#0B4F8A] text-white hover:bg-[#083D6B] min-h-[40px]"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Save Note Offline</span>
        </button>

        {(progress.personalNotes || []).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {progress.personalNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{note.title}</p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {note.chapterId.toUpperCase()} · {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeletePersonalNote(note.id)}
                    aria-label="Delete note"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-sinhala whitespace-pre-wrap">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Complete Achievement Collection */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Achievement &amp; Trophy Collection ({unlockedCount}/{trophies.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trophies.map((t) => (
            <div
              key={t.id}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                t.unlocked
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75'
              }`}
            >
              <TrophyBadgeIcon tier={t.tier} unlocked={t.unlocked} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.titleEn}</p>
                  {t.unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-[#0D7A5F] shrink-0" />}
                </div>
                <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                  {t.titleSi}
                </p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.progressLabel}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
