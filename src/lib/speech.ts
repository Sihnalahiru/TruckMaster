export interface JapaneseVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  isJapanese: boolean;
}

export interface SpeechSupportInfo {
  supported: boolean;
  voices: JapaneseVoiceOption[];
  japaneseVoices: JapaneseVoiceOption[];
  hasOfflineJapanese: boolean;
  recommendedVoiceURI: string;
}

/**
 * Strips custom ruby markup `[漢字|かんじ]` into clean natural Japanese `漢字`
 * or pure kana reading `かんじ` depending on mode.
 */
export function stripRubyMarkup(markup: string, preferFuriganaReading = false): string {
  if (!markup) return '';
  return markup
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, (_, base: string, reading: string) =>
      preferFuriganaReading ? reading : base,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSpeechSupportInfo(): SpeechSupportInfo {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      supported: false,
      voices: [],
      japaneseVoices: [],
      hasOfflineJapanese: false,
      recommendedVoiceURI: '',
    };
  }

  const raw = window.speechSynthesis.getVoices() || [];
  const voices: JapaneseVoiceOption[] = raw.map((v) => ({
    voiceURI: v.voiceURI,
    name: v.name,
    lang: v.lang,
    localService: Boolean(v.localService),
    isJapanese: /^ja([-_]|$)/i.test(v.lang) || /japan|kyoko|otoya|haruka|ayumi|nanami|keita/i.test(v.name),
  }));

  const japaneseVoices = voices
    .filter((v) => v.isJapanese)
    .sort((a, b) => Number(b.localService) - Number(a.localService));

  return {
    supported: true,
    voices,
    japaneseVoices,
    hasOfflineJapanese: japaneseVoices.some((v) => v.localService),
    recommendedVoiceURI: japaneseVoices[0]?.voiceURI || '',
  };
}

export function subscribeToVoices(callback: (info: SpeechSupportInfo) => void): () => void {
  callback(getSpeechSupportInfo());
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => {};
  }
  const handler = () => callback(getSpeechSupportInfo());
  window.speechSynthesis.addEventListener?.('voiceschanged', handler);
  // Fallback delayed check for browsers that populate voices asynchronously without firing event
  const timer = window.setTimeout(handler, 450);
  return () => {
    window.clearTimeout(timer);
    window.speechSynthesis.removeEventListener?.('voiceschanged', handler);
  };
}

let activeRepeatTimer: number | null = null;

export function stopJapaneseSpeech(): void {
  if (activeRepeatTimer !== null) {
    window.clearTimeout(activeRepeatTimer);
    activeRepeatTimer = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore speech cancel errors
    }
  }
}

export interface SpeakJapaneseOptions {
  rate?: number; // 0.65 - 1.2
  voiceURI?: string;
  repeatCount?: number; // 1 = once, 2 or 3 = loop
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (reason: string) => void;
}

export function speakJapanese(text: string, options: SpeakJapaneseOptions = {}): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.('Speech synthesis is not supported on this browser.');
    return false;
  }

  const clean = stripRubyMarkup(text, false);
  if (!clean) return false;

  stopJapaneseSpeech();

  const rate = Math.max(0.55, Math.min(1.25, options.rate ?? 0.95));
  const totalPlays = Math.max(1, Math.min(5, options.repeatCount ?? 1));
  const rawVoices = window.speechSynthesis.getVoices() || [];

  let chosenVoice: SpeechSynthesisVoice | undefined;
  if (options.voiceURI) {
    chosenVoice = rawVoices.find((v) => v.voiceURI === options.voiceURI);
  }
  if (!chosenVoice) {
    const jaVoices = rawVoices.filter((v) => /^ja([-_]|$)/i.test(v.lang));
    chosenVoice = jaVoices.find((v) => v.localService) || jaVoices[0];
  }

  let playsRemaining = totalPlays;

  const speakOnce = () => {
    try {
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'ja-JP';
      utter.rate = rate;
      utter.pitch = 1.0;
      if (chosenVoice) {
        utter.voice = chosenVoice;
      }
      if (playsRemaining === totalPlays) {
        utter.onstart = () => options.onStart?.();
      }
      utter.onend = () => {
        playsRemaining -= 1;
        if (playsRemaining > 0) {
          activeRepeatTimer = window.setTimeout(() => {
            speakOnce();
          }, 420);
        } else {
          options.onEnd?.();
        }
      };
      utter.onerror = (ev) => {
        if (ev.error === 'interrupted' || ev.error === 'canceled') return;
        options.onError?.(`Playback unavailable (${ev.error || 'device voice error'}).`);
      };
      window.speechSynthesis.speak(utter);
    } catch {
      options.onError?.('Unable to trigger speech playback on this device.');
    }
  };

  speakOnce();
  return true;
}
