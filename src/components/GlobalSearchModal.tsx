import { useEffect, useMemo, useState } from 'react';
import {
  BookA,
  BookOpen,
  Compass,
  Languages,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { loadKanji, loadVocabulary } from '../lib/contentLoader';
import { KYT_SCENARIOS } from '../data/kytScenarios';
import { SIMULATOR_SCENARIOS } from '../data/simulatorScenarios';
import type { AppRoute, ContentManifest, KanjiItem, VocabItem } from '../types/truckmaster';

interface GlobalSearchModalProps {
  open: boolean;
  manifest: ContentManifest;
  onClose: () => void;
  onOpenSection: (chapterId: string, sectionId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

interface SearchHit {
  id: string;
  category: 'Lesson' | 'Vocabulary' | 'Kanji' | 'KYT Lab' | 'Simulator';
  titlePrimary: string;
  titleJa: string;
  titleSi: string;
  meta: string;
  onOpen: () => void;
}

export function GlobalSearchModal({
  open,
  manifest,
  onClose,
  onOpenSection,
  onNavigate,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [kanji, setKanji] = useState<KanjiItem[]>([]);

  useEffect(() => {
    if (!open) return;
    if (vocab.length === 0) {
      loadVocabulary().then(setVocab).catch(() => {});
    }
    if (kanji.length === 0) {
      loadKanji().then(setKanji).catch(() => {});
    }
  }, [open, vocab.length, kanji.length]);

  const results = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: SearchHit[] = [];

    // 1. Textbook Sections (JP / EN / SI / Code / Page)
    for (const ch of manifest.chapters) {
      for (const t of ch.topics) {
        for (const s of t.sections) {
          const hay = `${s.code} ${s.titleEn} ${s.titleJa} ${s.titleSi} ${s.printedPageStart}`.toLowerCase();
          if (hay.includes(q)) {
            hits.push({
              id: `sec-${s.sectionId}`,
              category: 'Lesson',
              titlePrimary: `${s.code} ${s.titleEn}`,
              titleJa: s.titleJa,
              titleSi: s.titleSi,
              meta: `Ch.${ch.number} · pp.${s.printedPageStart}–${s.printedPageEnd}`,
              onOpen: () => {
                onClose();
                onOpenSection(ch.id, s.sectionId);
              },
            });
          }
        }
      }
    }

    // 2. KYT Interactive Scenes
    for (const kyt of KYT_SCENARIOS) {
      const hay = `${kyt.titleEn} ${kyt.titleJa} ${kyt.titleSi} ${kyt.scenarioBriefEn} ${kyt.scenarioBriefSi}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          id: `kyt-${kyt.id}`,
          category: 'KYT Lab',
          titlePrimary: kyt.titleEn,
          titleJa: kyt.titleJa,
          titleSi: kyt.titleSi,
          meta: `Interactive KYT Sheet ${kyt.sheetNumber} · p.${kyt.sourcePage}`,
          onOpen: () => {
            onClose();
            onNavigate('kyt');
          },
        });
      }
    }

    // 3. Truck Driver Simulator Scenarios
    for (const sim of SIMULATOR_SCENARIOS) {
      const hay = `${sim.domain} ${sim.titleEn} ${sim.titleJa} ${sim.titleSi} ${sim.situationEn} ${sim.situationSi}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          id: `sim-${sim.id}`,
          category: 'Simulator',
          titlePrimary: sim.titleEn,
          titleJa: sim.titleJa,
          titleSi: sim.titleSi,
          meta: `Simulator · ${sim.domain}`,
          onOpen: () => {
            onClose();
            onNavigate('simulator');
          },
        });
      }
    }

    // 4. Vocabulary (JP / Furigana / Romaji / EN / SI)
    for (const v of vocab) {
      const hay = `${v.japanese} ${v.furigana} ${v.romaji} ${v.english} ${v.sinhala}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          id: `voc-${v.id}`,
          category: 'Vocabulary',
          titlePrimary: `${v.english} (${v.romaji})`,
          titleJa: `${v.japanese} (${v.furigana})`,
          titleSi: v.sinhala,
          meta: `Vocab · ${v.chapterId.toUpperCase()} · p.${v.sourcePage}`,
          onOpen: () => {
            onClose();
            onNavigate('vocabulary');
          },
        });
      }
    }

    // 5. Kanji
    for (const k of kanji) {
      const hay = `${k.character} ${k.onyomi} ${k.kunyomi} ${k.romaji} ${k.english} ${k.sinhala}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          id: `kan-${k.id}`,
          category: 'Kanji',
          titlePrimary: `${k.character} — ${k.english}`,
          titleJa: `${k.onyomi} / ${k.kunyomi}`,
          titleSi: k.sinhala,
          meta: `Kanji · ${k.chapterId.toUpperCase()}`,
          onOpen: () => {
            onClose();
            onNavigate('kanji');
          },
        });
      }
    }

    return hits.slice(0, 24);
  }, [query, manifest, vocab, kanji, onClose, onNavigate, onOpenSection]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 pt-12 sm:pt-4"
      role="dialog"
      aria-modal="true"
      aria-label="Global Trilingual Search"
      onClick={onClose}
    >
      <div
        className="tm-modal-pop w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Search className="w-5 h-5 text-[#0B4F8A] dark:text-sky-400 shrink-0" aria-hidden="true" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 日本語, Romaji, English, or සිංහල (e.g. 点呼, brake, වමට, snow)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-sinhala"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {!query.trim() ? (
            <div className="py-8 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <p className="font-bold text-slate-700 dark:text-slate-200">
                Search Across All Japanese, English &amp; Sinhala Content
              </p>
              <p className="font-sinhala">
                පාඩම් 62, වචන 180, කන්ජි 80, KYT දර්ශන සහ Simulator අවස්ථා සියල්ල එකවර සොයන්න.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {['点呼', '内輪差', 'hydroplaning', 'වමට', 'හිම', 'brake'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setQuery(chip)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0B4F8A]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No matches found for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((hit) => {
              const Icon =
                hit.category === 'Lesson'
                  ? BookOpen
                  : hit.category === 'Vocabulary'
                    ? Languages
                    : hit.category === 'Kanji'
                      ? BookA
                      : hit.category === 'KYT Lab'
                        ? ShieldAlert
                        : Compass;
              return (
                <button
                  key={hit.id}
                  type="button"
                  onClick={hit.onOpen}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#0B4F8A] dark:text-sky-400 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {hit.category} · {hit.meta}
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {hit.titlePrimary}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{hit.titleJa}</p>
                    <p className="text-xs font-medium text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                      {hit.titleSi}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
