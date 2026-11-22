import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  Radio,
  Repeat,
  RotateCcw,
  Volume2,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { loadVocabulary } from '../lib/contentLoader';
import { playFeedbackTone } from '../lib/sound';
import {
  speakJapanese,
  stopJapaneseSpeech,
  subscribeToVoices,
  type SpeechSupportInfo,
} from '../lib/speech';
import { RubyText } from '../components/RubyText';
import type {
  LearnerProgressState,
  SmartRevisionItem,
  UserSettings,
  VocabItem,
} from '../types/truckmaster';

interface AudioLabViewProps {
  progress: LearnerProgressState;
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  onRecordAudioDrill: (payload: {
    mode: 'listening' | 'vocab-rec';
    correct: boolean;
    label: string;
    missedVocab?: Omit<
      SmartRevisionItem,
      'easeFactor' | 'intervalDays' | 'repetitions' | 'dueDate' | 'missCount' | 'addedAt'
    >;
  }) => void;
}

const SAMPLE_TEST_SENTENCE = {
  ja: '出発前に日常点検と点呼を必ず実施し、安全運転を心がけます。',
  ruby: '[出発前|しゅっぱつまえ]に[日常点検|にちじょうてんけん]と[点呼|てんこ]を[必|かなら]ず[実施|じっし]し、[安全運転|あんぜんうんてん]を[心|こころ]がけます。',
  romaji: 'Shuppatsu-mae ni nichijō tenken to tenko o kanarazu jisshi shi, anzen unten o kokorogakemasu.',
  en: 'Before departure, I always perform daily inspection and roll call, and commit to safe driving.',
  si: 'පිටත් වීමට පෙර දෛනික පරීක්ෂාව සහ රෝල් ඇමතුම (点呼) අනිවාර්යයෙන් සිදු කර ආරක්ෂිත රිය පැදවීමට කැපවෙමි.',
};

