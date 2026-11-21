import { Award, Sparkles, Trophy, Truck, X } from 'lucide-react';
import type { TrophyDefinition } from '../lib/gamification';

export interface XpToastItem {
  id: string;
  xp: number;
  label: string;
}

export function XpToastStack({ toasts }: { toasts: XpToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed top-16 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="tm-xp-toast flex items-center gap-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 shadow-xl border border-amber-400/40"
        >
          <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
            +{toast.xp}
          </span>
          <div className="text-left">
            <p className="text-xs font-bold leading-tight text-amber-300">EXP Earned</p>
            <p className="text-xs text-slate-200 max-w-[220px] truncate">{toast.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const CONFETTI_COLORS = ['#F59E0B', '#0B4F8A', '#0D7A5F', '#38BDF8', '#FB7185', '#FACC15'];

export function TrophyUnlockModal({
  trophy,
  onClose,
}: {
  trophy: TrophyDefinition | null;
  onClose: () => void;
}) {
  if (!trophy) return null;

  const tierStyles: Record<TrophyDefinition['tier'], string> = {
    bronze: 'from-amber-700 to-amber-500 text-white',
    silver: 'from-slate-500 to-slate-300 text-slate-950',
    gold: 'from-amber-500 to-yellow-300 text-slate-950',
    platinum: 'from-sky-500 to-indigo-500 text-white',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Trophy unlocked"
      onClick={onClose}
    >
      <div
        className="tm-modal-pop relative overflow-hidden w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-amber-300/60 dark:border-amber-500/40 p-6 text-center space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti burst */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="tm-confetti-piece absolute top-0 w-2 h-3 rounded-xs"
              style={{
                left: `${6 + i * 6.8}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 5) * 90}ms`,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close celebration"
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br ${tierStyles[trophy.tier]} flex items-center justify-center shadow-lg`}
        >
          <Trophy className="w-10 h-10" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Trophy Unlocked!</span>
          </p>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {trophy.titleEn}
          </h2>
          <p className="text-sm font-semibold text-[#0B4F8A] dark:text-sky-400 font-sinhala">
            {trophy.titleSi}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">{trophy.descEn}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] rounded-2xl bg-[#0B4F8A] hover:bg-[#083D6B] text-white text-sm font-bold transition-colors tm-card-press"
        >
          Keep Driving!
        </button>
      </div>
    </div>
  );
}

/**
 * Animated Truck Route Progress Bar — moves a cargo truck along a Japanese highway strip.
 */
export function HighwayTruckProgress({
  percent,
  leftLabel,
  rightLabel,
}: {
  percent: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="space-y-1.5">
      {(leftLabel || rightLabel) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>{leftLabel}</span>
          <span className="font-mono font-bold tabular-nums text-[#0B4F8A] dark:text-sky-400">
            {rightLabel}
          </span>
        </div>
      )}
      <div className="relative h-7 rounded-xl bg-slate-800 dark:bg-slate-950 border border-slate-700 overflow-hidden flex items-center px-2">
        {/* Completed highway glow */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0B4F8A] via-sky-600 to-[#0D7A5F] transition-all duration-500"
          style={{ width: `${Math.max(clamped, 6)}%` }}
        />
        {/* Animated center road dashes */}
        <div className="tm-road-stripes absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] opacity-60" />
        {/* Moving truck icon */}
        <div
          className="relative z-10 flex items-center justify-center w-6 h-5 rounded-md bg-amber-400 text-slate-950 shadow transition-all duration-500"
          style={{ marginLeft: `calc(${Math.min(clamped, 92)}% - ${clamped > 10 ? 12 : 0}px)` }}
          aria-hidden="true"
        >
          <Truck className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

export function TrophyBadgeIcon({
  tier,
  unlocked,
}: {
  tier: TrophyDefinition['tier'];
  unlocked: boolean;
}) {
  if (!unlocked) {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 flex items-center justify-center shrink-0">
        <Award className="w-5 h-5" aria-hidden="true" />
      </div>
    );
  }
  const styles: Record<TrophyDefinition['tier'], string> = {
    bronze: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    silver: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100',
    gold: 'bg-yellow-100 dark:bg-yellow-900/40 text-amber-600 dark:text-yellow-300',
    platinum: 'bg-sky-100 dark:bg-sky-900/50 text-[#0B4F8A] dark:text-sky-300',
  };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles[tier]}`}>
      <Trophy className="w-5 h-5" aria-hidden="true" />
    </div>
  );
}
