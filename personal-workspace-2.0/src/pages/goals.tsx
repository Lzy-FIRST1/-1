import { useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, Progress, Select, Tag } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { nowIso, todayStr, addDays, monthKey, weekStart } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { aiText } from '../lib/ai';
import { toast } from '../lib/toast';
import type { Goal, GoalPeriod, Todo } from '../lib/types';

const PERIOD_LABEL: Record<GoalPeriod, string> = { year: '年度', month: '月度', week: '周度' };

export default function Goals() {
  const { user } = useWorkspace();
  const goals = useRecords<Goal>('goal');
  const todos = useRecords<Todo>('todo');
  const [showAdd, setShowAdd] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [period, setPeriod] = useState<GoalPeriod>('year');
  const [form, setForm] = useState({ title: '', start: todayStr(), end: addDays(todayStr(), 365), progress: '0' });
  const [decomposing, setDecomposing] = useState<string | null>(null);

  const openAdd = (p: GoalPeriod, parent: string | null = null) => {
    setPeriod(p);
    setParentId(parent);
    const today = todayStr();
    const end = p === 'year' ? addDays(today, 365) : p === 'month' ? addDays(`${monthKey(today)}-01`, 31) : addDays(weekStart(), 6);
    setForm({ title: '', start: p === 'year' ? `${today.slice(0, 4)}-01-01` : p === 'month' ? `${monthKey(today)}-01` : weekStart(), end, progress: '0' });
    setShowAdd(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    const ts = nowIso();
    const g: Goal = {
      id: newId(), createdAt: ts, updatedAt: ts,
      title: form.title.trim(), period, parentId,
      start: form.start, end: form.end,
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
      order: goals.filter((x) => x.period === period && x.parentId === parentId).length
    };
    await save('goal', g, user?.id || 'local');
    setShowAdd(false);
    toast('目标已创建', 'ok');
  };

  const setProgress = async (g: Goal, progress: number) => {
    await save('goal', { ...g, progress, updatedAt: nowIso() }, user?.id || 'local');
  };

  const decompose = async (g: Goal) => {
    setDecomposing(g.id);
    const weeks: string[] = [];
    const base = g.period === 'year' ? '把年度目标拆成本季度最重要的里程碑' : g.period === 'month' ? '把月度目标拆成未来两周的具体行动' : '把周目标拆成今天就能开始的第一步';
    const ai = await aiText(`目标：${g.title}。请${base}，输出 3 条以「1. 」「2. 」开头的短任务，每条不超过 20 字。`);
    if (ai) {
      weeks.push(...ai.split(/\n/).map((s) => s.replace(/^\d+[\.、]\s*/, '').trim()).filter((s) => s.length >= 2).slice(0, 3));
    }
    if (weeks.length === 0) {
      weeks.push(
        `列出完成「${g.title}」所需的全部步骤`,
        `把最难的步骤提前到本周`,
        `为「${g.title}」安排固定时间段`
      );
    }
    const ts = nowIso();
    for (let i = 0; i < weeks.length; i++) {
      const t: Todo = {
        id: newId(), createdAt: ts, updatedAt: ts,
        title: weeks[i], done: false, priority: (i + 1) as 1 | 2 | 3,
        tags: [g.period === 'year' ? '年度目标' : g.period === 'month' ? '月度目标' : '周目标'],
        dueDate: g.period === 'year' ? null : g.period === 'month' ? addDays(todayStr(), 7 * (i + 1)) : todayStr(),
        estimatedMinutes: null, actualMinutes: null, goalId: g.id
      };
      await save('todo', t, user?.id || 'local');
    }
    setDecomposing(null);
    toast(`已把「${g.title}」拆成 ${weeks.length} 条待办`, 'ok');
  };

  const years = goals.filter((g) => g.period === 'year').sort((a, b) => a.start.localeCompare(b.start));
  const linkedCount = (id: string) => todos.filter((t) => t.goalId === id && !t.done).length;

  const renderGoal = (g: Goal, depth: number) => {
    const children = goals
      .filter((x) => x.parentId === g.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.start.localeCompare(b.start));
    const linked = linkedCount(g.id);
    return (
      <div key={g.id}>
        <div className={`rounded-xl border border-[var(--line)] p-3.5 ${depth > 0 ? 'ml-4 sm:ml-8' : ''}`}>
          <div className="flex items-center gap-2">
            <Tag>{PERIOD_LABEL[g.period]}</Tag>
            <span className="flex-1 text-sm font-medium">{g.title}</span>
            {linked > 0 && <Tag tone="green">{linked} 条待办</Tag>}
            <button onClick={() => void decompose(g)} disabled={decomposing === g.id} className="rounded-lg p-1.5 text-[var(--accent)] hover:bg-[var(--surface-2)]" title="拆解为目标任务">
              <Icon name={decomposing === g.id ? 'refresh' : 'sparkles'} size={15} />
            </button>
            <button onClick={() => openAdd(g.period === 'year' ? 'month' : 'week', g.id)} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]" title="添加子目标">
              <Icon name="plus" size={15} />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range" min={0} max={100} step={5} value={g.progress}
              onChange={(e) => void setProgress(g, Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <span className="tnum w-10 text-right text-sm font-semibold">{g.progress}%</span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-[var(--text-3)]">
            <span>{g.start}</span><span>{g.end}</span>
          </div>
        </div>
        {children.map((c) => renderGoal(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">目标系统</h2>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => openAdd('month')}>月目标</Btn>
          <Btn size="sm" variant="ghost" onClick={() => openAdd('week')}>周目标</Btn>
          <Btn size="sm" onClick={() => openAdd('year')}><Icon name="plus" size={15} />年度目标</Btn>
        </div>
      </div>

      <Card title="年度 → 月度 → 周度 拆解">
        {years.length === 0 ? (
          <Empty icon="target" text="还没有年度目标。例如：考过注册土木基础。创建后可以逐级拆解，并一键生成待办。" />
        ) : (
          <div className="space-y-3">
            {years.map((g) => renderGoal(g, 0))}
          </div>
        )}
      </Card>

      <Card title="未挂靠年度的目标">
        {goals.filter((g) => g.period !== 'year' && !g.parentId).length === 0 ? (
          <p className="py-3 text-center text-xs text-[var(--text-3)]">所有目标都已挂靠到年度目标下。</p>
        ) : (
          <div className="space-y-2">
            {goals.filter((g) => g.period !== 'year' && !g.parentId).map((g) => renderGoal(g, 0))}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`新建${PERIOD_LABEL[period]}目标${parentId ? '（子目标）' : ''}`}>
        <div className="space-y-3.5">
          <Field label="目标名称"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={period === 'year' ? '考过注册土木基础' : '具体可衡量的一句话'} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="开始"><Input type="date" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></Field>
            <Field label="结束"><Input type="date" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} /></Field>
          </div>
          <Field label={`初始进度（${form.progress}%）`}>
            <input type="range" min={0} max={100} step={5} value={form.progress} onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))} className="w-full accent-[var(--accent)]" />
          </Field>
          <Btn className="w-full" onClick={() => void submit()} disabled={!form.title.trim()}>创建</Btn>
        </div>
      </Modal>
    </div>
  );
}