function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function AudioLabView({
  progress,
  settings,
  onUpdateSettings,
  onRecordAudioDrill,
}: AudioLabViewProps) {
  const [tab, setTab] = useState<'voice' | 'listening' | 'vocab'>('listening');
  const [speechInfo, setSpeechInfo] = useState<SpeechSupportInfo | null>(null);
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [speedMode, setSpeedMode] = useState<'normal' | 'slow'>(
    settings.ttsRate < 0.85 ? 'slow' : 'normal',
  );
  const [repeatLoop, setRepeatLoop] = useState<1 | 2 | 3>(1);
  const [speakingStatus, setSpeakingStatus] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Listening & Audio Vocab Drill state
  const [drillIndex, setDrillIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToVoices((info) => setSpeechInfo(info));
    loadVocabulary()
      .then((list) => {
        setVocabList(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      unsub();
      stopJapaneseSpeech();
    };
  }, []);

  const currentRate = speedMode === 'slow' ? 0.68 : 0.96;

  const activeVoiceURI =
    settings.preferredJapaneseVoiceURI || speechInfo?.recommendedVoiceURI || '';

  const playText = (text: string, customRepeat?: number) => {
    setSpeechError(null);
    speakJapanese(text, {
      rate: currentRate,
      repeatCount: customRepeat ?? repeatLoop,
      voiceURI: activeVoiceURI,
      onStart: () => setSpeakingStatus('Playing Japanese audio...'),
      onEnd: () => setSpeakingStatus(null),
      onError: (err) => {
        setSpeakingStatus(null);
        setSpeechError(err);
      },
    });
  };

  // Build listening & audio-recognition items from real vocabulary.json
  const listeningItems = useMemo(
    () => vocabList.filter((v) => v.exampleJa && v.exampleSi && v.exampleEn),
    [vocabList],
  );

  const activePool = tab === 'listening' ? listeningItems : vocabList;
  const currentItem = activePool.length > 0 ? activePool[drillIndex % activePool.length] : null;

  const options = useMemo(() => {
    if (!currentItem || activePool.length < 4) return [];
    const distractors = deterministicShuffle(
      activePool.filter((v) => v.id !== currentItem.id),
      drillIndex * 31 + (tab === 'listening' ? 7 : 19),
    ).slice(0, 3);
    return deterministicShuffle([currentItem, ...distractors], drillIndex * 17 + 5);
  }, [activePool, currentItem, drillIndex, tab]);

  const handleSelectDrillOption = (opt: VocabItem) => {
    if (!currentItem || selectedOptId !== null) return;
    setSelectedOptId(opt.id);
    const correct = opt.id === currentItem.id;
    playFeedbackTone(correct ? 'success' : 'wrong', settings.soundEnabled);

    onRecordAudioDrill({
      mode: tab === 'listening' ? 'listening' : 'vocab-rec',
      correct,
      label: currentItem.japanese,
      missedVocab: !correct
        ? {
            id: `rev-vocab-${currentItem.id}`,
            kind: 'vocab',
            refId: currentItem.id,
            titleJa: currentItem.japanese,
            titleRuby: `[${currentItem.japanese}|${currentItem.furigana}]`,
            romaji: currentItem.romaji,
            titleEn: currentItem.english,
            titleSi: currentItem.sinhala,
            answerEn: `${currentItem.english} (${currentItem.romaji})`,
            answerSi: currentItem.sinhala,
            explanationSi: currentItem.exampleSi,
            sourceLabel: `Audio Drill · ${currentItem.chapterId.toUpperCase()} p.${currentItem.sourcePage}`,
            chapterId: currentItem.chapterId,
          }
        : undefined,
    });
  };

  const nextDrill = () => {
    stopJapaneseSpeech();
    setSelectedOptId(null);
    setShowTranscript(false);
    setDrillIndex((i) => i + 1);
    playFeedbackTone('nav', settings.soundEnabled);
  };

  const audioVocabPct =
    (progress.audioVocabTotal || 0) > 0
      ? Math.round(((progress.audioVocabCorrect || 0) / Math.max(1, progress.audioVocabTotal)) * 100)
      : null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Studio Header & Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-[#0B4F8A] dark:text-sky-400">
              Japanese TTS · Furigana Playback · Listening Practice · Audio Recognition
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              Smart Audio &amp; Pronunciation Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sinhala mt-0.5">
              ජපන් උච්චාරණය, Slow/Normal වේගය, වාක්‍ය නැවත ඇසීම සහ ශ්‍රවණ පුහුණු මධ්‍යස්ථානය
            </p>
          </div>
          <div className="text-right font-mono tabular-nums text-xs shrink-0">
            <p className="font-bold text-slate-900 dark:text-white">
              Listening: {progress.audioListeningCompleted || 0}
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Vocab Audio: {audioVocabPct !== null ? `${audioVocabPct}%` : '—'}
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(
            [
              ['listening', 'Listening Practice'],
              ['vocab', 'Audio Vocab Quiz'],
              ['voice', 'Voice & Offline Test'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                stopJapaneseSpeech();
                setTab(id);
                setSelectedOptId(null);
                setShowTranscript(false);
                playFeedbackTone('tap', settings.soundEnabled);
              }}
              className={`py-2 px-2.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap truncate min-h-[38px] ${
                tab === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Shared Speed & Repeat Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Speed:</span>
            <button
              type="button"
              onClick={() => {
                setSpeedMode('slow');
                onUpdateSettings({ ...settings, ttsRate: 0.68 });
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border min-h-[34px] ${
                speedMode === 'slow'
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Slow (0.7x)
            </button>
            <button
              type="button"
              onClick={() => {
                setSpeedMode('normal');
                onUpdateSettings({ ...settings, ttsRate: 0.96 });
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border min-h-[34px] ${
                speedMode === 'normal'
                  ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Normal (1.0x)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Repeat:</span>
            {([1, 2, 3] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setRepeatLoop(cnt)}
                className={`px-2.5 py-1.5 text-xs font-bold font-mono rounded-lg border min-h-[34px] ${
                  repeatLoop === cnt
                    ? 'bg-[#0D7A5F] text-white border-[#0D7A5F]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cnt}x
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Voice Availability Warning if No Japanese Voice Found */}
      {speechInfo && speechInfo.japaneseVoices.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>No Native Japanese (ja-JP) TTS Voice Detected on This Device</span>
          </p>
          <p className="font-sinhala">
            මෙම උපාංගයේ Offline ජපන් හඬ පැකේජය ස්ථාපනය කර නොමැත. Android/Windows/iOS Settings → Text-to-Speech හි Japanese (日本語) offline voice බාගත කළ විට ස්වභාවික ජපන් උච්චාරණය අන්තර්ජාලය නොමැතිවම ක්‍රියා කරයි.
          </p>
        </div>
      )}

      {/* TAB 1: Voice Availability Diagnostics & Offline Test */}
      {tab === 'voice' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0B4F8A] dark:text-sky-400" aria-hidden="true" />
                <span>Device Japanese Voice Diagnostic</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browser speech synthesis varies by OS — test offline ja-JP voice availability below.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0D7A5F] dark:text-emerald-400">
              {speechInfo?.japaneseVoices.length || 0} Japanese voice(s) found
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-slate-500 dark:text-slate-400">Web Speech API</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {speechInfo?.supported ? 'Supported' : 'Not Supported'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-slate-500 dark:text-slate-400">Japanese Voices (ja-JP)</p>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {speechInfo?.japaneseVoices.length || 0} Installed
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <p className="text-slate-500 dark:text-slate-400">Offline Local Voice</p>
              <p
                className={`text-sm font-extrabold mt-0.5 ${
                  speechInfo?.hasOfflineJapanese
                    ? 'text-[#0D7A5F] dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {speechInfo?.hasOfflineJapanese ? 'Offline Ready' : 'Requires OS Pack / Network'}
              </p>
            </div>
          </div>

          {/* Voice Selector */}
          {speechInfo && speechInfo.japaneseVoices.length > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="jp-voice-select"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 block"
              >
                Preferred Japanese Voice
              </label>
              <select
                id="jp-voice-select"
                value={activeVoiceURI}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, preferredJapaneseVoiceURI: e.target.value })
                }
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {speechInfo.japaneseVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}) — {v.localService ? 'Offline Local' : 'Cloud Voice'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Test Sentence Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <p className="text-xs font-bold text-[#0B4F8A] dark:text-sky-400">
              Sample SSW Safety Pledge — Voice Test
            </p>
            <p className="text-base font-semibold text-slate-900 dark:text-white leading-loose">
              <RubyText markup={SAMPLE_TEST_SENTENCE.ruby} showFurigana />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{SAMPLE_TEST_SENTENCE.romaji}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{SAMPLE_TEST_SENTENCE.en}</p>
            <p className="text-sm font-medium text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
              {SAMPLE_TEST_SENTENCE.si}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => playText(SAMPLE_TEST_SENTENCE.ja)}
                className="tm-card-press min-h-[44px] px-4 py-2 rounded-xl bg-[#0B4F8A] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>Test Playback ({speedMode === 'slow' ? '0.7x' : '1.0x'} · {repeatLoop}x)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopJapaneseSpeech();
                  setSpeakingStatus(null);
                }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Stop
              </button>
            </div>
            {speakingStatus && (
              <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400">{speakingStatus}</p>
            )}
            {speechError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{speechError}</p>
            )}
          </div>
        </section>
      )}

      {/* TAB 2 & 3: Japanese Listening Practice & Audio-Based Vocabulary Recognition */}
      {(tab === 'listening' || tab === 'vocab') && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          {loading || !currentItem ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading Japanese audio deck...</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono tabular-nums">
                  {tab === 'listening' ? 'Listening Sentence' : 'Audio Vocabulary Recognition'} #
                  {(drillIndex % activePool.length) + 1} / {activePool.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0B4F8A] dark:text-sky-400 hover:underline"
                >
                  {showTranscript ? (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{showTranscript ? 'Hide Japanese Text' : 'Peek Japanese + Furigana'}</span>
                </button>
              </div>

              {/* Audio Player Centerpiece */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0B4F8A] text-white text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white/15 flex items-center justify-center">
                  <Headphones className="w-7 h-7 text-amber-300" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {tab === 'listening'
                      ? 'Listen to the Japanese trucking sentence and choose its meaning'
                      : 'Listen to the Japanese term and recognize its exact meaning'}
                  </p>
                  <p className="text-xs text-sky-200 font-sinhala">
                    {tab === 'listening'
                      ? 'ජපන් වාක්‍යය අසා එහි නිවැරදි සිංහල/ඉංග්‍රීසි අර්ථය තෝරන්න'
                      : 'ජපන් වචනය අසා නිවැරදි අර්ථය හඳුනාගන්න'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      playText(tab === 'listening' ? currentItem.exampleJa : currentItem.japanese)
                    }
                    className="tm-card-press min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold inline-flex items-center gap-2"
                  >
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                    <span>Play Audio ({speedMode === 'slow' ? '0.7x' : '1.0x'})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      playText(tab === 'listening' ? currentItem.exampleJa : currentItem.japanese, 2)
                    }
                    className="tm-card-press min-h-[46px] px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 border border-white/20"
                  >
                    <Repeat className="w-4 h-4" aria-hidden="true" />
                    <span>Repeat 2x</span>
                  </button>
                </div>

                {(showTranscript || selectedOptId !== null) && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-950/50 border border-white/15 space-y-1 text-left">
                    <p className="text-base font-bold text-white leading-loose">
                      {tab === 'listening' ? (
                        <RubyText markup={currentItem.exampleRuby || currentItem.exampleJa} showFurigana />
                      ) : (
                        <>
                          {currentItem.japanese}{' '}
                          <span className="text-sky-200 text-sm">({currentItem.furigana})</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-sky-200">{currentItem.romaji}</p>
                  </div>
                )}
              </div>

              {/* 4 Meaning Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt) => {
                  const chosen = selectedOptId === opt.id;
                  const isRight = opt.id === currentItem.id;
                  const revealed = selectedOptId !== null;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => handleSelectDrillOption(opt)}
                      className={`tm-card-press text-left p-4 rounded-2xl border transition-colors space-y-1 min-h-[72px] ${
                        revealed
                          ? isRight
                            ? 'border-[#0D7A5F] bg-emerald-50/75 dark:bg-emerald-950/35'
                            : chosen
                              ? 'border-rose-500 bg-rose-50/75 dark:bg-rose-950/35'
                              : 'border-slate-200 dark:border-slate-800 opacity-55'
                          : 'border-slate-200 dark:border-slate-700 hover:border-[#0B4F8A] bg-slate-50/60 dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {tab === 'listening' ? opt.exampleEn : opt.english}
                        </p>
                        {revealed && isRight && (
                          <CheckCircle2 className="w-4 h-4 text-[#0D7A5F] dark:text-emerald-400 shrink-0" />
                        )}
                        {revealed && chosen && !isRight && (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-[#0D7A5F] dark:text-emerald-400 font-sinhala">
                        {tab === 'listening' ? opt.exampleSi : opt.sinhala}
                      </p>
                      {revealed && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {opt.japanese} ({opt.furigana}) · {opt.romaji}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOptId !== null && (
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {selectedOptId === currentItem.id
                      ? 'Correct! (+10 XP)'
                      : 'Saved automatically to your Smart Revision Queue for spaced repetition.'}
                  </p>
                  <button
                    type="button"
                    onClick={nextDrill}
                    className="tm-card-press min-h-[44px] px-5 py-2 rounded-xl bg-[#0B4F8A] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Next Audio Drill</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
