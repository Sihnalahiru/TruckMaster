import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CloudRain,
  Compass,
  Gauge,
  Moon,
  Package,
  RotateCcw,
  ShieldCheck,
  TrafficCone,
  Volume2,
  XCircle,
} from 'lucide-react';
import {
  SIMULATOR_SCENARIOS,
  type SimulatorDomain,
  type TruckSimulatorScenario,
} from '../data/simulatorScenarios';
import { playFeedbackTone } from '../lib/sound';
import { speakJapanese } from '../lib/speech';
import { RubyText } from '../components/RubyText';
import { HighwayTruckProgress } from '../components/RewardEffects';
import type { LearnerProgressState, SmartRevisionItem, UserSettings } from '../types/truckmaster';

interface ScenarioSimulatorViewProps {
  progress: LearnerProgressState;
  settings: UserSettings;
  onCompleteDecision: (payload: {
    scenarioId: string;
    titleEn: string;
    outcome: 'safe' | 'caution' | 'danger';
    missedItem?: Omit<SmartRevisionItem, 'easeFactor' | 'intervalDays' | 'repetitions' | 'dueDate' | 'missCount' | 'addedAt'>;
  }) => void;
  onOpenStudySection: (chapterId: string, sectionId: string) => void;
}

const DOMAIN_META: Array<{ id: 'all' | SimulatorDomain; label: string; labelSi: string; icon: typeof CloudRain }> = [
  { id: 'all', label: 'All', labelSi: 'සියල්ල', icon: Compass },
  { id: 'weather', label: 'Weather', labelSi: 'කාලගුණය', icon: CloudRain },
  { id: 'road', label: 'Road', labelSi: 'මාර්ග', icon: Gauge },
  { id: 'fatigue', label: 'Fatigue', labelSi: 'වෙහෙස', icon: Moon },
  { id: 'loading', label: 'Loading', labelSi: 'පැටවීම', icon: Package },
  { id: 'traffic', label: 'Traffic', labelSi: 'රථවාහන', icon: TrafficCone },
];

