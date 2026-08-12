import { Card } from '../components/ui';
import { RitualForm } from '../components/ritual-form';
import { useRecords } from '../lib/hooks';
import { formatCN, todayStr } from '../lib/utils';
import type { Ritual } from '../lib/types';
import { Icon } from '../components/icons';

export default function RitualPage() {
  const rituals = useRecords<Ritual>('ritual');
  const today = todayStr();
  const todays = rituals.find((r) => r.date === today);

  return (
    <div className="space-y-4">
      <Card title={todays ? '今日已开工 ✓' : '今日开工仪式'} className={todays ? '' : 'border-[rgba(10,132,255,.35)]'}>
        {todays ? (
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">最重要：</span>{todays.mostImportant}</div>
            <div><span className="font-semibold">为什么：</span>{todays.why}</div>
            <div><span className="font-semibold">风险：</span>{todays.risk}</div>
            <div><span className="font-semibold">分心源：</span>{todays.distraction}</div>
            <div><span className="font-semibold">底线：</span>{todays.ifOnlyOne}</div>
          </div>
        ) : (
          <RitualForm />
        )}
      </Card>

      <Card title="过往记录">
        {rituals.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-3)]">还没有开工记录，从今天开始。</p>
        ) : (
          <div className="space-y-3">
            {[...rituals].sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--line)] p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
                  <Icon name="calendar" size={13} />{formatCN(r.date)}
                </div>
                <p className="text-sm font-medium">{r.mostImportant}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-2)]">{r.why}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
