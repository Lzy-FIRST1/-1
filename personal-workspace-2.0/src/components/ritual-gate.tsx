import { useState } from 'react';
import { useRecords } from '../lib/hooks';
import { todayStr } from '../lib/utils';
import { useWorkspace } from '../store';
import { RitualForm } from './ritual-form';
import { Icon } from './icons';
import type { Ritual } from '../lib/types';

export function RitualGate() {
  const { settings } = useWorkspace();
  const rituals = useRecords<Ritual>('ritual');
  const today = todayStr();
  const done = rituals.some((r) => r.date === today);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(`pw-gate-${today}`) === '1');

  if (done || dismissed || settings.ritualMode !== 'strict') return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="fade-up max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-8">
        <div className="mb-1 flex items-center gap-2 text-[var(--accent)]">
          <Icon name="flag" size={18} />
          <span className="text-xs font-semibold uppercase tracking-widest">Daily Ritual</span>
        </div>
        <h2 className="mb-1 text-xl font-bold tracking-tight">先思考，再行动</h2>
        <p className="mb-5 text-sm leading-relaxed text-[var(--text-2)]">
          进入工作台前，花两分钟想清楚今天的方向。回答会自动存档到「思绪记录」。
        </p>
        <RitualForm compact onSaved={() => setDismissed(true)} />
        <div className="mt-5 border-t border-[var(--line)] pt-4 text-center">
          <button
            onClick={() => { sessionStorage.setItem(`pw-gate-${today}`, '1'); setDismissed(true); }}
            className="text-xs text-[var(--text-3)] underline-offset-2 hover:underline"
          >
            今天先不进入工作模式，仅浏览
          </button>
        </div>
      </div>
    </div>
  );
}
