import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookA,
  BookOpen,
  ClipboardCheck,
  FileSearch,
  Home,
  Languages,
  Layers,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Target,
  Trophy,
  Truck,
  X,
} from 'lucide-react';
import { loadManifest } from './lib/contentLoader';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  getTodayKey,
  loadLearnerProgress,
  loadUserSettings,
  saveLearnerProgress,
  saveUserSettings,
} from './lib/storage';
import { playFeedbackTone } from './lib/sound';
import { evaluateTrophies, getDriverRank, type TrophyDefinition } from './lib/gamification';
import { OfflineBanner, PWAInstallButton } from './components/PWAControls';
import { TrophyUnlockModal, XpToastStack, type XpToastItem } from './components/RewardEffects';
import { DailyTargetReminderToast, DailyTaskPopup } from './components/DailyTaskPopup';
import { DashboardView } from './views/DashboardView';
import { StudyLibraryView } from './views/StudyLibraryView';
import { VocabKanjiView } from './views/VocabKanjiView';
import { FlashcardsView } from './views/FlashcardsView';
import { CbtExamCenterView } from './views/CbtExamCenterView';
import { ReviewCenterView } from './views/ReviewCenterView';
import { AnalyticsView } from './views/AnalyticsView';
import { DailyMissionsView } from './views/DailyMissionsView';
import { SettingsView } from './views/SettingsView';
import { AdminDashboardView, type ResetScope } from './views/AdminDashboardView';
import type {
  ActivityEvent,
  AppRoute,
  CbtAttemptRecord,
  ContentManifest,
  FlashcardReviewState,
  InProgressExamState,
  LanguageDisplayPrefs,
  LearnerProgressState,
  StudySessionLog,
  UserSettings,
} from './types/truckmaster';

interface NavItem {
  id: AppRoute;
  label: string;
  shortLabel: string;
  group: 'learn' | 'exam' | 'system';
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Driver Cab', shortLabel: 'Cab', group: 'learn', icon: Home },
  { id: 'study', label: 'Study Library', shortLabel: 'Study', group: 'learn', icon: BookOpen },
  { id: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', group: 'learn', icon: Languages },
  { id: 'kanji', label: 'Kanji Drills', shortLabel: 'Kanji', group: 'learn', icon: BookA },
  { id: 'flashcards', label: 'Flashcards (SRS)', shortLabel: 'Cards', group: 'learn', icon: Layers },
  { id: 'cbt', label: 'CBT & Quiz', shortLabel: 'Quiz', group: 'exam', icon: ClipboardCheck },
  { id: 'review', label: 'Review Centre', shortLabel: 'Review', group: 'exam', icon: FileSearch },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', group: 'exam', icon: BarChart3 },
  { id: 'missions', label: 'Daily Missions', shortLabel: 'Missions', group: 'exam', icon: Target },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', group: 'system', icon: Settings },
  { id: 'admin', label: 'Admin & QA', shortLabel: 'Admin', group: 'system', icon: ShieldCheck },
];

const MOBILE_PRIMARY_ROUTES: AppRoute[] = ['dashboard', 'study', 'flashcards', 'cbt'];
const MOBILE_MORE_ROUTES: AppRoute[] = [
  'vocabulary',
  'kanji',
  'review',
  'analytics',
  'missions',
  'settings',
  'admin',
];

function addDaysIso(days: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function makeActivity(type: ActivityEvent['type'], label: string, xp: number): ActivityEvent {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    xp,
    timestamp: new Date().toISOString(),
  };
}

export function App() {
  const [manifest, setManifest] = useState<ContentManifest | null>(null);
  const [progress, setProgress] = useState<LearnerProgressState>(DEFAULT_PROGRESS);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [studyTarget, setStudyTarget] = useState<{ chapterId?: string; sectionId?: string }>({});
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const [examActive, setExamActive] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  // Daily Task Login Popup + Periodic Target Reminder Toast
  const [dailyPopupOpen, setDailyPopupOpen] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);

  // Gamification Effects: Floating XP Toasts & Trophy Celebration Modal
  const [xpToasts, setXpToasts] = useState<XpToastItem[]>([]);
  const [celebratingTrophy, setCelebratingTrophy] = useState<TrophyDefinition | null>(null);
  const unlockedTrophyIdsRef = useRef<Set<string> | null>(null);

