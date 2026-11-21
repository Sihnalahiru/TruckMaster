import { useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  CheckSquare,
  Clock,
  Flame,
  Play,
  Square,
  Target,
  Truck,
  X,
} from 'lucide-react';
import { computeStreaks, getTodayKey } from '../lib/storage';
import { HighwayTruckProgress } from './RewardEffects';
import type {
  AppRoute,
  LearnerProgressState,
  StudySessionLog,
  UserSettings,
} from '../types/truckmaster';

const POPUP_TASKS: Array<{
  key: StudySessionLog['activity'];
  titleEn: string;
  titleSi: string;
  suggestedMins: number;
  route: AppRoute;
}> = [
  { key: 'notes', titleEn: 'Study Textbook Lessons', titleSi: 'පෙළපොත් පාඩම් අධ්‍යයනය', suggestedMins: 60, route: 'study' },
  { key: 'vocabulary', titleEn: 'Trucking Vocabulary', titleSi: 'ට්‍රක් රථ වචන මාලාව', suggestedMins: 45, route: 'vocabulary' },
  { key: 'kanji', titleEn: 'Core Kanji Practice', titleSi: 'ප්‍රධාන කන්ජි පුහුණුව', suggestedMins: 15, route: 'kanji' },
  { key: 'flashcards', titleEn: 'Flashcard SRS Review', titleSi: 'ෆ්ලෑෂ් කාඩ් පුනරීක්ෂණය', suggestedMins: 45, route: 'flashcards' },
  { key: 'cbt', titleEn: 'CBT Mock Quiz Paper', titleSi: 'CBT ප්‍රශ්න පත්‍ර පුහුණුව', suggestedMins: 60, route: 'cbt' },
  { key: 'revision', titleEn: 'Weak-Area Revision', titleSi: 'දුර්වල කොටස් නැවත පුහුණුව', suggestedMins: 15, route: 'review' },
];

interface DailyTaskPopupProps {
  open: boolean;
  progress: LearnerProgressState;
  settings: UserSettings;
  onClose: () => void;
  onToggleMission: (missionKey: string) => void;
  onNavigate: (route: AppRoute) => void;
  onEnableNotifications: () => void;
}

export function DailyTaskPopup({
  open,
  progress,
  settings,
  onClose,
  onToggleMission,
  onNavigate,
  onEnableNotifications,
}: DailyTaskPopupProps) {
  const [notifHint, setNotifHint] = useState<string | null>(null);

  if (!open) return null;

  const today = getTodayKey();
  const { dailyStreak } = computeStreaks(progress.studySessions);
  const todayMinutes = progress.studySessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.minutes, 0);
  const targetMins = Math.max(15, settings.dailyTargetMinutes);
  const remainingMins = Math.max(0, targetMins - todayMinutes);
  const pct = Math.min(100, Math.round((todayMinutes / targetMins) * 100));
  const doneKeys = progress.dailyChecklist[today] || [];
  const targetHit = todayMinutes >= targetMins;

  const handleRequestBrowserNotifications = async () => {
    onEnableNotifications();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotifHint('Daily target notifications are active!');
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        setNotifHint(
          perm === 'granted'
            ? 'Browser reminders enabled until your daily target is hit!'
            : 'In-app reminders remain active until your daily target is achieved.',
        );
      } else {
        setNotifHint('In-app reminders are active until your daily target is achieved.');
      }
    } else {
      setNotifHint('In-app reminders are active until your daily target is achieved.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Today's Daily Dispatch Tasks"
      onClick={onClose}
    >
      <div
        className="tm-sheet-up sm:tm-modal-pop w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Express Cab Header */}
        <div className="bg-gradient-to-r from-[#0B4F8A] to-slate-900 text-white p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow">
                <Truck className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-sky-200 flex items-center gap-2">
                  <span>Daily Dispatch Sheet · {today}</span>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                    <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                    {dailyStreak}d
                  </span>
                </p>
                <h2 className="text-lg font-extrabold tracking-tight">
                  {targetHit ? 'Daily Target Achieved!' : "Today's TruckMaster Missions"}
                </h2>
                <p className="text-xs text-sky-100 font-sinhala">
                  {targetHit
                    ? 'අද දින අධ්‍යයන ඉලක්කය සම්පූර්ණයි! විශිෂ්ටයි!'
                    : `දෛනික ඉලක්කයට තව මිනිත්තු ${remainingMins}ක් ඉතිරිව ඇත`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close daily tasks popup"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <HighwayTruckProgress
            percent={pct}
            leftLabel={`${todayMinutes} / ${targetMins} min focused`}
            rightLabel={`${pct}%`}
          />
        </div>

        {/* Checklist Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400" aria-hidden="true" />
              <span>Daily Route Checklist ({doneKeys.length}/{POPUP_TASKS.length})</span>
            </span>
            {!targetHit && (
              <button
                type="button"
                onClick={handleRequestBrowserNotifications}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
              >
                <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{settings.notificationsEnabled ? 'Reminders On' : 'Enable Reminders'}</span>
              </button>
            )}
          </div>

          {notifHint && (
            <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl">
              {notifHint}
            </p>
          )}

          <div className="space-y-2">
            {POPUP_TASKS.map((task) => {
              const checked = doneKeys.includes(task.key);
              const loggedMins = progress.studySessions
                .filter((s) => s.date === today && s.activity === task.key)
                .reduce((sum, s) => sum + s.minutes, 0);

              return (
                <div
                  key={task.key}
                  className={`flex items-center justify-between gap-2 p-3 rounded-2xl border transition-colors ${
                    checked
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleMission(task.key)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 min-h-[40px]"
                  >
                    {checked ? (
                      <CheckSquare className="w-5 h-5 text-[#0D7A5F] dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold truncate ${
                          checked
                            ? 'line-through text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.titleEn}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sinhala truncate">
                        {task.titleSi} · {loggedMins}/{task.suggestedMins}m
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate(task.route);
                    }}
                    className="px-3 py-2 text-xs font-bold text-[#0B4F8A] dark:text-sky-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 min-h-[38px]"
                  >
                    Go
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate('missions');
            }}
            className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0B4F8A] hover:bg-[#083D6B] text-white text-sm font-bold transition-colors tm-card-press whitespace-nowrap"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>Start Study Timer</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Persistent in-app notification reminder toast shown periodically until daily target is hit.
 */
export function DailyTargetReminderToast({
  remainingMinutes,
  todayMinutes,
  targetMinutes,
  onOpenPopup,
  onOpenTimer,
  onDismiss,
}: {
  remainingMinutes: number;
  todayMinutes: number;
  targetMinutes: number;
  onOpenPopup: () => void;
  onOpenTimer: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="tm-modal-pop fixed bottom-20 lg:bottom-5 right-3 left-3 sm:left-auto sm:right-5 sm:w-[370px] z-40 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white border border-amber-400/50 shadow-2xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-amber-300">
              Daily Target Reminder · {todayMinutes}/{targetMinutes}m
            </p>
            <p className="text-xs text-slate-200 font-sinhala mt-0.5">
              අද ඉලක්කය සම්පූර්ණ කිරීමට තව මිනිත්තු {remainingMinutes}ක් අධ්‍යයනය කරන්න!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss reminder"
          className="p-1 rounded-lg text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenTimer}
          className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Start Timer</span>
        </button>
        <button
          type="button"
          onClick={onOpenPopup}
          className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold whitespace-nowrap"
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tasks</span>
        </button>
      </div>
    </div>
  );
}
