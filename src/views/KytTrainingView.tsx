import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Crosshair,
  Eye,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  XCircle,
} from 'lucide-react';
import { KYT_SCENARIOS, type KytTrainingScenario } from '../data/kytScenarios';
import { playFeedbackTone } from '../lib/sound';
import { speakJapanese } from '../lib/speech';
import { RubyText } from '../components/RubyText';
import { HighwayTruckProgress } from '../components/RewardEffects';
import type { LearnerProgressState, SmartRevisionItem, UserSettings } from '../types/truckmaster';

interface KytTrainingViewProps {
  progress: LearnerProgressState;
  settings: UserSettings;
  onCompleteScenario: (payload: {
    scenarioId: string;
    titleEn: string;
    scorePct: number;
    hotspotsFound: number;
    hotspotsTotal: number;
    missedItem?: Omit<SmartRevisionItem, 'easeFactor' | 'intervalDays' | 'repetitions' | 'dueDate' | 'missCount' | 'addedAt'>;
  }) => void;
  onToggleBookmarkKyt: (scenarioId: string) => void;
  onOpenStudySection: (chapterId: string, sectionId: string) => void;
}

type KytStep = 'spot' | 'danger' | 'countermeasure' | 'explanation';

export function KytTrainingView({
  progress,
  settings,
  onCompleteScenario,
  onToggleBookmarkKyt,
  onOpenStudySection,
}: KytTrainingViewProps) {
  const [selectedId, setSelectedId] = useState<string>(KYT_SCENARIOS[0].id);
  const [step, setStep] = useState<KytStep>('spot');
  const [foundHotspotIds, setFoundHotspotIds] = useState<string[]>([]);
  const [missPulse, setMissPulse] = useState<{ x: number; y: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [dangerChoice, setDangerChoice] = useState<string | null>(null);
  const [counterChoice, setCounterChoice] = useState<string | null>(null);
  const [recordedCurrentRun, setRecordedCurrentRun] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const scenario: KytTrainingScenario = useMemo(
    () => KYT_SCENARIOS.find((s) => s.id === selectedId) || KYT_SCENARIOS[0],
    [selectedId],
  );

  const completedCount = Object.values(progress.kytResults || {}).filter(
    (r) => r.bestScorePct >= 70,
  ).length;
  const kytProgressPct = Math.round((completedCount / KYT_SCENARIOS.length) * 100);
  const isBookmarked = (progress.bookmarkedKytIds || []).includes(scenario.id);

  const resetScene = (nextId?: string) => {
    if (nextId) setSelectedId(nextId);
    setStep('spot');
    setFoundHotspotIds([]);
    setMissPulse(null);
    setShowHint(false);
    setWrongTaps(0);
    setDangerChoice(null);
    setCounterChoice(null);
    setRecordedCurrentRun(false);
    playFeedbackTone('nav', settings.soundEnabled);
  };

  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'spot' || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const tapX = ((e.clientX - rect.left) / rect.width) * 100;
    const tapY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check against visually verified hotspots (generous mobile hit radius)
    const remaining = scenario.hotspots.filter((h) => !foundHotspotIds.includes(h.id));
    let hit = remaining.find((h) => {
      const dist = Math.hypot(tapX - h.x, (tapY - h.y) * (rect.height / rect.width));
      return dist <= Math.max(h.radius, 9.5);
    });

    // Also allow tapping near Euclidean percentage distance for tall/narrow screens
    if (!hit) {
      hit = remaining.find((h) => Math.hypot(tapX - h.x, tapY - h.y) <= Math.max(h.radius + 2, 11));
    }

    if (hit) {
      const nextFound = [...foundHotspotIds, hit.id];
      setFoundHotspotIds(nextFound);
      setMissPulse(null);
      setShowHint(false);
      playFeedbackTone('xp', settings.soundEnabled);
    } else {
      setWrongTaps((w) => w + 1);
      setMissPulse({ x: tapX, y: tapY });
      playFeedbackTone('wrong', settings.soundEnabled);
      window.setTimeout(() => setMissPulse(null), 900);
    }
  };

  const allHotspotsFound = foundHotspotIds.length === scenario.hotspots.length;
  const nextUnfoundHotspot = scenario.hotspots.find((h) => !foundHotspotIds.includes(h.id));

  const finalizeScenario = (chosenCounterId: string) => {
    setCounterChoice(chosenCounterId);
    const dangerRight = dangerChoice === scenario.dangerQuestion.correctId;
    const counterRight = chosenCounterId === scenario.countermeasureQuestion.correctId;
    const hotspotRatio = foundHotspotIds.length / Math.max(1, scenario.hotspots.length);
    const rawScore = Math.round(
      hotspotRatio * 40 + (dangerRight ? 30 : 0) + (counterRight ? 30 : 0) - Math.min(10, wrongTaps * 2),
    );
    const scorePct = Math.max(10, Math.min(100, rawScore));

    playFeedbackTone(scorePct >= 70 ? 'celebrate' : 'tap', settings.soundEnabled);

    if (!recordedCurrentRun) {
      setRecordedCurrentRun(true);
      const correctCounterOpt = scenario.countermeasureQuestion.options.find(
        (o) => o.id === scenario.countermeasureQuestion.correctId,
      );
      onCompleteScenario({
        scenarioId: scenario.id,
        titleEn: scenario.titleEn,
        scorePct,
        hotspotsFound: foundHotspotIds.length,
        hotspotsTotal: scenario.hotspots.length,
        missedItem:
          !dangerRight || !counterRight
            ? {
                id: `rev-kyt-${scenario.id}`,
                kind: 'question',
                refId: scenario.id,
                titleJa: scenario.titleJa,
                titleRuby: scenario.titleRuby,
                romaji: scenario.scenarioBriefRomaji,
                titleEn: scenario.titleEn,
                titleSi: scenario.titleSi,
                answerEn: correctCounterOpt?.en || scenario.explanation.en,
                answerSi: correctCounterOpt?.si || scenario.explanation.si,
                explanationSi: scenario.explanation.si,
                sourceLabel: `KYT Sheet ${scenario.sheetNumber} (p.${scenario.sourcePage})`,
                chapterId: 'ch-04',
                sectionId: scenario.sectionId,
                imageSrc: scenario.imageSrc,
              }
            : undefined,
      });
    }
    setStep('explanation');
  };

  const currentSceneIdx = KYT_SCENARIOS.findIndex((s) => s.id === scenario.id);
  const nextScenario = KYT_SCENARIOS[(currentSceneIdx + 1) % KYT_SCENARIOS.length];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header & Overall KYT Lab Progress */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-amber-700 dark:text-amber-400">
              Chapter 04 · Interactive KYT Hazard Prediction Centre · Visually Verified Hotspots
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              KYT Hazard Training Lab · KYT අනතුරු පුහුණු මධ්‍යස්ථානය
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sinhala mt-1">
              1. KYT රූපය බලන්න → 2–3. අවදානම් ස්ථාන මත Tap කරන්න → 4. අනතුර තෝරන්න → 5. ආරක්ෂිත ක්‍රියාමාර්ගය තෝරන්න → 6–7. පැහැදිලි කිරීම සහ නැවත පුහුණුව
            </p>
          </div>
          <div className="text-right font-mono tabular-nums shrink-0">
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              {completedCount}/{KYT_SCENARIOS.length}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Scenes Mastered</p>
          </div>
        </div>

        <HighwayTruckProgress
          percent={kytProgressPct}
          leftLabel="KYT Hazard Prediction Readiness Route"
          rightLabel={`${kytProgressPct}%`}
        />

        {/* Horizontal Scene Picker Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {KYT_SCENARIOS.map((sc) => {
            const active = sc.id === scenario.id;
            const res = progress.kytResults?.[sc.id];
            const passed = res && res.bestScorePct >= 70;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => resetScene(sc.id)}
                className={`tm-card-press px-3 py-2 rounded-xl border text-left shrink-0 transition-colors min-h-[44px] ${
                  active
                    ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                    : passed
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-slate-900 dark:text-white border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className="font-bold">KYT {String(sc.sheetNumber).padStart(2, '0')}</span>
                  {passed && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${active ? 'text-emerald-300' : 'text-[#0D7A5F] dark:text-emerald-400'}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="text-xs font-semibold truncate max-w-[140px]">
                  {sc.titleEn.replace(/^KYT \d+:\s*/, '')}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 7-Step Flow Indicator */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
        {(
          [
            ['spot', '1–3. Tap Hazards'],
            ['danger', '4. Pick Danger'],
            ['countermeasure', '5. Safe Action'],
            ['explanation', '6–7. Review'],
          ] as const
        ).map(([key, label]) => {
          const active = step === key;
          return (
            <div
              key={key}
              className={`py-2 px-2 rounded-xl border transition-colors ${
                active
                  ? 'bg-slate-900 dark:bg-sky-500 text-white border-slate-900 dark:border-sky-500'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="truncate block">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Interactive KYT Stage + Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Top: Interactive Original KYT Image Canvas */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {scenario.titleEn}
              </p>
              <p className="text-[11px] text-[#0D7A5F] dark:text-emerald-400 font-sinhala truncate">
                {scenario.titleSi} · Textbook p.{scenario.sourcePage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playFeedbackTone('tap', settings.soundEnabled);
                onToggleBookmarkKyt(scenario.id);
              }}
              className={`p-2 rounded-xl border shrink-0 ${
                isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              aria-label="Bookmark KYT scene"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Interactive Tap Container */}
          <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-950">
            <div
              onClick={handleImageTap}
              role="button"
              tabIndex={0}
              aria-label="Tap directly on hazards inside this KYT driving illustration"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowHint(true);
                }
              }}
              className={`relative w-full select-none rounded-xl overflow-hidden border-2 transition-colors ${
                step === 'spot'
                  ? 'border-amber-400 cursor-crosshair'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <img
                ref={imgRef}
                src={scenario.imageSrc}
                alt={scenario.titleEn}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-auto block"
              />

              {/* Found / Revealed Visually Verified Hotspots */}
              {scenario.hotspots.map((h, idx) => {
                const isRevealed = foundHotspotIds.includes(h.id) || step !== 'spot';
                if (!isRevealed) return null;
                return (
                  <div
                    key={h.id}
                    style={{
                      left: `${h.x}%`,
                      top: `${h.y}%`,
                      width: `${Math.max(h.radius * 1.9, 14)}%`,
                      aspectRatio: '1 / 1',
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-3 border-emerald-400 bg-emerald-500/20 flex items-center justify-center pointer-events-none shadow-md"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#0D7A5F] text-white text-xs font-extrabold font-mono flex items-center justify-center shadow">
                      {idx + 1}
                    </span>
                  </div>
                );
              })}

              {/* Optional Hint Guide Ring */}
              {step === 'spot' && showHint && nextUnfoundHotspot && (
                <div
                  style={{
                    left: `${nextUnfoundHotspot.x}%`,
                    top: `${nextUnfoundHotspot.y}%`,
                    width: `${Math.max(nextUnfoundHotspot.radius * 2.2, 18)}%`,
                    aspectRatio: '1 / 1',
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-400 bg-amber-400/15 pointer-events-none"
                />
              )}

              {/* Missed Tap Ripple */}
              {missPulse && (
                <div
                  style={{ left: `${missPulse.x}%`, top: `${missPulse.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-rose-500 bg-rose-500/25 pointer-events-none flex items-center justify-center"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
              )}
            </div>
          </div>

          {/* Interlinear Scenario Brief under Image */}
          <div className="p-4 space-y-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#0B4F8A] dark:text-sky-400">
                Scenario Brief · දර්ශන විස්තරය
              </span>
              <button
                type="button"
                onClick={() =>
                  speakJapanese(scenario.scenarioBriefJa, {
                    rate: 0.9,
                    voiceURI: settings.preferredJapaneseVoiceURI,
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0B4F8A]"
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Listen JP</span>
              </button>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-loose">
              <RubyText markup={scenario.scenarioBriefRuby} showFurigana />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{scenario.scenarioBriefRomaji}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{scenario.scenarioBriefEn}</p>
            <p className="text-sm font-medium text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
              {scenario.scenarioBriefSi}
            </p>
          </div>
        </section>

        {/* Right / Bottom: Interactive Step Deck */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          {step === 'spot' && (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    <span>Tap {scenario.hotspots.length} Hazard Spots</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-sinhala mt-0.5">
                    රූපය මත අනතුරු අවදානම් ඇති ස්ථාන {scenario.hotspots.length} මත කෙළින්ම Tap කරන්න. (පැති කණ්ණාඩිද පරීක්ෂා කරන්න!)
                  </p>
                </div>
                <span className="font-mono font-extrabold text-sm tabular-nums text-[#0D7A5F] dark:text-emerald-400 shrink-0">
                  {foundHotspotIds.length}/{scenario.hotspots.length}
                </span>
              </div>

              {/* Checklist of Hotspots */}
              <div className="space-y-2">
                {scenario.hotspots.map((h, idx) => {
                  const found = foundHotspotIds.includes(h.id);
                  return (
                    <div
                      key={h.id}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        found
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                            found
                              ? 'bg-[#0D7A5F] text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        {found ? (
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {h.labelJa} · {h.labelEn}
                            </p>
                            <p className="text-[#0D7A5F] dark:text-emerald-400 font-sinhala font-medium">
                              {h.labelSi}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400 font-sinhala">
                            අවදානම් ස්ථානය #{idx + 1} — රූපය මත Tap කර හඳුනාගන්න
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showHint && nextUnfoundHotspot && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-sinhala">
                  <strong>ඉඟිය (Hint):</strong> {nextUnfoundHotspot.hintSi}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {!allHotspotsFound && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        playFeedbackTone('tap', settings.soundEnabled);
                        setShowHint(true);
                      }}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <HelpCircle className="w-4 h-4" aria-hidden="true" />
                      <span>Show Hint (ඉඟිය)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFoundHotspotIds(scenario.hotspots.map((h) => h.id));
                        playFeedbackTone('tap', settings.soundEnabled);
                      }}
                      className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      <span>Reveal All</span>
                    </button>
                  </>
                )}

                {allHotspotsFound && (
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackTone('nav', settings.soundEnabled);
                      setStep('danger');
                    }}
                    className="tm-card-press w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0B4F8A] hover:bg-[#083D6B] text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                  >
                    <span>Step 4: Select Potential Danger</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          )}

          {step === 'danger' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span>Step 4 · Predict the Hazard</span>
                </p>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {scenario.dangerQuestion.promptEn}
                </h2>
                <p className="text-sm font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala mt-0.5">
                  {scenario.dangerQuestion.promptSi}
                </p>
              </div>

              <div className="space-y-2.5">
                {scenario.dangerQuestion.options.map((opt) => {
                  const selected = dangerChoice === opt.id;
                  const isCorrect = opt.id === scenario.dangerQuestion.correctId;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={dangerChoice !== null}
                      onClick={() => {
                        setDangerChoice(opt.id);
                        playFeedbackTone(isCorrect ? 'success' : 'wrong', settings.soundEnabled);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors space-y-1 ${
                        dangerChoice !== null
                          ? isCorrect
                            ? 'border-[#0D7A5F] bg-emerald-50/70 dark:bg-emerald-950/35'
                            : selected
                              ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/35'
                              : 'border-slate-200 dark:border-slate-800 opacity-65'
                          : 'border-slate-200 dark:border-slate-700 hover:border-[#0B4F8A] bg-slate-50/60 dark:bg-slate-800/40'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                        <RubyText markup={opt.ruby} showFurigana />
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{opt.en}</p>
                      <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                        {opt.si}
                      </p>
                    </button>
                  );
                })}
              </div>

              {dangerChoice !== null && (
                <button
                  type="button"
                  onClick={() => {
                    playFeedbackTone('nav', settings.soundEnabled);
                    setStep('countermeasure');
                  }}
                  className="tm-card-press w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0B4F8A] text-white text-sm font-bold inline-flex items-center justify-center gap-2"
                >
                  <span>Step 5: Choose Safe Action</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {step === 'countermeasure' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-[#0D7A5F] dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Step 5 · Safe Countermeasure</span>
                </p>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                  {scenario.countermeasureQuestion.promptEn}
                </h2>
                <p className="text-sm font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala mt-0.5">
                  {scenario.countermeasureQuestion.promptSi}
                </p>
              </div>

              <div className="space-y-2.5">
                {scenario.countermeasureQuestion.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => finalizeScenario(opt.id)}
                    className="tm-card-press w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0D7A5F] bg-slate-50/60 dark:bg-slate-800/40 space-y-1 transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                      <RubyText markup={opt.ruby} showFurigana />
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{opt.en}</p>
                    <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                      {opt.si}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'explanation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#0D7A5F] dark:text-emerald-400">
                  <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                  <span>Step 6 · Textbook &amp; Sinhala Explanation</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    speakJapanese(scenario.explanation.ja, {
                      rate: 0.88,
                      voiceURI: settings.preferredJapaneseVoiceURI,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Audio</span>
                </button>
              </div>

              {/* Result Verdict Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-slate-500 dark:text-slate-400">Danger Step</p>
                  <p
                    className={`font-bold mt-0.5 ${
                      dangerChoice === scenario.dangerQuestion.correctId
                        ? 'text-[#0D7A5F] dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {dangerChoice === scenario.dangerQuestion.correctId ? 'Correct' : 'Added to Revision'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-slate-500 dark:text-slate-400">Safe Action Step</p>
                  <p
                    className={`font-bold mt-0.5 ${
                      counterChoice === scenario.countermeasureQuestion.correctId
                        ? 'text-[#0D7A5F] dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {counterChoice === scenario.countermeasureQuestion.correctId
                      ? 'Correct'
                      : 'Added to Revision'}
                  </p>
                </div>
              </div>

              {/* Interlinear Textbook Explanation: JP+Furigana -> Romaji -> English -> Sinhala */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-loose">
                  <RubyText markup={scenario.explanation.ruby} showFurigana />
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {scenario.explanation.romaji}
                </p>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {scenario.explanation.en}
                </p>
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-emerald-100 font-sinhala leading-relaxed">
                    {scenario.explanation.si}
                  </p>
                </div>
              </div>

              {/* Step 7: Practice Same Image Again + Next Scene + Open Full Textbook Sheet */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => resetScene(scenario.id)}
                  className="tm-card-press flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Practice Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => resetScene(nextScenario.id)}
                  className="tm-card-press flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#0B4F8A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <span>Next KYT Scene</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenStudySection('ch-04', scenario.sectionId)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold text-[#0B4F8A] dark:text-sky-400 hover:underline inline-flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Original Textbook Sheet (p.{scenario.sourcePage})</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
