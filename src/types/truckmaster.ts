export type AppRoute =
  | 'dashboard'
  | 'study'
  | 'kyt'
  | 'simulator'
  | 'audio'
  | 'vocabulary'
  | 'kanji'
  | 'flashcards'
  | 'cbt'
  | 'review'
  | 'analytics'
  | 'missions'
  | 'profile'
  | 'settings'
  | 'admin';

export type ThemeMode = 'light' | 'dark' | 'system';

export type DriverAvatarId =
  | 'heavy-10t'
  | 'city-4t'
  | 'kyt-inspector'
  | 'cold-chain'
  | 'night-express'
  | 'cargo-master';

export interface LanguageDisplayPrefs {
  showJapanese: boolean;
  showFurigana: boolean;
  showRomaji: boolean;
  showEnglish: boolean;
  showSinhala: boolean;
}

export interface UserSettings {
  learnerName: string;
  avatarId: DriverAvatarId;
  theme: ThemeMode;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  fontScale: number; // 0.9 | 1 | 1.1 | 1.2
  dailyTargetMinutes: number; // default 240
  dailyVocabTarget: number; // default 15
  dailyKanjiTarget: number; // default 8
  dailyFlashcardTarget: number; // default 25
  autoNextInCbt: boolean;
  languagePrefs: LanguageDisplayPrefs;
  notificationsEnabled: boolean;
  preferredJapaneseVoiceURI: string;
  ttsRate: number; // 0.72 | 1.0
  studyDaysOfWeek: number[]; // 0=Sun..6=Sat
  reminderTime: string; // HH:MM
}

export interface ManifestSectionSummary {
  sectionId: string;
  code: string;
  titleEn: string;
  titleJa: string;
  titleSi: string;
  printedPageStart: number;
  printedPageEnd: number;
  imageCount: number;
}

export interface ManifestTopicSummary {
  topicId: string;
  code: string;
  titleEn: string;
  titleJa: string;
  titleJaRuby: string;
  titleSi: string;
  startPage: number;
  endPage: number;
  sections: ManifestSectionSummary[];
}

export interface ManifestChapterSummary {
  id: string;
  number: string;
  titleEn: string;
  titleJa: string;
  titleJaRuby: string;
  titleSi: string;
  printedRange: [number, number];
  enPdfRange: [number, number];
  jaPdfRange: [number, number];
  descriptionEn: string;
  descriptionSi: string;
  topicCount: number;
  sectionCount: number;
  topics: ManifestTopicSummary[];
}

export interface PaperSummary {
  paperId: string;
  paperNumber: number;
  titleEn: string;
  titleJa: string;
  titleSi: string;
  durationMinutes: number;
  sectionACount: number;
  sectionBCount: number;
  totalQuestions: number;
  imageQuestionsCount: number;
}

export interface ContentManifest {
  schemaVersion: string;
  generatedAt: string;
  figmaReferenceNote: string;
  sources: {
    englishBook: { filename: string; pages: number; printedBodyPages: number };
    japaneseBook: { filename: string; pages: number; printedBodyPages: number };
    totalImages: number;
  };
  chapters: ManifestChapterSummary[];
  papers: PaperSummary[];
  counts: {
    chapters: number;
    topics: number;
    sections: number;
    vocabulary: number;
    kanji: number;
    images: number;
    papers: number;
    totalQuestionSlots: number;
    imageBackedQuestions: number;
  };
}

export interface JapaneseParagraph {
  plain: string;
  rubyMarkup: string;
  romaji: string;
}

export interface SectionPageImage {
  imageId: string;
  src: string;
  width: number;
  height: number;
  captionEn: string;
  captionJa: string;
  captionSi: string;
  category: string;
}

export interface StudyPageData {
  printedPage: number;
  enPdfPage: number | null;
  jaPdfPage: number | null;
  japaneseParagraphs: JapaneseParagraph[];
  englishParagraphs: string[];
  sinhalaParagraphs?: string[];
  images: SectionPageImage[];
  extractionStatus: 'VERIFIED' | 'PENDING' | 'NEEDS_REVIEW' | 'FAILED';
}

