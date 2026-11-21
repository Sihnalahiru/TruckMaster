import type { LearnerProgressState, UserSettings } from '../types/truckmaster';

const DB_NAME = 'TruckMasterDB';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const PROGRESS_KEY = 'learner_progress_v1';
const SETTINGS_KEY = 'user_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  learnerName: 'SSW Candidate',
  theme: 'light',
  soundEnabled: true,
  animationsEnabled: true,
  reducedMotion: false,
  fontScale: 1,
  dailyTargetMinutes: 240,
  dailyVocabTarget: 15,
  dailyKanjiTarget: 8,
  dailyFlashcardTarget: 25,
  autoNextInCbt: true,
  languagePrefs: {
    showJapanese: true,
    showFurigana: true,
    showRomaji: true,
    showEnglish: true,
    showSinhala: true,
  },
  notificationsEnabled: true,
};

export const DEFAULT_PROGRESS: LearnerProgressState = {
  schemaVersion: 1,
  xp: 0,
  completedSectionIds: [],
  bookmarkedSectionIds: [],
  sectionNotes: {},
  lastVisitedSection: null,
  masteredVocabIds: [],
  difficultVocabIds: [],
  masteredKanjiIds: [],
  difficultKanjiIds: [],
  bookmarkedQuestionIds: [],
  flashcards: {},
  examAttempts: [],
  inProgressExam: null,
  studySessions: [],
  dailyChecklist: {},
  recentActivities: [],
};

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadLearnerProgress(): Promise<LearnerProgressState> {
  const fromIdb = await idbGet<LearnerProgressState>(PROGRESS_KEY);
  if (fromIdb && typeof fromIdb === 'object') {
    return { ...DEFAULT_PROGRESS, ...fromIdb };
  }
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore corrupted localStorage
  }
  return { ...DEFAULT_PROGRESS };
}

export async function saveLearnerProgress(state: LearnerProgressState): Promise<void> {
  await idbSet(PROGRESS_KEY, state);
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // quota safe fallback (IndexedDB already saved)
  }
}

export async function loadUserSettings(): Promise<UserSettings> {
  const fromIdb = await idbGet<UserSettings>(SETTINGS_KEY);
  if (fromIdb && typeof fromIdb === 'object') {
    return {
      ...DEFAULT_SETTINGS,
      ...fromIdb,
      languagePrefs: { ...DEFAULT_SETTINGS.languagePrefs, ...(fromIdb.languagePrefs || {}) },
    };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        languagePrefs: { ...DEFAULT_SETTINGS.languagePrefs, ...(parsed.languagePrefs || {}) },
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await idbSet(SETTINGS_KEY, settings);
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeStreaks(sessions: LearnerProgressState['studySessions']): {
  dailyStreak: number;
  weeklyStreak: number;
} {
  if (!sessions.length) return { dailyStreak: 0, weeklyStreak: 0 };
  const dateSet = new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.date));
  let dailyStreak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (dateSet.has(key)) {
      dailyStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // Allow today not yet completed if yesterday was studied
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Count consecutive weeks with >= 1 session
  const weekSet = new Set(
    [...dateSet].map((iso) => {
      const dt = new Date(`${iso}T00:00:00`);
      const start = new Date(dt.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((dt.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
      return `${dt.getFullYear()}-W${weekNum}`;
    }),
  );

  return { dailyStreak, weeklyStreak: Math.min(weekSet.size, Math.ceil(dailyStreak / 7) || (weekSet.size > 0 ? 1 : 0)) };
}
