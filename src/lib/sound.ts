let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  return audioCtx;
}

export type SoundKind = 'tap' | 'nav' | 'xp' | 'success' | 'wrong' | 'trophy' | 'celebrate' | 'notify';

interface ToneStep {
  freq: number;
  delay: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
}

const SOUND_PATTERNS: Record<SoundKind, ToneStep[]> = {
  tap: [{ freq: 520, delay: 0, duration: 0.06, gain: 0.04, type: 'triangle' }],
  nav: [{ freq: 390, delay: 0, duration: 0.055, gain: 0.03, type: 'sine' }],
  xp: [
    { freq: 659.25, delay: 0, duration: 0.09, gain: 0.055, type: 'sine' },
    { freq: 987.77, delay: 0.07, duration: 0.14, gain: 0.06, type: 'sine' },
  ],
  success: [
    { freq: 523.25, delay: 0, duration: 0.11, gain: 0.06, type: 'sine' },
    { freq: 659.25, delay: 0.08, duration: 0.15, gain: 0.06, type: 'sine' },
  ],
  wrong: [
    { freq: 240, delay: 0, duration: 0.11, gain: 0.06, type: 'triangle' },
    { freq: 196, delay: 0.09, duration: 0.14, gain: 0.05, type: 'triangle' },
  ],
  trophy: [
    { freq: 523.25, delay: 0, duration: 0.11, gain: 0.065, type: 'triangle' },
    { freq: 659.25, delay: 0.09, duration: 0.11, gain: 0.065, type: 'triangle' },
    { freq: 783.99, delay: 0.18, duration: 0.12, gain: 0.07, type: 'triangle' },
    { freq: 1046.5, delay: 0.28, duration: 0.26, gain: 0.075, type: 'sine' },
  ],
  celebrate: [
    { freq: 523.25, delay: 0, duration: 0.12, gain: 0.06, type: 'sine' },
    { freq: 659.25, delay: 0.08, duration: 0.12, gain: 0.06, type: 'sine' },
    { freq: 783.99, delay: 0.16, duration: 0.14, gain: 0.065, type: 'sine' },
    { freq: 1046.5, delay: 0.25, duration: 0.28, gain: 0.07, type: 'sine' },
  ],
  notify: [
    { freq: 783.99, delay: 0, duration: 0.14, gain: 0.055, type: 'sine' },
    { freq: 659.25, delay: 0.15, duration: 0.18, gain: 0.05, type: 'sine' },
  ],
};

export function playFeedbackTone(kind: SoundKind, enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const steps = SOUND_PATTERNS[kind] || SOUND_PATTERNS.tap;
    steps.forEach((step) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.type || 'sine';
      osc.frequency.setValueAtTime(step.freq, now + step.delay);
      gain.gain.setValueAtTime(step.gain, now + step.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + step.delay + step.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + step.delay);
      osc.stop(now + step.delay + step.duration + 0.02);
    });
  } catch {
    // Ignore autoplay restrictions safely
  }
}
