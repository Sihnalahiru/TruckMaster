import { computeStreaks, getTodayKey } from './storage';
import type { LearnerProgressState, UserSettings } from '../types/truckmaster';

export interface DriverRank {
  level: number;
  titleEn: string;
  titleJa: string;
  titleSi: string;
  vehicleClass: string;
  minXp: number;
  nextXp: number | null;
}

export const DRIVER_RANKS: DriverRank[] = [
  {
    level: 1,
    titleEn: 'Trainee Cadet',
    titleJa: '見習いドライバー',
    titleSi: 'පුහුණු රියදුරු',
    vehicleClass: 'Light Cargo 1.5t',
    minXp: 0,
    nextXp: 150,
  },
  {
    level: 2,
    titleEn: 'City Delivery Driver',
    titleJa: '2t 配送プロ',
    titleSi: '2t නගර ප්‍රවාහන රියදුරු',
    vehicleClass: '2-Ton Truck (小型)',
    minXp: 150,
    nextXp: 400,
  },
  {
    level: 3,
    titleEn: 'Regional Fleet Pro',
    titleJa: '4t 中型ドライバー',
    titleSi: '4t මධ්‍යම ට්‍රක් රියදුරු',
    vehicleClass: '4-Ton Truck (中型)',
    minXp: 400,
    nextXp: 900,
  },
  {
    level: 4,
    titleEn: 'Highway Captain',
    titleJa: '10t 大型キャプテン',
    titleSi: '10t අධිවේගී ට්‍රක් නියමු',
    vehicleClass: '10-Ton Heavy (大型)',
    minXp: 900,
    nextXp: 1700,
  },
  {
    level: 5,
    titleEn: 'SSW Master Driver',
    titleJa: '特定技能マスター運転者',
    titleSi: 'SSW ප්‍රවීණ ට්‍රක් රියදුරු',
    vehicleClass: 'Japan SSW Certified',
    minXp: 1700,
    nextXp: null,
  },
];

export function getDriverRank(xp: number): {
  rank: DriverRank;
  progressPct: number;
  xpIntoLevel: number;
  xpNeeded: number;
} {
  let current = DRIVER_RANKS[0];
  for (const r of DRIVER_RANKS) {
    if (xp >= r.minXp) current = r;
  }
  if (current.nextXp === null) {
    return { rank: current, progressPct: 100, xpIntoLevel: xp - current.minXp, xpNeeded: 0 };
  }
  const span = current.nextXp - current.minXp;
  const into = Math.max(0, xp - current.minXp);
  return {
    rank: current,
    progressPct: Math.min(100, Math.round((into / span) * 100)),
    xpIntoLevel: into,
    xpNeeded: Math.max(0, current.nextXp - xp),
  };
}

export interface TrophyDefinition {
  id: string;
  titleEn: string;
  titleSi: string;
  descEn: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  progressLabel: string;
}

export function evaluateTrophies(
  progress: LearnerProgressState,
  settings: UserSettings,
): TrophyDefinition[] {
  const today = getTodayKey();
  const { dailyStreak } = computeStreaks(progress.studySessions);
  const todayMinutes = progress.studySessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.minutes, 0);

  const sectionsDone = progress.completedSectionIds.length;
  const vocabDone = progress.masteredVocabIds.length;
  const kanjiDone = progress.masteredKanjiIds.length;
  const flashcardReviews = Object.values(progress.flashcards).reduce(
    (sum, c) => sum + c.correctCount + c.incorrectCount,
    0,
  );
  const attemptsCount = progress.examAttempts.length;
  const passedCount = progress.examAttempts.filter((a) => a.overallPassed).length;
  const kytDone = progress.completedSectionIds.some((id) => id.startsWith('kyt-') || id.startsWith('ch04-'));

  return [
    {
      id: 'first-mile',
      titleEn: 'First Mile Dispatch',
      titleSi: 'පළමු පාඩම් ජයග්‍රහණය',
      descEn: 'Complete your first textbook study section',
      tier: 'bronze',
      unlocked: sectionsDone >= 1,
      progressLabel: `${Math.min(sectionsDone, 1)}/1`,
    },
    {
      id: 'road-scholar',
      titleEn: 'Highway Scholar',
      titleSi: 'පාඩම් 10 සම්පූර්ණ කුසලානය',
      descEn: 'Complete 10 structured study sections',
      tier: 'silver',
      unlocked: sectionsDone >= 10,
      progressLabel: `${Math.min(sectionsDone, 10)}/10`,
    },
    {
      id: 'vocab-nav',
      titleEn: 'Vocab Navigator',
      titleSi: 'වචන 10 ප්‍රවීණතාව',
      descEn: 'Master 10 Japanese trucking terms',
      tier: 'bronze',
      unlocked: vocabDone >= 10,
      progressLabel: `${Math.min(vocabDone, 10)}/10`,
    },
    {
      id: 'kanji-cmd',
      titleEn: 'Kanji Commander',
      titleSi: 'කන්ජි 10 විශේෂඥ',
      descEn: 'Master 10 SSW road & cargo kanji',
      tier: 'silver',
      unlocked: kanjiDone >= 10,
      progressLabel: `${Math.min(kanjiDone, 10)}/10`,
    },
    {
      id: 'srs-sprinter',
      titleEn: 'Memory Sprinter',
      titleSi: 'ෆ්ලෑෂ් කාඩ් 20 පුහුණුව',
      descEn: 'Complete 20 SRS flashcard reviews',
      tier: 'bronze',
      unlocked: flashcardReviews >= 20,
      progressLabel: `${Math.min(flashcardReviews, 20)}/20`,
    },
    {
      id: 'kyt-spotter',
      titleEn: 'KYT Hazard Spotter',
      titleSi: 'KYT අනතුරු පුරෝකථන ශූරයා',
      descEn: 'Complete a Chapter 4 KYT hazard sheet',
      tier: 'silver',
      unlocked: kytDone,
      progressLabel: kytDone ? '1/1' : '0/1',
    },
    {
      id: 'first-cbt',
      titleEn: 'CBT Test Driver',
      titleSi: 'පළමු CBT ප්‍රශ්න පත්‍රය',
      descEn: 'Submit your first 50-question CBT paper',
      tier: 'silver',
      unlocked: attemptsCount >= 1,
      progressLabel: `${Math.min(attemptsCount, 1)}/1`,
    },
    {
      id: 'cbt-pass',
      titleEn: 'SSW Dual-Pass Trophy',
      titleSi: 'CBT 60%/60% සමත් රන් කුසලානය',
      descEn: 'Pass both Theory (18+/30) & Practical (12+/20)',
      tier: 'gold',
      unlocked: passedCount >= 1,
      progressLabel: `${Math.min(passedCount, 1)}/1`,
    },
    {
      id: 'streak-3',
      titleEn: '3-Day Convoy Streak',
      titleSi: 'දින 3 අඛණ්ඩ අධ්‍යයනය',
      descEn: 'Log focused study for 3 consecutive days',
      tier: 'gold',
      unlocked: dailyStreak >= 3,
      progressLabel: `${Math.min(dailyStreak, 3)}/3d`,
    },
    {
      id: 'daily-target',
      titleEn: 'Daily Target Champion',
      titleSi: 'දෛනික ඉලක්කය ජයගත් රියදුරු',
      descEn: `Hit today's ${settings.dailyTargetMinutes}-minute focus target`,
      tier: 'platinum',
      unlocked: todayMinutes >= settings.dailyTargetMinutes,
      progressLabel: `${Math.min(todayMinutes, settings.dailyTargetMinutes)}/${settings.dailyTargetMinutes}m`,
    },
  ];
}