  const triggerXpToast = useCallback((xp: number, label: string) => {
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setXpToasts((prev) => [...prev.slice(-2), { id, xp, label }]);
    window.setTimeout(() => {
      setXpToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2700);
  }, []);

  const bootstrap = useCallback(async () => {
    setBootLoading(true);
    setBootError(null);
    try {
      const [m, p, s] = await Promise.all([
        loadManifest(),
        loadLearnerProgress(),
        loadUserSettings(),
      ]);
      setManifest(m);
      setProgress(p);
      setSettings(s);

      // Snapshot already-unlocked trophies so we only celebrate newly earned ones
      const initialUnlocked = new Set(
        evaluateTrophies(p, s)
          .filter((t) => t.unlocked)
          .map((t) => t.id),
      );
      unlockedTrophyIdsRef.current = initialUnlocked;

      // Open Daily Task popup automatically on every login/app launch
      setDailyPopupOpen(true);
    } catch (err) {
      setBootError(err instanceof Error ? err.message : 'Unable to load TruckMaster study data.');
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Watch for newly unlocked trophies and trigger confetti celebration + fanfare
  useEffect(() => {
    if (bootLoading || !unlockedTrophyIdsRef.current) return;
    const current = evaluateTrophies(progress, settings);
    for (const trophy of current) {
      if (trophy.unlocked && !unlockedTrophyIdsRef.current.has(trophy.id)) {
        unlockedTrophyIdsRef.current.add(trophy.id);
        setCelebratingTrophy(trophy);
        playFeedbackTone('trophy', settings.soundEnabled);
        break;
      }
    }
  }, [progress, settings, bootLoading]);

  // Sync theme, font scale, and reduced-motion preferences onto <html>
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' || (settings.theme === 'system' && mql.matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    mql.addEventListener('change', applyTheme);
    root.style.setProperty('--tm-font-scale', String(settings.fontScale || 1));
    root.classList.toggle('tm-reduced-motion', settings.reducedMotion || !settings.animationsEnabled);

    return () => {
      mql.removeEventListener('change', applyTheme);
    };
  }, [settings.theme, settings.fontScale, settings.reducedMotion, settings.animationsEnabled]);

  const todayMinutes = useMemo(() => {
    const today = getTodayKey();
    return progress.studySessions
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + s.minutes, 0);
  }, [progress.studySessions]);

  const targetMinutes = Math.max(15, settings.dailyTargetMinutes);
  const remainingTargetMinutes = Math.max(0, targetMinutes - todayMinutes);
  const dailyTargetAchieved = remainingTargetMinutes === 0;

  // Periodic Daily Target Reminders (In-App Toast + Browser Notification) until daily target is achieved
  useEffect(() => {
    if (bootLoading || dailyTargetAchieved || !settings.notificationsEnabled || examActive) {
      setReminderVisible(false);
      return;
    }

    const fireReminder = () => {
      if (dailyPopupOpen || examActive) return;
      setReminderVisible(true);
      playFeedbackTone('notify', settings.soundEnabled);
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification('TruckMaster Daily Target Reminder', {
            body: `${remainingTargetMinutes} minutes remaining to hit today's ${targetMinutes}m SSW study goal!`,
            icon: '/pwa-192x192.png',
          });
        } catch {
          // Safe fallback if notification constructor is blocked in iframe
        }
      }
    };

    // First reminder 60s after launch/dismissal, then repeat every 5 minutes until target is hit
    const initialTimer = window.setTimeout(fireReminder, 60_000);
    const repeatTimer = window.setInterval(fireReminder, 5 * 60_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(repeatTimer);
    };
  }, [
    bootLoading,
    dailyTargetAchieved,
    dailyPopupOpen,
    examActive,
    remainingTargetMinutes,
    settings.notificationsEnabled,
    settings.soundEnabled,
    targetMinutes,
  ]);

  const updateProgress = useCallback(
    (updater: (prev: LearnerProgressState) => LearnerProgressState) => {
      setProgress((prev) => {
        const next = updater(prev);
        void saveLearnerProgress(next);
        return next;
      });
    },
    [],
  );

  const updateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
    void saveUserSettings(next);
  }, []);

  const handleNavigate = useCallback(
    (nextRoute: AppRoute) => {
      if (examActive) return;
      playFeedbackTone('nav', settings.soundEnabled);
      setRoute(nextRoute);
      setMoreDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [examActive, settings.soundEnabled],
  );

  const handleOpenSection = useCallback(
    (chapterId: string, sectionId: string) => {
      if (examActive) return;
      playFeedbackTone('nav', settings.soundEnabled);
      setStudyTarget({ chapterId, sectionId });
      setRoute('study');
      setMoreDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [examActive, settings.soundEnabled],
  );

  const handleOpenReview = useCallback((attemptId: string) => {
    setExamActive(false);
    setReviewAttemptId(attemptId);
    setRoute('review');
    setMoreDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleUpdateLanguagePrefs = useCallback(
    (languagePrefs: LanguageDisplayPrefs) => {
      updateSettings({ ...settings, languagePrefs });
    },
    [settings, updateSettings],
  );

  const handleToggleSectionComplete = useCallback(
    (sectionId: string, label: string) => {
      let newlyCompleted = false;
      updateProgress((prev) => {
        const exists = prev.completedSectionIds.includes(sectionId);
        newlyCompleted = !exists;
        const completedSectionIds = exists
          ? prev.completedSectionIds.filter((id) => id !== sectionId)
          : [...prev.completedSectionIds, sectionId];
        return {
          ...prev,
          completedSectionIds,
          xp: exists ? prev.xp : prev.xp + 25,
          recentActivities: exists
            ? prev.recentActivities
            : [makeActivity('section', `Completed ${label}`, 25), ...prev.recentActivities].slice(
                0,
                40,
              ),
        };
      });
      if (newlyCompleted) {
        triggerXpToast(25, `Completed ${label}`);
        playFeedbackTone('xp', settings.soundEnabled);
      } else {
        playFeedbackTone('tap', settings.soundEnabled);
      }
    },
    [settings.soundEnabled, triggerXpToast, updateProgress],
  );

  const handleToggleSectionBookmark = useCallback(
    (sectionId: string) => {
      updateProgress((prev) => {
        const exists = prev.bookmarkedSectionIds.includes(sectionId);
        return {
          ...prev,
          bookmarkedSectionIds: exists
            ? prev.bookmarkedSectionIds.filter((id) => id !== sectionId)
            : [...prev.bookmarkedSectionIds, sectionId],
        };
      });
      playFeedbackTone('tap', settings.soundEnabled);
    },
    [settings.soundEnabled, updateProgress],
  );

  const handleTrackLastVisited = useCallback(
    (chapterId: string, sectionId: string) => {
      updateProgress((prev) => {
        if (
          prev.lastVisitedSection?.chapterId === chapterId &&
          prev.lastVisitedSection?.sectionId === sectionId
        ) {
          return prev;
        }
        return {
          ...prev,
          lastVisitedSection: { chapterId, sectionId },
        };
      });
    },
    [updateProgress],
  );

  const handleToggleMastered = useCallback(
    (kind: 'vocab' | 'kanji', id: string, label: string) => {
      let added = false;
      updateProgress((prev) => {
        if (kind === 'vocab') {
          const exists = prev.masteredVocabIds.includes(id);
          added = !exists;
          return {
            ...prev,
            masteredVocabIds: exists
              ? prev.masteredVocabIds.filter((x) => x !== id)
              : [...prev.masteredVocabIds, id],
            difficultVocabIds: exists
              ? prev.difficultVocabIds
              : prev.difficultVocabIds.filter((x) => x !== id),
            xp: exists ? prev.xp : prev.xp + 10,
            recentActivities: exists
              ? prev.recentActivities
              : [makeActivity('vocab', `Mastered vocab: ${label}`, 10), ...prev.recentActivities].slice(
                  0,
                  40,
                ),
          };
        }
        const exists = prev.masteredKanjiIds.includes(id);
        added = !exists;
        return {
          ...prev,
          masteredKanjiIds: exists
            ? prev.masteredKanjiIds.filter((x) => x !== id)
            : [...prev.masteredKanjiIds, id],
          difficultKanjiIds: exists
            ? prev.difficultKanjiIds
            : prev.difficultKanjiIds.filter((x) => x !== id),
          xp: exists ? prev.xp : prev.xp + 10,
          recentActivities: exists
            ? prev.recentActivities
            : [makeActivity('kanji', `Mastered kanji: ${label}`, 10), ...prev.recentActivities].slice(
                0,
                40,
              ),
        };
      });
      if (added) {
        triggerXpToast(10, `Mastered ${label}`);
        playFeedbackTone('xp', settings.soundEnabled);
      } else {
        playFeedbackTone('tap', settings.soundEnabled);
      }
    },
    [settings.soundEnabled, triggerXpToast, updateProgress],
  );

  const handleToggleDifficult = useCallback(
    (kind: 'vocab' | 'kanji', id: string) => {
      updateProgress((prev) => {
        if (kind === 'vocab') {
          const exists = prev.difficultVocabIds.includes(id);
          return {
            ...prev,
            difficultVocabIds: exists
              ? prev.difficultVocabIds.filter((x) => x !== id)
              : [...prev.difficultVocabIds, id],
          };
        }
        const exists = prev.difficultKanjiIds.includes(id);
        return {
          ...prev,
          difficultKanjiIds: exists
            ? prev.difficultKanjiIds.filter((x) => x !== id)
            : [...prev.difficultKanjiIds, id],
        };
      });
      playFeedbackTone('tap', settings.soundEnabled);
    },
    [settings.soundEnabled, updateProgress],
  );

  const handleRateCard = useCallback(
    (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy', label: string) => {
      updateProgress((prev) => {
        const cur: FlashcardReviewState = prev.flashcards[cardId] || {
          cardId,
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          dueDate: getTodayKey(),
          lastRating: 'good',
          correctCount: 0,
          incorrectCount: 0,
        };

        let ef = cur.easeFactor;
        let reps = cur.repetitions;
        let interval = cur.intervalDays;
        let correctCount = cur.correctCount;
        let incorrectCount = cur.incorrectCount;

        if (rating === 'again') {
          reps = 0;
          interval = 1;
          ef = Math.max(1.3, Number((ef - 0.2).toFixed(2)));
          incorrectCount += 1;
        } else if (rating === 'hard') {
          reps = Math.max(1, reps);
          interval = Math.max(1, Math.round((interval || 1) * 1.2));
          ef = Math.max(1.3, Number((ef - 0.15).toFixed(2)));
          correctCount += 1;
        } else if (rating === 'good') {
          reps += 1;
          if (reps === 1) interval = 1;
          else if (reps === 2) interval = 6;
          else interval = Math.max(1, Math.round(interval * ef));
          correctCount += 1;
        } else {
          reps += 1;
          interval = reps <= 1 ? 4 : Math.max(2, Math.round(interval * ef * 1.3));
          ef = Math.min(3.0, Number((ef + 0.15).toFixed(2)));
          correctCount += 1;
        }

        const nextCard: FlashcardReviewState = {
          cardId,
          easeFactor: ef,
          intervalDays: interval,
          repetitions: reps,
          dueDate: addDaysIso(interval),
          lastRating: rating,
          correctCount,
          incorrectCount,
        };

        return {
          ...prev,
          xp: prev.xp + 5,
          flashcards: {
            ...prev.flashcards,
            [cardId]: nextCard,
          },
          recentActivities: [
            makeActivity('flashcard', `Reviewed ${label} (${rating})`, 5),
            ...prev.recentActivities,
          ].slice(0, 40),
        };
      });
      triggerXpToast(5, `Flashcard: ${label}`);
      playFeedbackTone(rating === 'again' ? 'wrong' : 'xp', settings.soundEnabled);
    },
    [settings.soundEnabled, triggerXpToast, updateProgress],
  );

  const handleSaveInProgress = useCallback(
    (state: InProgressExamState | null) => {
      updateProgress((prev) => ({
        ...prev,
        inProgressExam: state,
      }));
    },
    [updateProgress],
  );

  const handleSubmitAttempt = useCallback(
    (attempt: CbtAttemptRecord) => {
      const minutesSpent = Math.max(1, Math.round(attempt.durationSecondsTaken / 60));
      const xpEarned = attempt.overallPassed ? 120 : 50;
      const sessionLog: StudySessionLog = {
        id: `cbt-sess-${Date.now()}`,
        date: getTodayKey(),
        activity: 'cbt',
        minutes: minutesSpent,
        xpEarned,
        timestamp: new Date().toISOString(),
      };

      updateProgress((prev) => ({
        ...prev,
        xp: prev.xp + xpEarned,
        inProgressExam: null,
        examAttempts: [attempt, ...prev.examAttempts],
        studySessions: [sessionLog, ...prev.studySessions],
        recentActivities: [
          makeActivity(
            'cbt',
            `${attempt.paperTitle}: ${attempt.totalCorrect}/${attempt.totalQuestions} (${attempt.overallPassed ? 'PASS' : 'REVIEW'})`,
            xpEarned,
          ),
          ...prev.recentActivities,
        ].slice(0, 40),
      }));

      triggerXpToast(
        xpEarned,
        attempt.overallPassed ? `${attempt.paperTitle} PASSED!` : `${attempt.paperTitle} Submitted`,
      );
      playFeedbackTone(attempt.overallPassed ? 'celebrate' : 'success', settings.soundEnabled);
    },
    [settings.soundEnabled, triggerXpToast, updateProgress],
  );

  const handleToggleQuestionBookmark = useCallback(
    (questionId: string) => {
      updateProgress((prev) => {
        const exists = prev.bookmarkedQuestionIds.includes(questionId);
        return {
          ...prev,
          bookmarkedQuestionIds: exists
            ? prev.bookmarkedQuestionIds.filter((id) => id !== questionId)
            : [...prev.bookmarkedQuestionIds, questionId],
        };
      });
      playFeedbackTone('tap', settings.soundEnabled);
    },
    [settings.soundEnabled, updateProgress],
  );

  const handleLogStudySession = useCallback(
    (activity: StudySessionLog['activity'], minutes: number) => {
      const cleanMins = Math.max(1, Math.round(minutes));
      const xpEarned = cleanMins * 2;
      const entry: StudySessionLog = {
        id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: getTodayKey(),
        activity,
        minutes: cleanMins,
        xpEarned,
        timestamp: new Date().toISOString(),
      };
      updateProgress((prev) => ({
        ...prev,
        xp: prev.xp + xpEarned,
        studySessions: [entry, ...prev.studySessions],
        recentActivities: [
          makeActivity('timer', `Logged ${cleanMins}m focused ${activity}`, xpEarned),
          ...prev.recentActivities,
        ].slice(0, 40),
      }));
      triggerXpToast(xpEarned, `${cleanMins}m focused study logged`);
      playFeedbackTone('xp', settings.soundEnabled);
    },
    [settings.soundEnabled, triggerXpToast, updateProgress],
  );

  const handleToggleChecklistMission = useCallback(
    (missionKey: string) => {
      const today = getTodayKey();
      let checked = false;
      updateProgress((prev) => {
        const list = prev.dailyChecklist[today] || [];
        const exists = list.includes(missionKey);
        checked = !exists;
        return {
          ...prev,
          xp: exists ? prev.xp : prev.xp + 15,
          dailyChecklist: {
            ...prev.dailyChecklist,
            [today]: exists ? list.filter((k) => k !== missionKey) : [...list, missionKey],
          },
        };
      });
      if (checked) {
        triggerXpToast(15, 'Daily Mission Completed');
        playFeedbackTone('xp', settings.soundEnabled);
      } else {
        playFeedbackTone('tap', settings.soundEnabled);
      }
    },
    [settings.soundEnabled, triggerXpToast, updateProgress],
  );

  const handleRestoreBackup = useCallback(
    (payload: { settings?: UserSettings; progress?: LearnerProgressState }) => {
      if (payload.settings) {
        updateSettings({
          ...DEFAULT_SETTINGS,
          ...payload.settings,
          languagePrefs: {
            ...DEFAULT_SETTINGS.languagePrefs,
            ...(payload.settings.languagePrefs || {}),
          },
        });
      }
      if (payload.progress) {
        const mergedProgress: LearnerProgressState = {
          ...DEFAULT_PROGRESS,
          ...payload.progress,
        };
        setProgress(mergedProgress);
        void saveLearnerProgress(mergedProgress);
      }
      playFeedbackTone('celebrate', settings.soundEnabled);
    },
    [settings.soundEnabled, updateSettings],
  );

  const handleExecuteReset = useCallback(
    (scope: ResetScope) => {
      if (scope === 'settings') {
        updateSettings({ ...DEFAULT_SETTINGS });
        return;
      }
      if (scope === 'full') {
        updateSettings({ ...DEFAULT_SETTINGS });
        const fresh = { ...DEFAULT_PROGRESS };
        setProgress(fresh);
        void saveLearnerProgress(fresh);
        unlockedTrophyIdsRef.current = new Set();
        return;
      }
      updateProgress((prev) => {
        if (scope === 'study') {
          return {
            ...prev,
            completedSectionIds: [],
            bookmarkedSectionIds: [],
            sectionNotes: {},
            lastVisitedSection: null,
          };
        }
        if (scope === 'flashcards') {
          return {
            ...prev,
            flashcards: {},
            masteredVocabIds: [],
            difficultVocabIds: [],
            masteredKanjiIds: [],
            difficultKanjiIds: [],
          };
        }
        return {
          ...prev,
          examAttempts: [],
          inProgressExam: null,
          bookmarkedQuestionIds: [],
        };
      });
    },
    [updateProgress, updateSettings],
  );

  const toggleQuickTheme = useCallback(() => {
    playFeedbackTone('tap', settings.soundEnabled);
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    updateSettings({ ...settings, theme: isCurrentlyDark ? 'light' : 'dark' });
  }, [settings, updateSettings]);

  const currentNav = useMemo(
    () => NAV_ITEMS.find((item) => item.id === route) || NAV_ITEMS[0],
    [route],
  );

  const { rank, progressPct: rankPct } = useMemo(() => getDriverRank(progress.xp), [progress.xp]);
  const unlockedTrophyCount = useMemo(
    () => evaluateTrophies(progress, settings).filter((t) => t.unlocked).length,
    [progress, settings],
  );

  const isMoreRouteActive = MOBILE_MORE_ROUTES.includes(route);

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#0B4F8A] text-amber-300 flex items-center justify-center mb-4 shadow-lg">
          <Truck className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">TruckMaster</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Preparing Japan SSW Truck Driver cab &amp; trilingual syllabus...
        </p>
      </div>
    );
  }

  if (bootError || !manifest) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Unable to Load Study Manifest
          </h1>
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {bootError || 'Study content manifest is unavailable.'}
          </p>
          <button
            type="button"
            onClick={bootstrap}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-[#0B4F8A] text-white text-sm font-semibold hover:bg-[#083D6B] whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Retry Loading</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Fixed Truck-Cab Sidebar (Hidden during active Exam) */}
      {!examActive && (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
          <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B4F8A] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  TruckMaster
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  Japan SSW Driver App
                </p>
              </div>
            </div>

            {/* Compact Driver Rank & EXP Card */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1 truncate">
                  <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                  Lv.{rank.level} {rank.titleEn}
                </span>
                <span className="font-mono font-bold text-[#0B4F8A] dark:text-sky-400 tabular-nums shrink-0">
                  {progress.xp} XP
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(rankPct, 5)}%` }}
                />
              </div>
            </div>
          </div>

          <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {(
              [
                { key: 'learn', title: 'Training Modules' },
                { key: 'exam', title: 'CBT & Missions' },
                { key: 'system', title: 'Cab Settings' },
              ] as const
            ).map((section) => (
              <div key={section.key}>
                <p className="px-3 mb-1.5 text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {NAV_ITEMS.filter((item) => item.group === section.key).map((item) => {
                    const Icon = item.icon;
                    const active = route === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        className={`tm-card-press w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-[#0B4F8A] text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                        {item.id === 'cbt' && progress.inProgressExam && (
                          <span
                            className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              active
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            Paused
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <PWAInstallButton />
            <button
              type="button"
              onClick={toggleQuickTheme}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Sun className="w-3.5 h-3.5 hidden dark:block" aria-hidden="true" />
              <Moon className="w-3.5 h-3.5 block dark:hidden" aria-hidden="true" />
              <span>Toggle Theme</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Shell */}
      <div className={`flex-1 flex flex-col min-w-0 ${!examActive ? 'lg:pl-64' : ''}`}>
        {/* Mobile Compact Top Bar (48px height, hidden in CBT exam) */}
        {!examActive && (
          <header className="lg:hidden sticky top-0 z-20 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0B4F8A] text-amber-300 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {currentNav.label}
              </span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playFeedbackTone('tap', settings.soundEnabled);
                  setDailyPopupOpen(true);
                }}
                aria-label="Open Daily Tasks"
                className="h-9 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="font-mono tabular-nums">{todayMinutes}m</span>
              </button>
              <button
                type="button"
                onClick={toggleQuickTheme}
                aria-label="Toggle color theme"
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <Sun className="w-4 h-4 hidden dark:block" aria-hidden="true" />
                <Moon className="w-4 h-4 block dark:hidden" aria-hidden="true" />
              </button>
            </div>
          </header>
        )}

        {/* Desktop Contextual Top Bar (hidden in CBT exam) */}
        {!examActive && (
          <header className="hidden lg:flex sticky top-0 z-20 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => handleNavigate('dashboard')}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium whitespace-nowrap"
              >
                TruckMaster
              </button>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentNav.label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold tabular-nums shrink-0">
              <button
                type="button"
                onClick={() => {
                  playFeedbackTone('tap', settings.soundEnabled);
                  setDailyPopupOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors whitespace-nowrap"
              >
                <Target className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Daily: {todayMinutes}/{targetMinutes}m
                </span>
              </button>

              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-mono">
                <Trophy className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                {unlockedTrophyCount}/10
              </span>

              <span className="text-[#0B4F8A] dark:text-sky-300 font-mono font-bold">
                {progress.xp} XP
              </span>

              {progress.inProgressExam && route !== 'cbt' && (
                <button
                  type="button"
                  onClick={() => handleNavigate('cbt')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  Resume Quiz
                </button>
              )}
            </div>
          </header>
        )}

        {/* Active View Canvas with Smooth Route Enter Transition */}
        <main
          key={route}
          className={`tm-view-enter flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 ${
            examActive ? 'py-4' : 'py-5 pb-24 lg:pb-10'
          }`}
        >
          {route === 'dashboard' && (
            <DashboardView
              manifest={manifest}
              progress={progress}
              settings={settings}
              onNavigate={handleNavigate}
              onOpenSection={handleOpenSection}
              onOpenDailyPopup={() => {
                playFeedbackTone('tap', settings.soundEnabled);
                setDailyPopupOpen(true);
              }}
            />
          )}

          {route === 'study' && (
            <StudyLibraryView
              manifest={manifest}
              progress={progress}
              languagePrefs={settings.languagePrefs}
              soundEnabled={settings.soundEnabled}
              initialChapterId={studyTarget.chapterId}
              initialSectionId={studyTarget.sectionId}
              onUpdateLanguagePrefs={handleUpdateLanguagePrefs}
              onToggleSectionComplete={handleToggleSectionComplete}
              onToggleSectionBookmark={handleToggleSectionBookmark}
              onTrackLastVisited={handleTrackLastVisited}
              onGoToCbt={() => handleNavigate('cbt')}
            />
          )}

          {(route === 'vocabulary' || route === 'kanji') && (
            <VocabKanjiView
              mode={route}
              progress={progress}
              settings={settings}
              onToggleMastered={handleToggleMastered}
              onToggleDifficult={handleToggleDifficult}
              onOpenFlashcards={() => handleNavigate('flashcards')}
            />
          )}

          {route === 'flashcards' && (
            <FlashcardsView
              progress={progress}
              settings={settings}
              onRateCard={handleRateCard}
            />
          )}

          {route === 'cbt' && (
            <CbtExamCenterView
              manifest={manifest}
              progress={progress}
              settings={settings}
              onSaveInProgress={handleSaveInProgress}
              onSubmitAttempt={handleSubmitAttempt}
              onOpenReview={handleOpenReview}
              onExamActiveChange={setExamActive}
            />
          )}

          {route === 'review' && (
            <ReviewCenterView
              progress={progress}
              initialAttemptId={reviewAttemptId}
              onToggleQuestionBookmark={handleToggleQuestionBookmark}
              onOpenStudySection={handleOpenSection}
              onGoToCbt={() => handleNavigate('cbt')}
            />
          )}

          {route === 'analytics' && (
            <AnalyticsView
              manifest={manifest}
              progress={progress}
              onOpenSection={handleOpenSection}
            />
          )}

          {route === 'missions' && (
            <DailyMissionsView
              progress={progress}
              settings={settings}
              onLogStudySession={handleLogStudySession}
              onToggleChecklistMission={handleToggleChecklistMission}
            />
          )}

          {route === 'settings' && (
            <SettingsView
              settings={settings}
              progress={progress}
              onUpdateSettings={updateSettings}
              onRestoreBackup={handleRestoreBackup}
            />
          )}

          {route === 'admin' && <AdminDashboardView onExecuteReset={handleExecuteReset} />}
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation (60px height, hidden during CBT exam) */}
      {!examActive && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe"
        >
          <div className="grid grid-cols-5 h-[60px]">
            {MOBILE_PRIMARY_ROUTES.map((id) => {
              const item = NAV_ITEMS.find((n) => n.id === id)!;
              const Icon = item.icon;
              const active = route === id && !moreDrawerOpen;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigate(id)}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
                    active
                      ? 'text-[#0B4F8A] dark:text-sky-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="truncate">{item.shortLabel}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                playFeedbackTone('tap', settings.soundEnabled);
                setMoreDrawerOpen((open) => !open);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
                moreDrawerOpen || isMoreRouteActive
                  ? 'text-[#0B4F8A] dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
              <span>More</span>
            </button>
          </div>
        </nav>
      )}

      {/* Mobile "More" Bottom Sheet Drawer */}
      {!examActive && moreDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="More TruckMaster tools"
          onClick={() => setMoreDrawerOpen(false)}
        >
          <div
            className="tm-sheet-up w-full rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-8 space-y-4 max-h-[82vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  TruckMaster Cab Menu
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Lv.{rank.level} {rank.titleEn} · {progress.xp} XP · {unlockedTrophyCount}/10 Trophies
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreDrawerOpen(false)}
                aria-label="Close navigation drawer"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE_ROUTES.map((id) => {
                const item = NAV_ITEMS.find((n) => n.id === id)!;
                const Icon = item.icon;
                const active = route === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleNavigate(id)}
                    className={`tm-card-press min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[#0B4F8A] border-[#0B4F8A] text-white'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <PWAInstallButton />
            </div>
          </div>
        </div>
      )}

      {/* Daily Task Login Popup Menu */}
      <DailyTaskPopup
        open={dailyPopupOpen && !examActive}
        progress={progress}
        settings={settings}
        onClose={() => setDailyPopupOpen(false)}
        onToggleMission={handleToggleChecklistMission}
        onNavigate={handleNavigate}
        onEnableNotifications={() => {
          if (!settings.notificationsEnabled) {
            updateSettings({ ...settings, notificationsEnabled: true });
          }
        }}
      />

      {/* Recurring Daily Target Reminder Toast until target is achieved */}
      {reminderVisible && !dailyPopupOpen && !examActive && !dailyTargetAchieved && (
        <DailyTargetReminderToast
          remainingMinutes={remainingTargetMinutes}
          todayMinutes={todayMinutes}
          targetMinutes={targetMinutes}
          onOpenPopup={() => {
            setReminderVisible(false);
            setDailyPopupOpen(true);
          }}
          onOpenTimer={() => {
            setReminderVisible(false);
            handleNavigate('missions');
          }}
          onDismiss={() => setReminderVisible(false)}
        />
      )}

      {/* Floating EXP Toasts & Trophy Unlock Celebration Modal */}
      <XpToastStack toasts={xpToasts} />
      <TrophyUnlockModal
        trophy={celebratingTrophy}
        onClose={() => setCelebratingTrophy(null)}
      />

      <OfflineBanner />
    </div>
  );
}

export default App;
