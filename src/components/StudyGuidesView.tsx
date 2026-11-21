import { useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckSquare, Square } from 'lucide-react';
import { STUDY_CHAPTERS, type LanguageMode } from '../data/studyData';
import { ResilientImage } from './ResilientImage';

interface StudyGuidesViewProps {
  language: LanguageMode;
  completedRuleIds: string[];
  onToggleRule: (ruleId: string) => void;
  onStartPractice: () => void;
  onOpenBooks: () => void;
}

export function StudyGuidesView({
  language,
  completedRuleIds,
  onToggleRule,
  onStartPractice,
  onOpenBooks,
}: StudyGuidesViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const chapter = STUDY_CHAPTERS[activeIndex];

  const showEn = language === 'en' || language === 'bilingual';
  const showJa = language === 'ja' || language === 'bilingual';

  const totalRules = STUDY_CHAPTERS.reduce((sum, ch) => sum + ch.keyRules.length, 0);
  const chapterDoneCount = chapter.keyRules.filter((r) => completedRuleIds.includes(r.id)).length;

  return (
    <div className="space-y-8">
      {/* Chapter Strip */}
      <section aria-label="Curriculum chapters" className="border-b border-slate-200 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              <span>Japan SSW Category 1</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>Truck Driving Curriculum</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span className="tabular-nums">{completedRuleIds.length}/{totalRules} checkpoints reviewed</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5 [text-wrap:balance]">
              {showEn && 'Structured Study Modules'}
              {language === 'bilingual' && ' / '}
              {showJa && '特定技能トラック 試験対策モジュール'}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenBooks}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A]"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Open PDF Books</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STUDY_CHAPTERS.map((item, idx) => {
            const isSelected = idx === activeIndex;
            const doneCount = item.keyRules.filter((r) => completedRuleIds.includes(r.id)).length;
            const allDone = doneCount === item.keyRules.length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`text-left p-4 rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] ${
                  isSelected
                    ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className={`font-mono tabular-nums ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                    Module {item.number}
                  </span>
                  <span
                    className={`font-mono tabular-nums flex items-center gap-1 ${
                      isSelected
                        ? 'text-sky-100'
                        : allDone
                          ? 'text-[#0D7A5F] font-medium'
                          : 'text-slate-500'
                    }`}
                  >
                    {allDone && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    {doneCount}/{item.keyRules.length}
                  </span>
                </div>
                <p className={`text-sm font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'ja' ? item.titleJa : item.titleEn}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Two-Zone Educational Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Zone (7 cols): Official Visual Stage + Concept Summary + Vocabulary */}
        <article className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4 text-xs text-slate-500 mb-2">
              <span className="font-mono tabular-nums">
                Module {chapter.number} · Figure #{chapter.figureId}
              </span>
              <span className="tabular-nums">
                {chapterDoneCount} of {chapter.keyRules.length} mastered
              </span>
            </div>
            {showEn && (
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 [text-wrap:balance]">
                {chapter.number}. {chapter.titleEn}
              </h2>
            )}
            {showJa && (
              <p className={`font-semibold text-slate-700 ${showEn ? 'text-base mt-1' : 'text-xl sm:text-2xl text-slate-900'}`}>
                {chapter.titleJa}
              </p>
            )}
          </div>

          <figure className="bg-slate-50 border-b border-slate-200 p-6 flex flex-col items-center">
            <div className="w-full max-h-[380px] flex items-center justify-center bg-white border border-slate-200 rounded-lg p-4">
              <ResilientImage
                src={chapter.figureSrc}
                alt={chapter.figureCaptionEn}
                loading="eager"
                className="max-h-[340px] w-auto object-contain rounded"
                fallbackLabel={`Figure #${chapter.figureId}`}
              />
            </div>
            <figcaption className="mt-4 text-sm text-slate-600 text-center max-w-2xl space-y-1">
              {showEn && <p>{chapter.figureCaptionEn}</p>}
              {showJa && <p className="text-slate-500">{chapter.figureCaptionJa}</p>}
            </figcaption>
          </figure>

          <div className="p-6 space-y-6">
            <div className="space-y-2 text-[15px] leading-relaxed text-slate-700">
              {showEn && <p>{chapter.summaryEn}</p>}
              {showJa && <p className="text-slate-600">{chapter.summaryJa}</p>}
            </div>

            {/* Bilingual Key Exam Terms */}
            <div className="pt-5 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Key Exam Vocabulary · 重要試験用語
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4 font-medium">Japanese</th>
                      <th className="py-2 pr-4 font-medium">Reading</th>
                      <th className="py-2 font-medium">English Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chapter.vocabulary.map((term) => (
                      <tr key={term.ja}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                          {term.ja}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">
                          {term.reading}
                        </td>
                        <td className="py-2.5 text-slate-700">{term.en}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </article>

        {/* Right Zone (5 cols): Interactive Mastery Checklist & Next Actions */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Exam Checkpoints
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {chapterDoneCount}/{chapter.keyRules.length} verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Mark each regulation once you can recall it without looking at the textbook.
            </p>

            <div className="divide-y divide-slate-100">
              {chapter.keyRules.map((rule) => {
                const checked = completedRuleIds.includes(rule.id);
                return (
                  <div key={rule.id} className="py-4 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id)}
                      className="w-full text-left flex items-start gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A] rounded"
                    >
                      <span className="mt-0.5 shrink-0 text-[#0B4F8A]">
                        {checked ? (
                          <CheckSquare className="w-5 h-5 text-[#0D7A5F]" aria-hidden="true" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
                        )}
                      </span>
                      <div className="space-y-1">
                        {showEn && (
                          <p
                            className={`text-sm font-semibold leading-snug ${
                              checked ? 'text-[#0D7A5F]' : 'text-slate-900'
                            }`}
                          >
                            {rule.labelEn}
                          </p>
                        )}
                        {showJa && (
                          <p className="text-xs font-medium text-slate-600">
                            {rule.labelJa}
                          </p>
                        )}
                        {showEn && (
                          <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                            {rule.detailEn}
                          </p>
                        )}
                        {showJa && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {rule.detailJa}
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progression Footer Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row lg:flex-col gap-4 justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Ready to test your hazard recognition?
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Practice 10 illustrated SSW questions drawn directly from the textbook figures with immediate bilingual explanations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onStartPractice}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B4F8A] rounded-lg hover:bg-[#083D6B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B4F8A]"
              >
                <span>Start Practice Exam</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              {activeIndex < STUDY_CHAPTERS.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Next Module
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
