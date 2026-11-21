import { useEffect, useMemo, useState } from 'react';
import { RotateCw, Shuffle } from 'lucide-react';
import { loadKanji, loadVocabulary } from '../lib/contentLoader';
import { getTodayKey } from '../lib/storage';
import { RubyText } from '../components/RubyText';
import type {
  FlashcardReviewState,
  KanjiItem,
  LearnerProgressState,
  UserSettings,
  VocabItem,
} from '../types/truckmaster';

interface UnifiedCard {
  id: string;
  kind: 'Vocabulary' | 'Kanji';
  frontMain: string;
  frontHint: string;
  furigana: string;
  romaji: string;
  english: string;
  sinhala: string;
  exampleRuby?: string;
  exampleEn?: string;
  exampleSi?: string;
  sourceLabel: string;
}

interface FlashcardsViewProps {
  progress: LearnerProgressState;
  settings: UserSettings;
  onRateCard: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy', label: string) => void;
}

export function FlashcardsView({ progress, settings, onRateCard }: FlashcardsViewProps) {
  const [cards, setCards] = useState<UnifiedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deckMode, setDeckMode] = useState<'due' | 'weak' | 'random'>('due');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(1);

  useEffect(() => {
    Promise.all([loadVocabulary(), loadKanji()]).then(([vocs, kanjis]: [VocabItem[], KanjiItem[]]) => {
      const merged: UnifiedCard[] = [
        ...vocs.map((v) => ({
          id: v.id,
          kind: 'Vocabulary' as const,
          frontMain: v.japanese,
          frontHint: `${v.category} · p.${v.sourcePage}`,
          furigana: v.furigana,
          romaji: v.romaji,
          english: v.english,
          sinhala: v.sinhala,
          exampleRuby: v.exampleRuby,
          exampleEn: v.exampleEn,
          exampleSi: v.exampleSi,
          sourceLabel: `${v.chapterId.toUpperCase()} · p.${v.sourcePage}`,
        })),
        ...kanjis.map((k) => ({
          id: k.id,
          kind: 'Kanji' as const,
          frontMain: k.character,
          frontHint: `Kanji · p.${k.sourcePage}`,
          furigana: `On: ${k.onyomi} / Kun: ${k.kunyomi}`,
          romaji: k.romaji,
          english: k.english,
          sinhala: k.sinhala,
          exampleEn: k.examples.map((e) => `${e.word} (${e.reading}): ${e.en}`).join(' · '),
          exampleSi: k.examples.map((e) => `${e.word}: ${e.si}`).join(' · '),
          sourceLabel: `${k.chapterId.toUpperCase()} · p.${k.sourcePage}`,
        })),
      ];
      setCards(merged);
      setLoading(false);
    });
  }, []);

  const today = getTodayKey();

  const activeDeck = useMemo(() => {
    if (cards.length === 0) return [];
    if (deckMode === 'weak') {
      const weakSet = new Set([
        ...progress.difficultVocabIds,
        ...progress.difficultKanjiIds,
        ...Object.values(progress.flashcards)
          .filter((f) => f.lastRating === 'again' || f.lastRating === 'hard' || f.incorrectCount > f.correctCount)
          .map((f) => f.cardId),
      ]);
      const weakCards = cards.filter((c) => weakSet.has(c.id));
      return weakCards.length > 0 ? weakCards : cards.slice(0, 15);
    }
    if (deckMode === 'random') {
      const arr = [...cards];
      let s = shuffleSeed * 9301 + 49297;
      for (let i = arr.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const j = s % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    // Due queue (due today or never seen)
    return cards.filter((c) => {
      const st: FlashcardReviewState | undefined = progress.flashcards[c.id];
      return !st || st.dueDate <= today;
    });
  }, [cards, deckMode, progress.flashcards, progress.difficultVocabIds, progress.difficultKanjiIds, today, shuffleSeed]);

  const card = activeDeck[currentIdx % Math.max(1, activeDeck.length)] || null;
  const cardState = card ? progress.flashcards[card.id] : undefined;

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!card) return;
    onRateCard(card.id, rating, card.frontMain);
    setSessionReviewed((c) => c + 1);
    setFlipped(false);
    setCurrentIdx((idx) => (idx + 1) % Math.max(1, activeDeck.length));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>Session: {sessionReviewed}/{settings.dailyFlashcardTarget} target</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Deck: {activeDeck.length} cards</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            Spaced-Repetition Flashcards
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                ['due', 'Due'],
                ['weak', 'Weak'],
                ['random', 'Random'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setDeckMode(m);
                  setCurrentIdx(0);
                  setFlipped(false);
                  if (m === 'random') setShuffleSeed((s) => s + 1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  deckMode === m
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {deckMode === 'random' && (
            <button
              type="button"
              onClick={() => {
                setShuffleSeed((s) => s + 1);
                setCurrentIdx(0);
                setFlipped(false);
              }}
              aria-label="Reshuffle deck"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-500">Preparing verified deck...</div>
      ) : !card ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <p className="text-lg font-bold text-slate-900 dark:text-white">All due flashcards complete!</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Switch to Random Revision or Weak Mode to keep drilling.
          </p>
          <button
            type="button"
            onClick={() => setDeckMode('random')}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-xl"
          >
            Start Random Revision
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Interactive Flip Card */}
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 min-h-[340px] flex flex-col justify-between transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A]"
          >
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 w-full">
              <span>
                {card.kind} · {card.sourceLabel}
              </span>
              <span className="tabular-nums">
                {cardState ? `Next interval: ${cardState.intervalDays}d` : 'New card'}
              </span>
            </div>

            {!flipped ? (
              <div className="py-10 text-center space-y-3 w-full">
                <p className="text-4xl sm:text-5xl font-bold font-jp text-slate-900 dark:text-white">
                  {card.frontMain}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.frontHint}</p>
              </div>
            ) : (
              <div className="py-4 space-y-4 w-full">
                <div className="text-center space-y-1">
                  <p className="text-2xl sm:text-3xl font-bold font-jp text-slate-900 dark:text-white">
                    {card.frontMain}
                  </p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {card.furigana} · <span className="font-mono">{card.romaji}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center space-y-1.5">
                  <p className="text-base font-bold text-slate-900 dark:text-white">{card.english}</p>
                  <p className="text-base font-bold text-[#0B4F8A] dark:text-sky-400 font-sinhala">
                    {card.sinhala}
                  </p>
                </div>

                {(card.exampleRuby || card.exampleEn) && (
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                    {card.exampleRuby && (
                      <p className="text-slate-900 dark:text-white">
                        <RubyText markup={card.exampleRuby} showFurigana />
                      </p>
                    )}
                    {card.exampleEn && <p>{card.exampleEn}</p>}
                    {card.exampleSi && <p className="font-sinhala text-slate-500 dark:text-slate-400">{card.exampleSi}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 w-full pt-2">
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{flipped ? 'Tap card to hide answer · Rate recall below' : 'Tap card to reveal Furigana, Romaji, English & Sinhala'}</span>
            </div>
          </button>

          {/* Spaced Repetition Rating Buttons */}
          <div className="grid grid-cols-4 gap-2.5">
            <button
              type="button"
              disabled={!flipped}
              onClick={() => handleRate('again')}
              className="min-h-[52px] rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold text-xs sm:text-sm disabled:opacity-40 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors"
            >
              Again
              <span className="block text-[10px] font-mono font-normal opacity-80">Today</span>
            </button>
            <button
              type="button"
              disabled={!flipped}
              onClick={() => handleRate('hard')}
              className="min-h-[52px] rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold text-xs sm:text-sm disabled:opacity-40 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors"
            >
              Hard
              <span className="block text-[10px] font-mono font-normal opacity-80">1 day</span>
            </button>
            <button
              type="button"
              disabled={!flipped}
              onClick={() => handleRate('good')}
              className="min-h-[52px] rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 text-[#0B4F8A] dark:text-sky-300 font-semibold text-xs sm:text-sm disabled:opacity-40 hover:bg-sky-100 dark:hover:bg-sky-950/70 transition-colors"
            >
              Good
              <span className="block text-[10px] font-mono font-normal opacity-80">3+ days</span>
            </button>
            <button
              type="button"
              disabled={!flipped}
              onClick={() => handleRate('easy')}
              className="min-h-[52px] rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-[#0D7A5F] dark:text-emerald-300 font-semibold text-xs sm:text-sm disabled:opacity-40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
            >
              Easy
              <span className="block text-[10px] font-mono font-normal opacity-80">6+ days</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