export interface StudySectionData {
  sectionId: string;
  chapterId: string;
  topicId: string;
  code: string;
  titleEn: string;
  titleJa: string;
  titleSi: string;
  printedPageStart: number;
  printedPageEnd: number;
  enPdfPageStart: number;
  jaPdfPageStart: number;
  sinhalaSummary: string;
  sinhalaTranslationStatus: string;
  paragraphSinhalaStatus: string;
  examRelevance: string;
  warnings: string[];
  examTips: string[];
  imageCount: number;
  pages: StudyPageData[];
}

export interface ChapterData {
  id: string;
  number: string;
  titleEn: string;
  titleJa: string;
  titleJaRuby: string;
  titleSi: string;
  descriptionEn: string;
  descriptionSi: string;
  topics: Array<{
    topicId: string;
    code: string;
    titleEn: string;
    titleJa: string;
    titleJaRuby: string;
    titleSi: string;
    startPage: number;
    endPage: number;
    sinhalaOverview: string;
    sections: StudySectionData[];
  }>;
}

export interface VocabItem {
  id: string;
  japanese: string;
  furigana: string;
  romaji: string;
  english: string;
  sinhala: string;
  exampleJa: string;
  exampleRuby: string;
  exampleEn: string;
  exampleSi: string;
  chapterId: string;
  topicId: string;
  sourcePage: number;
  category: string;
  verificationStatus: string;
}

export interface KanjiItem {
  id: string;
  character: string;
  onyomi: string;
  kunyomi: string;
  romaji: string;
  english: string;
  sinhala: string;
  examples: Array<{ word: string; reading: string; en: string; si: string }>;
  chapterId: string;
  sourcePage: number;
  verificationStatus: string;
}

export interface CbtOption {
  id: string;
  ja: string;
  ruby: string;
  en: string;
  si: string;
}

export interface CbtQuestion {
  questionId: string;
  paperId: string;
  questionNumber: number;
  section: 'A' | 'B';
  type: 'TRUE_FALSE' | 'MULTIPLE_CHOICE';
  chapterId: string;
  topicId: string;
  sectionId: string;
  sourceBook: string;
  sourcePage: number;
  difficulty: 'basic' | 'standard' | 'advanced';
  imageSrc: string | null;
  japanese: string;
  japaneseRuby: string;
  romaji: string;
  english: string;
  sinhala: string;
  options: CbtOption[];
  correctAnswer: string;
  explanationEn: string;
  explanationSi: string;
  isOfficialPastPaper: boolean;
  verificationStatus: string;
  sinhalaStatus: string;
}

export interface CbtPaper {
  paperId: string;
  paperNumber: number;
  titleEn: string;
  titleJa: string;
  titleSi: string;
  durationSeconds: number;
  sectionACount: number;
  sectionAPassMin: number;
  sectionBCount: number;
  sectionBPassMin: number;
  totalQuestions: number;
  imageQuestionsCount: number;
  isOfficialPastPaper: boolean;
  questions: CbtQuestion[];
}

export interface FlashcardReviewState {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // YYYY-MM-DD
  lastRating: 'again' | 'hard' | 'good' | 'easy';
  correctCount: number;
  incorrectCount: number;
}

export interface CbtAttemptRecord {
  attemptId: string;
  paperId: string;
  paperTitle: string;
  completedAt: string;
  durationSecondsTaken: number;
  answers: Record<string, string>;
  flaggedIds: string[];
  theoryCorrect: number;
  theoryTotal: number;
  theoryPassed: boolean;
  practicalCorrect: number;
  practicalTotal: number;
  practicalPassed: boolean;
  totalCorrect: number;
  totalQuestions: number;
  overallPassed: boolean;
  chapterStats: Record<string, { correct: number; total: number }>;
}

export interface StudySessionLog {
  id: string;
  date: string; // YYYY-MM-DD
  activity: 'notes' | 'vocabulary' | 'kanji' | 'flashcards' | 'cbt' | 'revision' | 'kyt' | 'simulator' | 'audio';
  minutes: number;
  xpEarned: number;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  type: 'section' | 'vocab' | 'kanji' | 'flashcard' | 'cbt' | 'timer' | 'kyt' | 'simulator' | 'audio' | 'revision';
  label: string;
  xp: number;
  timestamp: string;
}

export interface InProgressExamState {
  paperId: string;
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: string[];
  remainingSeconds: number;
  startedAt: string;
}

