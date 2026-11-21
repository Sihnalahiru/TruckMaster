import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { PWAInstallButton } from '../components/PWAControls';
import type {
  LearnerProgressState,
  ThemeMode,
  UserSettings,
} from '../types/truckmaster';

interface SettingsViewProps {
  settings: UserSettings;
  progress: LearnerProgressState;
  onUpdateSettings: (next: UserSettings) => void;
  onRestoreBackup: (payload: { settings?: UserSettings; progress?: LearnerProgressState }) => void;
}

export function SettingsView({
  settings,
  progress,
  onUpdateSettings,
  onRestoreBackup,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleExportBackup = () => {
    const bundle = {
      app: 'TruckMaster',
      exportedAt: new Date().toISOString(),
      settings,
      progress,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truckmaster-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Backup JSON exported successfully.');
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
        onRestoreBackup({ settings: parsed.settings, progress: parsed.progress });
        setStatusMessage('Backup restored successfully.');
      } catch {
        setStatusMessage('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Settings &amp; Study Preferences
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            All preferences persist offline in IndexedDB and localStorage.
          </p>
        </div>

        {/* Profile */}
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <label htmlFor="learner-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Learner Display Name
          </label>
          <input
            id="learner-name"
            type="text"
            value={settings.learnerName}
            onChange={(e) => onUpdateSettings({ ...settings, learnerName: e.target.value })}
            className="w-full max-w-sm min-h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        {/* Theme Switch */}
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Appearance Theme</p>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, theme: mode })}
                className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize min-h-[38px] ${
                  settings.theme === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Font Scale */}
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Font Scaling (English, Japanese &amp; Sinhala)
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { val: 0.9, label: '90%' },
              { val: 1, label: '100% (Default)' },
              { val: 1.1, label: '110%' },
              { val: 1.2, label: '120%' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onUpdateSettings({ ...settings, fontScale: opt.val })}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl border min-h-[38px] ${
                  settings.fontScale === opt.val
                    ? 'bg-[#0B4F8A] text-white border-[#0B4F8A]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {(
            [
              ['soundEnabled', 'Sound Effects (Study Timer & Rewards)'],
              ['animationsEnabled', 'Interface Transitions & Animations'],
              ['reducedMotion', 'Strict Reduced Motion'],
              ['autoNextInCbt', 'CBT Exam Automatic Next Question After Selection'],
              ['notificationsEnabled', 'Daily Study Reminder Banner'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4 cursor-pointer min-h-[40px]">
              <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => onUpdateSettings({ ...settings, [key]: e.target.checked })}
                className="w-5 h-5 accent-[#0B4F8A]"
              />
            </label>
          ))}
        </div>

        {/* Configurable Daily Study Targets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label htmlFor="target-mins" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Daily Focused Target (minutes)
            </label>
            <input
              id="target-mins"
              type="number"
              min={15}
              max={600}
              step={15}
              value={settings.dailyTargetMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  dailyTargetMinutes: Math.max(15, Number(e.target.value) || 240),
                })
              }
              className="w-full min-h-[42px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="target-fc" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Daily Flashcard Target
            </label>
            <input
              id="target-fc"
              type="number"
              min={5}
              max={200}
              value={settings.dailyFlashcardTarget}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  dailyFlashcardTarget: Math.max(5, Number(e.target.value) || 25),
                })
              }
              className="w-full min-h-[42px] px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* PWA Install & Backup/Restore */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Offline App Install &amp; Data Backup
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export Backup JSON</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px]"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Restore Backup JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
          </div>
          {statusMessage && (
            <p className="text-xs font-semibold text-[#0D7A5F] dark:text-emerald-400">{statusMessage}</p>
          )}
        </div>
      </section>
    </div>
  );
}
