import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
} from 'lucide-react';
import { loadKanji, loadVocabulary } from '../lib/contentLoader';
import { RubyText } from '../components/RubyText';
import type {
  KanjiItem,
  LearnerProgressState,
  UserSettings,
  VocabItem,
} from '../types/truckmaster';

interface VocabKanjiViewProps {
  mode: 'vocabulary' | 'kanji';
  progress: LearnerProgressState;
  settings: UserSettings;
  onToggleMastered: (kind: 'vocab' | 'kanji', id: string, label: string) => void;
  onToggleDifficult: (kind: 'vocab' | 'kanji', id: string) => void;
  onOpenFlashcards: () => void;
}

export function VocabKanjiView({
  mode,
  progress,
  settings,
  onToggleMastered,
  onToggleDifficult,
  onOpenFlashcards,
}: VocabKanjiViewProps) {
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [kanjiList, setKanjiList] = useState<KanjiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<'all' | 'mastered' | 'difficult' | 'unmastered'>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([loadVocabulary(), loadKanji()]).then(([v, k]) => {
      setVocabList(v);
      setKanjiList(k);
      setLoading(false);
    });
  }, []);

  const filteredVocab = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vocabList.filter((item) => {
      if (chapterFilter !== 'all' && item.chapterId !== chapterFilter) return false;
      const mastered = progress.masteredVocabIds.includes(item.id);
      const difficult = progress.difficultVocabIds.includes(item.id);
      if (queueFilter === 'mastered' && !mastered) return false;
      if (queueFilter === 'difficult' && !difficult) return false;
      if (queueFilter === 'unmastered' && mastered) return false;
      if (!q) return true;
      return (
        item.japanese.includes(q) ||
        item.furigana.includes(q) ||
        item.romaji.toLowerCase().includes(q) ||
        item.english.toLowerCase().includes(q) ||
        item.sinhala.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [vocabList, query, chapterFilter, queueFilter, progress.masteredVocabIds, progress.difficultVocabIds]);

  const filteredKanji = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kanjiList.filter((item) => {
      if (chapterFilter !== 'all' && item.chapterId !== chapterFilter) return false;
      const mastered = progress.masteredKanjiIds.includes(item.id);
      const difficult = progress.difficultKanjiIds.includes(item.id);
      if (queueFilter === 'mastered' && !mastered) return false;
      if (queueFilter === 'difficult' && !difficult) return false;
      if (queueFilter === 'unmastered' && mastered) return false;
      if (!q) return true;
      return (
        item.character.includes(q) ||
        item.onyomi.includes(q) ||
        item.kunyomi.includes(q) ||
        item.romaji.toLowerCase().includes(q) ||
        item.english.toLowerCase().includes(q) ||
        item.sinhala.toLowerCase().includes(q)
      );
    });
  }, [kanjiList, query, chapterFilter, queueFilter, progress.masteredKanjiIds, progress.difficultKanjiIds]);

  const isVocab = mode === 'vocabulary';
  const totalCount = isVocab ? vocabList.length : kanjiList.length;
  const masteredCount = isVocab ? progress.masteredVocabIds.length : progress.masteredKanjiIds.length;
  const difficultCount = isVocab ? progress.difficultVocabIds.length : progress.difficultKanjiIds.length;
  const dailyTarget = isVocab ? settings.dailyVocabTarget : settings.dailyKanjiTarget;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>{masteredCount}/{totalCount} mastered</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>{difficultCount} marked difficult</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>Daily target: {dailyTarget}</span>
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {isVocab ? 'Trucking Vocabulary Centre · 重要語彙' : 'Trucking Kanji Centre · 重要漢字'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sinhala mt-0.5">
              {isVocab
                ? 'නිල පෙළපොතෙන් තෝරාගත් ට්‍රක් රථ සහ මාර්ග ආරක්ෂක වචන මාලාව'
                : 'SSW විභාගයේ බහුලව භාවිතා වන ජපන් කන්ජි අක්ෂර සහ කියවීම්'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenFlashcards}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-xl hover:bg-[#083D6B] min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>Study with Flashcards</span>
          </button>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isVocab ? 'Search Japanese, Romaji, English, Sinhala...' : 'Search Kanji, On/Kun reading, English, Sinhala...'}
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#0B4F8A]"
            />
          </div>

          <select
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            aria-label="Filter by chapter"
            className="min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Chapters</option>
            <option value="ch-01">Ch. 01 Basics</option>
            <option value="ch-02">Ch. 02 Operations</option>
            <option value="ch-03">Ch. 03 Cargo</option>
            <option value="ch-04">Ch. 04 KYT</option>
          </select>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                ['all', 'All'],
                ['unmastered', 'Queue'],
                ['difficult', 'Difficult'],
                ['mastered', 'Mastered'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setQueueFilter(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  queueFilter === val
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cards Grid */}
      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">Loading verified records...</div>
      ) : isVocab ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocab.map((item) => {
            const mastered = progress.masteredVocabIds.includes(item.id);
            const difficult = progress.difficultVocabIds.includes(item.id);
            return (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {item.category} · {item.chapterId.toUpperCase()} · p.{item.sourcePage}
                      </p>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white font-jp mt-1">
                        {item.japanese}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.furigana} · <span className="font-mono">{item.romaji}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleDifficult('vocab', item.id)}
                        aria-label={`Mark ${item.japanese} as difficult`}
                        aria-pressed={difficult}
                        className={`p-2 rounded-xl border min-h-[40px] min-w-[40px] flex items-center justify-center ${
                          difficult
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleMastered('vocab', item.id, item.japanese)}
                        aria-label={`Mark ${item.japanese} as mastered`}
                        aria-pressed={mastered}
                        className={`p-2 rounded-xl border min-h-[40px] min-w-[40px] flex items-center justify-center ${
                          mastered
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-[#0D7A5F] dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.english}</p>
                    <p className="text-sm font-semibold text-[#0B4F8A] dark:text-sky-400 font-sinhala">
                      {item.sinhala}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                    <p className="text-slate-900 dark:text-slate-100">
                      <RubyText markup={item.exampleRuby} showFurigana />
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">{item.exampleEn}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-sinhala">{item.exampleSi}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKanji.map((item) => {
            const mastered = progress.masteredKanjiIds.includes(item.id);
            const difficult = progress.difficultKanjiIds.includes(item.id);
            return (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl font-bold font-jp text-slate-900 dark:text-white shrink-0">
                      {item.character}
                    </div>
                    <div>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {item.chapterId.toUpperCase()} · p.{item.sourcePage}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{item.english}</p>
                      <p className="text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 font-sinhala">
                        {item.sinhala}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleMastered('kanji', item.id, item.character)}
                      aria-label={`Mark Kanji ${item.character} mastered`}
                      className={`p-1.5 rounded-lg border ${
                        mastered
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-[#0D7A5F] dark:text-emerald-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleDifficult('kanji', item.id)}
                      aria-label={`Mark Kanji ${item.character} difficult`}
                      className={`p-1.5 rounded-lg border ${
                        difficult
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-0.5 text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p>
                    <span className="text-slate-400">On:</span> {item.onyomi} ·{' '}
                    <span className="text-slate-400">Kun:</span> {item.kunyomi}
                  </p>
                  <p className="font-mono text-slate-500 dark:text-slate-400">{item.romaji}</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {item.examples.map((ex, i) => (
                    <div key={i} className="text-xs flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white font-jp">
                        {ex.word} <span className="font-normal text-slate-500">({ex.reading})</span>
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 text-right font-sinhala">
                        {ex.si}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
