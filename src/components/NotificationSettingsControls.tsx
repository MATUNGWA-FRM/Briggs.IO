import React from 'react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  NOTIFICATION_POSITION_OPTIONS,
  type NotificationPosition,
  type NotificationPrefs,
} from '../shared/notificationConfig';

interface NotificationSettingsControlsProps {
  prefs: NotificationPrefs;
  onChangePrefs: (next: NotificationPrefs) => void;
  activeBarCount: number;
  onClearAll?: () => void;
  compact?: boolean;
}

export const NotificationSettingsControls: React.FC<NotificationSettingsControlsProps> = ({
  prefs,
  onChangePrefs,
  activeBarCount,
  onClearAll,
  compact = false,
}) => {
  const setPosition = (position: NotificationPosition) => {
    onChangePrefs({ ...prefs, position });
  };

  const toggleEnabled = () => {
    onChangePrefs({ ...prefs, popupsEnabled: !prefs.popupsEnabled });
  };

  return (
    <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display font-semibold text-slate-100">
            Buy Notification Pop-Up & Bar
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pop-up shows on screen for <span className="font-mono text-[#00E599]">2.5s</span> (or hide) · stays in Notification Bar for{' '}
            <span className="font-mono text-[#C4B5FD]">2m</span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          className={`px-2.5 py-1 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1.5 shrink-0 transition-colors ${
            prefs.popupsEnabled
              ? 'border-[#00E599]/50 bg-[#00E599]/15 text-[#00E599]'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:text-amber-200'
          }`}
          title={prefs.popupsEnabled ? 'Click to hide on-screen pop-ups' : 'Click to show on-screen pop-ups'}
        >
          {prefs.popupsEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {prefs.popupsEnabled ? 'POP-UP SHOWN' : 'POP-UP HIDDEN'}
        </button>
      </div>

      {/* Screen Position Selector: Top / Bottom + Left / Right */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
          <span>Pop-Up Screen Position</span>
          <span className="text-[#C4B5FD]">
            {NOTIFICATION_POSITION_OPTIONS.find((o) => o.id === prefs.position)?.label}
          </span>
        </div>

        <div className={`grid grid-cols-2 gap-1.5 ${compact ? '' : 'sm:max-w-sm'}`}>
          {NOTIFICATION_POSITION_OPTIONS.map((opt) => {
            const active = prefs.position === opt.id;
            const isTop = opt.id.startsWith('TOP');
            const isLeft = opt.id.endsWith('LEFT');
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPosition(opt.id)}
                className={`px-2.5 py-2 rounded-sm border text-left transition-colors flex items-center justify-between gap-2 ${
                  active
                    ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                    : 'border-[#1E2330] bg-[#0C0E14] text-slate-300 hover:border-[#2C3448]'
                }`}
              >
                <span className="font-mono text-[11px] font-medium">{opt.label}</span>
                {/* Mini Screen Corner Visual Indicator */}
                <span
                  className="w-6 h-4 rounded-[2px] border border-[#282F42] bg-[#07080C] relative shrink-0"
                  aria-hidden="true"
                >
                  <span
                    className={`absolute w-2 h-1 rounded-[1px] ${
                      active ? 'bg-[#00E599]' : 'bg-slate-500'
                    } ${isTop ? 'top-0.5' : 'bottom-0.5'} ${isLeft ? 'left-0.5' : 'right-0.5'}`}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {onClearAll && activeBarCount > 0 && (
        <div className="pt-2 border-t border-[#1E2330] flex items-center justify-between text-[11px]">
          <span className="font-mono text-slate-400">
            Active in 2m bar: <strong className="text-slate-200">{activeBarCount}</strong>
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="px-2 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#FF4D6A]/50 text-slate-300 hover:text-[#FF4D6A] font-mono inline-flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear 2m Bar
          </button>
        </div>
      )}
    </div>
  );
};
