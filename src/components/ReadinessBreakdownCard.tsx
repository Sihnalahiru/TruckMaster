import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  Info,
  Languages,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { KYT_SCENARIOS } from '../data/kytScenarios';
import { SIMULATOR_SCENARIOS } from '../data/simulatorScenarios';
import { computeReadinessBreakdown, type WeakTopicItem } from '../lib/readiness';
import type { AppRoute, ContentManifest, LearnerProgressState } from '../types/truckmaster';

interface ReadinessBreakdownCardProps {
  manifest: ContentManifest;
  progress: LearnerProgressState;
  onNavigate: (route: AppRoute) => void;
  onOpenSection: (chapterId: string, sectionId: string) => void;
  compact?: boolean;
}

export function ReadinessBreakdownCard({
  manifest,
  progress,
  onNavigate,
  onOpenSection,
  compact = false,
}: ReadinessBreakdownCardProps) {
  const readiness = useMemo(
    () =>
      computeReadinessBreakdown(
        manifest,
        progress,
        KYT_SCENARIOS.length,
        SIMULATOR_SCENARIOS.length,
      ),
    [manifest, progress],
  );

  const pillars = [
    {
      key: 'theory',
      labelEn: 'Theory Readiness',
      labelSi: 'න්‍යායාත්මක සූදානම (Ch.1–2 & CBT A)',
      value: readiness.theoryReadiness,
      barColor: 'bg-[#0B4F8A] dark:bg-sky-500',
      icon: TrendingUp,
      action: () => onNavigate('cbt'),
    },
    {
      key: 'practical',
      labelEn: 'Practical Readiness',
      labelSi: 'ප්‍රායෝගික සූදානම (Ch.3, Simulator & CBT B)',
      value: readiness.practicalReadiness,
      barColor: 'bg-[#0D7A5F] dark:bg-emerald-500',
      icon: Compass,
      action: () => onNavigate('simulator'),
    },
    {
      key: 'kyt',
      labelEn: 'KYT Hazard Readiness',
      labelSi: 'KYT අනතුරු පුරෝකථන සූදානම',
      value: readiness.kytReadiness,
      barColor: 'bg-amber-500',
      icon: ShieldAlert,
      action: () => onNavigate('kyt'),
    },
    {
      key: 'vocab',
      labelEn: 'Vocabulary & Kanji Mastery',
      labelSi: 'ජපන් වචන මාලාව සහ කන්ජි ප්‍රගුණතාව',
      value: readiness.vocabKanjiMastery,
      barColor: 'bg-indigo-600 dark:bg-indigo-400',
      icon: Languages,
      action: () => onNavigate('vocabulary'),
    },
  ];

  const handleOpenWeakTopic = (topic: WeakTopicItem) => {
    if (topic.targetRoute === 'study' && topic.chapterId && topic.sectionId) {
      onOpenSection(topic.chapterId, topic.sectionId);
      return;
    }
    onNavigate(topic.targetRoute);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wide text-[#0B4F8A] dark:text-sky-400 font-bold">
            Preparation Indicator · සූදානම් වීමේ දර්ශකය
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            SSW Readiness Breakdown
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-sinhala">
            {readiness.levelLabelEn} · {readiness.levelLabelSi}
          </p>
        </div>

        {/* Overall Preparation Score Tile */}
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shrink-0">
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Overall Prep Index
            </p>
            <p className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white leading-tight">
              {readiness.overallIndex}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B4F8A] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
            {readiness.overallIndex >= 80
              ? 'HIGH'
              : readiness.overallIndex >= 60
                ? 'GOOD'
                : readiness.overallIndex >= 30
                  ? 'BUILD'
                  : 'START'}
          </div>
        </div>
      </div>

      {/* 4 Independent Readiness Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <button
              key={pillar.key}
              type="button"
              onClick={pillar.action}
              className="tm-card-press text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#0B4F8A] dark:hover:border-sky-500 transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{pillar.labelEn}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sinhala truncate mt-0.5">
                    {pillar.labelSi}
                  </p>
                </div>
                <span className="text-base font-extrabold font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                  {pillar.value}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${pillar.barColor}`}
                  style={{ width: `${Math.max(pillar.value, 2)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Weakest Topics Actionable List */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
            <span>Weakest Topics to Focus Next</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-sinhala">
            වැඩි අවධානයක් අවශ්‍ය අංශ
          </span>
        </div>

        <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-3'} gap-2.5`}>
          {readiness.weakestTopics.map((topic) => (
            <div
              key={topic.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {topic.labelEn}
                </p>
                <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                  {topic.labelSi}
                </p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {topic.reasonEn}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
                  {topic.scorePct}%
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenWeakTopic(topic)}
                  className="tm-card-press inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0B4F8A] text-white text-xs font-bold hover:bg-[#083D6B] whitespace-nowrap"
                >
                  <span>Drill</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explicit Preparation Indicator Non-Guarantee Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="font-medium">{readiness.disclaimerEn}</p>
          <p className="font-sinhala text-slate-500 dark:text-slate-400">{readiness.disclaimerSi}</p>
        </div>
      </div>
    </section>
  );
}