export function ScenarioSimulatorView({
  progress,
  settings,
  onCompleteDecision,
  onOpenStudySection,
}: ScenarioSimulatorViewProps) {
  const [domainFilter, setDomainFilter] = useState<'all' | SimulatorDomain>('all');
  const [activeId, setActiveId] = useState<string>(SIMULATOR_SCENARIOS[0].id);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  const filteredList = useMemo(
    () =>
      domainFilter === 'all'
        ? SIMULATOR_SCENARIOS
        : SIMULATOR_SCENARIOS.filter((s) => s.domain === domainFilter),
    [domainFilter],
  );

  const scenario: TruckSimulatorScenario = useMemo(() => {
    const found = filteredList.find((s) => s.id === activeId);
    return found || filteredList[0] || SIMULATOR_SCENARIOS[0];
  }, [activeId, filteredList]);

  const safeCount = Object.values(progress.simulatorResults || {}).filter(
    (r) => r.bestOutcome === 'safe',
  ).length;
  const pct = Math.round((safeCount / SIMULATOR_SCENARIOS.length) * 100);

  const chosenObj = scenario.choices.find((c) => c.id === selectedChoiceId) || null;
  const safeChoiceObj = scenario.choices.find((c) => c.outcome === 'safe') || scenario.choices[0];

  const handleSelectChoice = (choiceId: string) => {
    if (selectedChoiceId) return;
    const ch = scenario.choices.find((c) => c.id === choiceId);
    if (!ch) return;
    setSelectedChoiceId(choiceId);
    playFeedbackTone(ch.outcome === 'safe' ? 'celebrate' : 'wrong', settings.soundEnabled);

    onCompleteDecision({
      scenarioId: scenario.id,
      titleEn: scenario.titleEn,
      outcome: ch.outcome,
      missedItem:
        ch.outcome !== 'safe'
          ? {
              id: `rev-sim-${scenario.id}`,
              kind: 'question',
              refId: scenario.id,
              titleJa: scenario.titleJa,
              titleRuby: scenario.titleRuby,
              romaji: scenario.situationRomaji,
              titleEn: scenario.titleEn,
              titleSi: scenario.titleSi,
              answerEn: safeChoiceObj.en,
              answerSi: safeChoiceObj.si,
              explanationSi: scenario.textbookRuleSi,
              sourceLabel: `Simulator · ${scenario.chapterId.toUpperCase()} p.${scenario.sourcePage}`,
              chapterId: scenario.chapterId,
              sectionId: scenario.sectionId,
              imageSrc: null,
            }
          : undefined,
    });
  };

  const currentIdx = filteredList.findIndex((s) => s.id === scenario.id);
  const nextScenario = filteredList[(currentIdx + 1) % filteredList.length];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header & Category Filters */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-[#0B4F8A] dark:text-sky-400">
              Textbook Decision Training · Weather · Road · Fatigue · Loading · Traffic
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              Truck Driver Scenario Simulator
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sinhala mt-0.5">
              සැබෑ ට්‍රක් රියදුරු අවස්ථා වලදී ආරක්ෂිතම තීරණය ගැනීමේ අන්තර්ක්‍රියාකාරී පුහුණු සිමියුලේටරය
            </p>
          </div>
          <div className="text-right font-mono tabular-nums shrink-0">
            <p className="text-lg font-extrabold text-[#0D7A5F] dark:text-emerald-400">
              {safeCount}/{SIMULATOR_SCENARIOS.length}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Safe Decisions</p>
          </div>
        </div>

        <HighwayTruckProgress
          percent={pct}
          leftLabel="Safe Decision Mastery Route"
          rightLabel={`${pct}%`}
        />

        {/* Domain Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {DOMAIN_META.map((dom) => {
            const Icon = dom.icon;
            const active = domainFilter === dom.id;
            return (
              <button
                key={dom.id}
                type="button"
                onClick={() => {
                  playFeedbackTone('tap', settings.soundEnabled);
                  setDomainFilter(dom.id);
                  setSelectedChoiceId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-colors whitespace-nowrap min-h-[38px] ${
                  active
                    ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{dom.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Scenario Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filteredList.map((sc, idx) => {
          const active = sc.id === scenario.id;
          const res = progress.simulatorResults?.[sc.id];
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                playFeedbackTone('nav', settings.soundEnabled);
                setActiveId(sc.id);
                setSelectedChoiceId(null);
              }}
              className={`tm-card-press px-3.5 py-2 rounded-xl border text-left shrink-0 transition-colors min-h-[46px] ${
                active
                  ? 'bg-slate-900 dark:bg-sky-500 text-white border-slate-900 dark:border-sky-500'
                  : res?.bestOutcome === 'safe'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="capitalize">{sc.domain}</span>
                <span>#{idx + 1}</span>
                {res?.bestOutcome === 'safe' && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${active ? 'text-emerald-300' : 'text-[#0D7A5F] dark:text-emerald-400'}`}
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-xs font-bold truncate max-w-[170px]">{sc.titleEn}</p>
            </button>
          );
        })}
      </div>

      {/* Main Cab Simulation Panel */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {/* Cab Instrument Telemetry Strip */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-amber-300 capitalize">
                {scenario.domain} Situation · {scenario.chapterId.toUpperCase()} · Textbook p.{scenario.sourcePage}
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                {scenario.titleEn}
              </h2>
              <p className="text-xs text-sky-200 font-sinhala">{scenario.titleSi}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                speakJapanese(scenario.situationJa, {
                  rate: 0.9,
                  voiceURI: settings.preferredJapaneseVoiceURI,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 shrink-0 min-h-[38px]"
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Hear Brief (JP)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/10 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-sky-200">Speed</p>
              <p className="font-mono font-bold text-white mt-0.5">{scenario.telemetry.speedKmh}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-sky-200">Weather</p>
              <p className="font-bold text-white mt-0.5 truncate">{scenario.telemetry.weather}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-sky-200">Vehicle / Load</p>
              <p className="font-bold text-white mt-0.5 truncate">{scenario.telemetry.loadInfo}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-sky-200">Visibility</p>
              <p className="font-bold text-white mt-0.5 truncate">{scenario.telemetry.visibility}</p>
            </div>
          </div>
        </div>

        {/* Interlinear Situation Description: JP+Furigana -> Romaji -> English -> Sinhala */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-base font-semibold text-slate-900 dark:text-white leading-loose">
              <RubyText markup={scenario.situationRuby} showFurigana />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{scenario.situationRomaji}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{scenario.situationEn}</p>
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/60">
              <p className="text-sm font-semibold text-slate-900 dark:text-emerald-100 font-sinhala">
                {scenario.situationSi}
              </p>
            </div>
          </div>

          {/* Decision Options */}
          <div className="space-y-3">
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              What is your decision? · ඔබ ගන්නා තීරණය කුමක්ද?
            </p>
            {scenario.choices.map((ch) => {
              const selected = selectedChoiceId === ch.id;
              const revealed = selectedChoiceId !== null;
              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelectChoice(ch.id)}
                  className={`tm-card-press w-full text-left p-4 rounded-2xl border transition-colors space-y-1.5 ${
                    revealed
                      ? ch.outcome === 'safe'
                        ? 'border-[#0D7A5F] bg-emerald-50/70 dark:bg-emerald-950/35'
                        : selected
                          ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/35'
                          : 'border-slate-200 dark:border-slate-800 opacity-60'
                      : 'border-slate-200 dark:border-slate-700 hover:border-[#0B4F8A] bg-slate-50/60 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-loose">
                      <span className="font-mono uppercase mr-1.5 text-slate-500">{ch.id}.</span>
                      <RubyText markup={ch.ruby} showFurigana />
                    </p>
                    {revealed && ch.outcome === 'safe' && (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0D7A5F] dark:text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        SAFE
                      </span>
                    )}
                    {revealed && selected && ch.outcome !== 'safe' && (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600 dark:text-rose-400 shrink-0">
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                        {ch.outcome === 'danger' ? 'DANGER' : 'RISKY'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{ch.en}</p>
                  <p className="text-xs sm:text-sm font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                    {ch.si}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Outcome Consequence & Textbook Rule Debrief */}
          {chosenObj && (
            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  chosenObj.outcome === 'safe'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/80 dark:bg-rose-950/35 border-rose-300 dark:border-rose-800'
                }`}
              >
                <p
                  className={`text-sm font-extrabold flex items-center gap-1.5 ${
                    chosenObj.outcome === 'safe'
                      ? 'text-[#0D7A5F] dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {chosenObj.outcome === 'safe' ? (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {chosenObj.outcome === 'safe'
                      ? 'Safe Professional Decision (+30 XP)'
                      : 'Unsafe Outcome — Auto-Added to Smart Revision Queue'}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  {chosenObj.consequenceEn}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white font-sinhala">
                  {chosenObj.consequenceSi}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 space-y-1.5">
                <p className="text-xs font-bold text-[#0B4F8A] dark:text-sky-300">
                  JTA Textbook Rule · පෙළපොතේ නීතිය (p.{scenario.sourcePage})
                </p>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  {scenario.textbookRuleEn}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-emerald-100 font-sinhala">
                  {scenario.textbookRuleSi}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedChoiceId(null)}
                  className="tm-card-press min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenStudySection(scenario.chapterId, scenario.sectionId)}
                  className="tm-card-press min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0B4F8A] dark:text-sky-400 inline-flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  <span>Open Lesson</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playFeedbackTone('nav', settings.soundEnabled);
                    setActiveId(nextScenario.id);
                    setSelectedChoiceId(null);
                  }}
                  className="tm-card-press ml-auto min-h-[44px] px-5 py-2 rounded-xl bg-[#0B4F8A] hover:bg-[#083D6B] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <span>Next Scenario</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
