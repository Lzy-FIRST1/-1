import { useMemo, useState } from 'react';
import { Btn, Card, Empty, Heatmap, Input, Stat } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { addDays, formatCN, lastNDays, monthKey, nowIso, streakDays, todayStr } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { toast } from '../lib/toast';
import type { WellnessEntry } from '../lib/types';

export default function Wellness() {
  const { user, settings, saveSettings } = useWorkspace();
  const entries = useRecords<WellnessEntry>('wellness');
  const today = todayStr();
  const [newItem, setNewItem] = useState('');

  const todayEntry = entries.find((e) => e.date === today);
  const items = todayEntry?.items || [];

  const toggle = async (item: string) => {
    const ts = nowIso();
    const next = items.includes(item) ? items.filter((i) => i !== item) : [...items, item];
    const entry: WellnessEntry = {
      ...(todayEntry || { id: today, createdAt: ts, updatedAt: ts, date: today, items: [] }),
      items: next,
      updatedAt: ts
    };
    await save('wellness', entry, user?.id || 'local');
  };

  const addCatalog = async () => {
    const name = newItem.trim();
    if (!name || settings.wellnessCatalog.includes(name)) return;
    await saveSettings({ wellnessCatalog: [...settings.wellnessCatalog, name] });
    setNewItem('');
    toast('已添加养生项目', 'ok');
  };

  const removeCatalog = async (name: string) => {
    await saveSettings({ wellnessCatalog: settings.wellnessCatalog.filter((i) => i !== name) });
  };

  const itemDays = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const item of settings.wellnessCatalog) map[item] = new Set();
    entries.forEach((e) => e.items.forEach((i) => map[i]?.add(e.date)));
    return map;
  }, [entries, settings.wellnessCatalog]);

  const month = monthKey(today);
  const monthDays = new Set(entries.filter((e) => monthKey(e.date) === month).map((e) => e.date)).size;
  const anyDay = new Set(entries.map((e) => e.date));
  const heat: Record<string, number> = {};
  entries.forEach((e) => { heat[e.date] = e.items.length; });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">养生中心</h2>
        <span className="text-xs text-[var(--text-3)]">可自定义项目，打卡式记录</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon="heart" label="今日项目" value={items.length} sub={items.length ? '已打卡' : '未打卡'} />
        <Stat icon="flame" label="本月天数" value={`${monthDays}天`} />
        <Stat icon="trend" label="连续天数" value={`${streakDays(anyDay)}天`} />
      </div>

      <Card title={`今日养生 · ${formatCN(today)}`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {settings.wellnessCatalog.map((item) => {
            const on = items.includes(item);
            return (
              <button
                key={item}
                onClick={() => void toggle(item)}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors ${
                  on ? 'border-[rgba(52,199,89,.4)] bg-[rgba(52,199,89,.08)] text-[var(--green)]' : 'border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <span>{item}</span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${on ? 'border-[var(--green)] bg-[var(--green)] text-white' : 'border-[var(--line)]'}`}>
                  {on && <Icon name="check" size={11} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="自定义项目，如：午休、护眼" onKeyDown={(e) => { if (e.key === 'Enter') void addCatalog(); }} />
          <Btn variant="soft" onClick={() => void addCatalog()} disabled={!newItem.trim()}>添加</Btn>
        </div>
      </Card>

      <Card title="坚持情况（过去 16 周）">
        <Heatmap values={heat} color="var(--green)" />
      </Card>

      <Card title="各项目连续打卡">
        {settings.wellnessCatalog.length === 0 ? (
          <Empty icon="heart" text="还没有养生项目。" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {settings.wellnessCatalog.map((item) => {
              const streak = streakDays(itemDays[item] || new Set());
              const count = (itemDays[item] || new Set()).size;
              return (
                <div key={item} className="card-flat p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item}</span>
                    {streak > 0 && <span className="text-[var(--amber)]"><Icon name="flame" size={14} /></span>}
                  </div>
                  <div className="tnum mt-1 text-lg font-semibold">
                    {streak}<span className="text-xs font-normal text-[var(--text-3)]"> 天连续</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-3)]">累计 {count} 天</div>
                  <button onClick={() => void removeCatalog(item)} className="mt-1.5 text-[11px] text-[var(--text-3)] hover:text-[var(--red)]">移除项目</button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="最近打卡">
        {entries.length === 0 ? (
          <Empty icon="heart" text="还没有养生记录，从今天开始。" />
        ) : (
          <div className="space-y-1.5">
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((e) => (
              <div key={e.date} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                <span className="w-20 text-[var(--text-2)]">{formatCN(e.date)}</span>
                <span className="flex-1 truncate">{e.items.join('、') || '—'}</span>
                <span className="text-xs text-[var(--text-3)]">{e.items.length} 项</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
