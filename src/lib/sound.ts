let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  return audioCtx;
}

export function playFeedbackTone(kind: 'tap' | 'success' | 'celebrate', enabled: boolean) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const notes =
      kind === 'celebrate' ? [523.25, 659.25, 783.99] : kind === 'success' ? [523.25, 659.25] : [440];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.06, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.16);
    });
  } catch {
    // Ignore autoplay restrictions safely
  }
}