export interface KytScenarioResult {
  scenarioId: string;
  attempts: number;
  bestScorePct: number;
  hotspotsFound: number;
  hotspotsTotal: number;
  completedAt: string;
}

export interface SimulatorScenarioResult {
  scenarioId: string;
  attempts: number;
  bestOutcome: 'safe' | 'caution' | 'danger';
  completedAt: string;
}

export interface SmartRevisionItem {
  id: string;
  kind: 'question' | 'kanji' | 'vocab';
  refId: string;
  titleJa: string;
  titleRuby?: string;
  romaji?: string;
  titleEn: string;
  titleSi: string;
  answerEn: string;
  answerSi: string;
  explanationSi?: string;
  sourceLabel?: string;
  chapterId?: string;
  sectionId?: string;
  imageSrc?: string | null;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // YYYY-MM-DD
  missCount: number;
  addedAt: string;
}

export interface PersonalNoteItem {
  id: string;
  title: string;
  body: string;
  chapterId: string; // 'general' | 'ch-01'..'ch-04'
  sectionId?: string;
  updatedAt: string;
}

export interface LearnerProgressState {
  schemaVersion: number;
  xp: number;
  completedSectionIds: string[];
  bookmarkedSectionIds: string[];
  bookmarkedKytIds: string[];
  sectionNotes: Record<string, string>;
  personalNotes: PersonalNoteItem[];
  lastVisitedSection: { chapterId: string; sectionId: string } | null;
  masteredVocabIds: string[];
  difficultVocabIds: string[];
  masteredKanjiIds: string[];
  difficultKanjiIds: string[];
  bookmarkedQuestionIds: string[];
  flashcards: Record<string, FlashcardReviewState>;
  examAttempts: CbtAttemptRecord[];
  inProgressExam: InProgressExamState | null;
  studySessions: StudySessionLog[];
  dailyChecklist: Record<string, string[]>; // date -> completed mission keys
  recentActivities: ActivityEvent[];
  kytResults: Record<string, KytScenarioResult>;
  simulatorResults: Record<string, SimulatorScenarioResult>;
  revisionQueue: Record<string, SmartRevisionItem>;
  audioListeningCompleted: number;
  audioVocabCorrect: number;
  audioVocabTotal: number;
}

export interface AuditSummaryPayload {
  qaReport: {
    generatedAt: string;
    overallStatus: string;
    sourceAudit: {
      englishPdfPages: number;
      japanesePdfPages: number;
      totalCombinedPdfPages: number;
      verifiedPages: number;
      needsReviewPages: number;
      failedPages: number;
    };
    visualsAudit: {
      totalImages: number;
      visuallyInspectedVerified: number;
      dimensionAndPageMappedPendingCaptionQA: number;
      brokenAssets: number;
    };
    cbtAudit: {
      totalPapers: number;
      totalQuestionSlots: number;
      theoryPerPaper: number;
      practicalPerPaper: number;
      duplicateQuestionCount: number;
      missingSourceReferences: number;
      imageBackedQuestions: number;
    };
    lexiconAudit: {
      vocabularyCount: number;
      kanjiCount: number;
    };
    remainingExceptions: string[];
  };
  translationReview: {
    japaneseOriginal: { status: string; sourcePages: number; verifiedPages: number };
    furiganaRuby: { status: string; method: string };
    romajiHepburn: { status: string; method: string };
    englishOriginal: { status: string; sourcePages: number; verifiedPages: number };
    sinhalaCoverage: {
      chaptersAndTopicsVerified: number;
      vocabularyVerified: number;
      kanjiVerified: number;
      goldQuestionExplanationsVerified: number;
      extractedQuestionContextStatus: string;
      fullParagraphByParagraphSinhalaStatus: string;
      note: string;
    };
  };
  questionCoverage: {
    totalPapers: number;
    totalQuestionSlots: number;
    uniqueStemCount: number;
    duplicateQuestionCount: number;
    missingSourceReferences: number;
    imageBackedQuestions: number;
    chapterDistribution: Record<string, number>;
    disclaimer: string;
  };
  extractionReport: {
    totalSourcePdfPages: number;
    verifiedPages: number;
    pendingPages: number;
    needsReviewPages: number;
    failedPages: number;
    totalStudySections: number;
    totalJapaneseParagraphs: number;
    totalEnglishParagraphs: number;
  };
}
