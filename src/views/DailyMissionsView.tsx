import { useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  Pause,
  Play,
  RotateCcw,
  Save,
  Square,
} from 'lucide-react';
import { getTodayKey } from '../lib/storage';
import { playFeedbackTone } from '../lib/sound';
import type {
  LearnerProgressState,
  StudySessionLog,
  UserSettings,
} from '../types/truckmaster';

interface DailyMissionsViewProps {
  progress: LearnerProgressState;
  settings: UserSettings;
  onLogStudySession: (activity: StudySessionLog['activity'], minutes: number) => void;
  onToggleChecklistMission: (missionKey: string) => void;
}

const DAILY_PLAN: Array<{
  key: StudySessionLog['activity'];
  titleEn: string;
  titleSi: string;
  suggestedMins: number;
}> = [
  { key: 'notes', titleEn: 'Study Library Notes', titleSi: 'පෙළපොත් සටහන් අධ්‍යයනය', suggestedMins: 60 },
  { key: 'vocabulary', titleEn: 'Trucking Vocabulary', titleSi: 'ට්‍රක් රථ වචන මාලාව', suggestedMins: 45 },
  { key: 'kanji', titleEn: 'Core Kanji Drills', titleSi: 'ප්‍රධාන කන්ජි පුහුණුව', suggestedMins: 15 },
  { key: 'flashcards', titleEn: 'SRS Flashcard Review', titleSi: 'ෆ්ලෑෂ් කාඩ් පුනරීක්ෂණය', suggestedMins: 45 },
  { key: 'cbt', titleEn: 'CBT Mock Paper Practice', titleSi: 'CBT ප්‍රශ්න පත්‍ර පුහුණුව', suggestedMins: 60 },
  { key: 'revision', titleEn: 'Weak-Area Revision', titleSi: 'දුර්වල කොටස් නැවත පුහුණුව', suggestedMins: 15 },
];

export function DailyMissionsView({
  progress,
  settings,
  onLogStudySession,
  onToggleChecklistMission,
}: DailyMissionsViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<StudySessionLog['activity']>('notes');
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pausedByVisibility, setPausedByVisibility] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Never reward inactive/backgrounded screen time as focused study!
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'hidden' && running) {
        setRunning(false);
        setPausedByVisibility(true);
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [running]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const today = getTodayKey();
  const todaySessions = progress.studySessions.filter((s) => s.date === today);
  const todayMinutes = todaySessions.reduce((s, x) => s + x.minutes, 0);
  const todayChecked = progress.dailyChecklist[today] || [];

  const handleSaveSession = () => {
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    if (elapsedSeconds < 30) {
      setSavedNotice('Focus for at least 30 seconds before logging a study block.');
      return;
    }
    setRunning(false);
    onLogStudySession(selectedActivity, mins);
    playFeedbackTone('celebrate', settings.soundEnabled);
    setElapsedSeconds(0);
    setSavedNotice(`Logged ${mins} focused minute(s) (+${mins * 2} XP).`);
  };

  const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  const progressPct = Math.min(100, Math.round((todayMinutes / Math.max(1, settings.dailyTargetMinutes)) * 100));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Today: {todayMinutes} / {settings.dailyTargetMinutes} focused minutes ({progressPct}%)
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Daily 4-Hour Focused Study System
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sinhala mt-0.5">
              දිනකට පැය 4ක (මිනිත්තු 240) සැලසුම්ගත SSW විභාග අධ්‍යයන කාලසටහන
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Auto-pauses if tab is inactive
          </span>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0B4F8A] dark:bg-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Focused Study Timer */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <label htmlFor="timer-activity" className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Active Study Activity
            </label>
            <select
              id="timer-activity"
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value as StudySessionLog['activity'])}
              className="min-h-[42px] px-3 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {DAILY_PLAN.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.titleEn} ({p.suggestedMins}m target)
                </option>
              ))}
            </select>
            {pausedByVisibility && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Timer paused automatically while the tab was inactive.
              </p>
            )}
            {savedNotice && (
              <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400">{savedNotice}</p>
            )}
          </div>

          <div className="text-center space-y-3">
            <p className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {hh}:{mm}:{ss}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPausedByVisibility(false);
                  setSavedNotice(null);
                  setRunning((r) => !r);
                  playFeedbackTone('tap', settings.soundEnabled);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0B4F8A] hover:bg-[#083D6B] rounded-xl min-h-[44px]"
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{running ? 'Pause' : elapsedSeconds > 0 ? 'Resume' : 'Start Focus'}</span>
              </button>

              <button
                type="button"
                disabled={elapsedSeconds < 30}
                onClick={handleSaveSession}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0D7A5F] hover:bg-[#09604B] disabled:opacity-40 rounded-xl min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>Log Session</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setElapsedSeconds(0);
                }}
                aria-label="Reset timer"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Suggested Daily Missions Checklist */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Daily 240-Minute Blueprint Checklist
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {todayChecked.length}/{DAILY_PLAN.length} completed
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {DAILY_PLAN.map((mission) => {
            const done = todayChecked.includes(mission.key);
            const loggedForActivity = todaySessions
              .filter((s) => s.activity === mission.key)
              .reduce((sum, s) => sum + s.minutes, 0);

            return (
              <div key={mission.key} className="py-3.5 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    onToggleChecklistMission(mission.key);
                    playFeedbackTone('success', settings.soundEnabled);
                  }}
                  className="flex items-start gap-3 text-left flex-1 min-h-[44px]"
                >
                  {done ? (
                    <CheckSquare className="w-5 h-5 text-[#0D7A5F] dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        done ? 'text-[#0D7A5F] dark:text-emerald-400 line-through' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {mission.titleEn}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
                      {mission.titleSi}
                    </p>
                  </div>
                </button>
                <div className="text-right font-mono tabular-nums shrink-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {loggedForActivity} / {mission.suggestedMins}m
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
