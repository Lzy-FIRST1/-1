import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Btn, Card, Empty, Field, Heatmap, Input, Modal, Select, Seg, Stat } from '../components/ui';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { formatCN, lastNDays, monthKey, nowIso, streakDays, sum, todayStr } from '../lib/utils';
import { newId, remove, save } from '../lib/repo';
import { toast } from '../lib/toast';
import { EXERCISE_TYPES, type ExerciseEntry, type Intensity } from '../lib/types';

export default function Exercise() {
  const { user } = useWorkspace();
  const exercises = useRecords<ExerciseEntry>('exercise');
  const today = todayStr();
  const [form, setForm] = useState({ type: '跑步', minutes: '30', intensity: 'mid' as Intensity, calories: '', date: today });
  const [showAdd, setShowAdd] = useState(false);

  const week = lastNDays(7);
  const month = monthKey(today);
  const weekList = exercises.filter((e) => week.includes(e.date));
  const monthList = exercises.filter((e) => monthKey(e.date) === month);
  const streak = streakDays(new Set(exercises.map((e) => e.date)));
  const todayEntry = exercises.find((e) => e.date === today);

  const heat: Record<string, number> = {};
  exercises.forEach((e) => { heat[e.date] = (heat[e.date] || 0) + e.minutes; });

  const last30 = useMemo(() => lastNDays(30).map((d) => ({
    label: d.slice(5),
    value: sum(exercises.filter((e) => e.date === d).map((e) => e.minutes))
  })), [exercises]);

  const add = async () => {
    const minutes = Number(form.minutes);
    if (!minutes || minutes <= 0) return;
    const ts = nowIso();
    const e: ExerciseEntry = {
      id: newId(), createdAt: ts, updatedAt: ts,
      date: form.date, type: form.type, minutes,
      intensity: form.intensity,
      calories: form.calories ? Number(form.calories) : null
    };
    await save('exercise', e, user?.id || 'local');
    setForm({ type: '跑步', minutes: '30', intensity: 'mid', calories: '', date: today });
    setShowAdd(false);
    toast('运动已打卡', 'ok');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">运动中心</h2>
        <Btn onClick={() => setShowAdd(true)}><IconPlus />打卡</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon="bolt" label="今日" value={todayEntry ? `${todayEntry.minutes}分` : '—'} sub={todayEntry?.type || '未打卡'} />
        <Stat icon="flame" label="连续打卡" value={`${streak}天`} />
        <Stat icon="chart" label="本周" value={`${sum(weekList.map((e) => e.minutes))}分`} sub={`${new Set(weekList.map((e) => e.date)).size} 天`} />
        <Stat icon="trend" label="本月" value={`${sum(monthList.map((e) => e.minutes))}分`} sub={`${new Set(monthList.map((e) => e.date)).size} 天`} />
      </div>

      <Card title="打卡日历（过去 16 周）">
        <Heatmap values={heat} />
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-3)]">
          <span>少</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i === 0 ? 'var(--surface-2)' : 'var(--accent)', opacity: i === 0 ? 1 : Math.max(0.25, i / 4) }} />
          ))}
          <span>多</span>
        </div>
      </Card>

      <Card title="运动趋势（30 天）">
        <div className="flex h-32 items-end gap-1">
          {last30.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${Math.max(2, (d.value / Math.max(1, ...last30.map((x) => x.value))) * 100)}px`, background: d.value ? 'var(--green)' : 'var(--surface-2)' }}
                  title={`${d.label} ${d.value}分钟`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-[var(--text-3)]">
          <span>{last30[0]?.label}</span><span>今天</span>
        </div>
      </Card>

      <Card title="最近记录">
        {exercises.length === 0 ? (
          <Empty icon="bolt" text="还没有运动记录，今天动起来吧。" />
        ) : (
          <div className="space-y-2">
            {[...exercises].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((e) => (
              <div key={e.id} className="group flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
                <span className="w-20 text-[var(--text-2)]">{formatCN(e.date)}</span>
                <span className="flex-1 font-medium">{e.type}</span>
                <span className="tnum text-[var(--text-2)]">{e.minutes} 分钟</span>
                <span className={`text-[11px] ${e.intensity === 'high' ? 'text-[var(--red)]' : e.intensity === 'mid' ? 'text-[var(--amber)]' : 'text-[var(--text-3)]'}`}>
                  {e.intensity === 'high' ? '高强度' : e.intensity === 'mid' ? '适中' : '轻松'}
                </span>
                {e.calories ? <span className="text-xs text-[var(--text-3)]">{e.calories} kcal</span> : null}
                <button onClick={() => void remove('exercise', e.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><IconTrash /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ModalAdd
        open={showAdd}
        onClose={() => setShowAdd(false)}
        form={form}
        setForm={setForm}
        onSubmit={add}
      />
    </div>
  );
}

import { Icon } from '../components/icons';

function IconPlus() {
  return <Icon name="plus" size={15} />;
}

function IconTrash() {
  return <Icon name="trash" size={15} />;
}

function ModalAdd({
  open, onClose, form, setForm, onSubmit
}: {
  open: boolean;
  onClose: () => void;
  form: { type: string; minutes: string; intensity: Intensity; calories: string; date: string };
  setForm: Dispatch<SetStateAction<{ type: string; minutes: string; intensity: Intensity; calories: string; date: string }>>;
  onSubmit: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="记录运动">
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="日期"><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="时长（分钟）"><Input type="number" inputMode="numeric" value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))} /></Field>
        </div>
        <Field label="运动类型">
          <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="强度">
          <Seg
            options={[
              { value: 'low', label: '轻松' }, { value: 'mid', label: '适中' }, { value: 'high', label: '高强度' }
            ]}
            value={form.intensity}
            onChange={(v) => setForm((f) => ({ ...f, intensity: v }))}
          />
        </Field>
        <Field label="消耗（千卡，可选）"><Input type="number" inputMode="numeric" value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} /></Field>
        <Btn className="w-full" onClick={onSubmit} disabled={!Number(form.minutes)}>保存</Btn>
      </div>
    </Modal>
  );
}
