import { useMemo, useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, Seg, Select, Tag } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { addDays, nowIso, todayStr, weekStart } from '../lib/utils';
import { newId, remove, save } from '../lib/repo';
import { toast } from '../lib/toast';
import type { Goal, Todo } from '../lib/types';

type View = 'today' | 'week' | 'later';

const EMPTY_FORM = { title: '', priority: 2 as 0 | 1 | 2 | 3, tags: '', dueDate: '', estimatedMinutes: '', goalId: '', note: '' };

export default function Todos() {
  const { user } = useWorkspace();
  const todos = useRecords<Todo>('todo');
  const goals = useRecords<Goal>('goal');
  const [view, setView] = useState<View>('today');
  const [showDone, setShowDone] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [editing, setEditing] = useState<Todo | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const today = todayStr();
  const ws = weekStart();

  const visible = useMemo(() => {
    let list = todos.filter((t) => {
      if (showDone) return t.done || t.archived;
      return !t.done && !t.archived;
    });
    if (view === 'today') list = list.filter((t) => t.dueDate === today || (t.dueDate && t.dueDate < today));
    if (view === 'week') list = list.filter((t) => t.dueDate && t.dueDate >= ws && t.dueDate <= addDays(ws, 6));
    if (view === 'later') list = list.filter((t) => !t.dueDate || t.dueDate > addDays(today, 6));
    if (tagFilter) list = list.filter((t) => t.tags.includes(tagFilter));
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.priority - b.priority);
  }, [todos, view, showDone, tagFilter, today, ws]);

  const allTags = useMemo(() => [...new Set(todos.flatMap((t) => t.tags))].sort(), [todos]);
  const doneCount = todos.filter((t) => t.done).length;
  const rate = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); };
  const openEdit = (t: Todo) => {
    setEditing(t);
    setForm({
      title: t.title, priority: t.priority, tags: t.tags.join(','), dueDate: t.dueDate || '',
      estimatedMinutes: t.estimatedMinutes?.toString() || '', goalId: t.goalId || '', note: t.note || ''
    });
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    const ts = nowIso();
    const base = editing ? { ...editing } : { id: newId(), createdAt: ts, updatedAt: ts, done: false, archived: false, actualMinutes: null, doneAt: null };
    const todo: Todo = {
      ...base,
      title: form.title.trim(),
      priority: form.priority,
      tags: form.tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
      dueDate: form.dueDate || null,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null,
      goalId: form.goalId || null,
      note: form.note || undefined,
      updatedAt: ts
    };
    await save('todo', todo, user?.id || 'local');
    toast(editing ? '已更新' : '已添加', 'ok');
    setEditing(null);
  };

  const toggle = async (t: Todo) => {
    await save('todo', { ...t, done: !t.done, doneAt: t.done ? null : nowIso() }, user?.id || 'local');
  };

  const doRemove = async (t: Todo) => {
    await remove('todo', t.id);
    toast('已删除', 'info');
  };

  const archive = async (t: Todo) => {
    await save('todo', { ...t, archived: true, done: true, doneAt: t.doneAt || nowIso() }, user?.id || 'local');
    toast('已归档', 'info');
  };

  const reorder = async (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...visible];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    for (let i = 0; i < next.length; i++) {
      if ((next[i].order ?? 0) !== i) {
        await save('todo', { ...next[i], order: i }, user?.id || 'local');
      }
    }
  };

  const goalName = (id?: string | null) => goals.find((g) => g.id === id)?.title || '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          options={[
            { value: 'today', label: '今日' },
            { value: 'week', label: '本周' },
            { value: 'later', label: '以后' }
          ]}
          value={view}
          onChange={setView}
        />
        <Btn onClick={openAdd}><Icon name="plus" size={15} />添加待办</Btn>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-flat p-3.5"><div className="label">未完成</div><div className="tnum mt-1 text-xl font-semibold">{todos.filter((t) => !t.done && !t.archived).length}</div></div>
        <div className="card-flat p-3.5"><div className="label">已完成</div><div className="tnum mt-1 text-xl font-semibold">{doneCount}</div></div>
        <div className="card-flat p-3.5"><div className="label">完成率</div><div className="tnum mt-1 text-xl font-semibold">{rate}%</div></div>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}>
              <Tag tone={tagFilter === tag ? 'on' : 'default'}>{tag}</Tag>
            </button>
          ))}
        </div>
      )}

      <Card
        title={showDone ? '已完成 / 已归档' : '待办列表'}
        action={
          <button onClick={() => setShowDone(!showDone)} className="text-xs font-medium text-[var(--accent)]">
            {showDone ? '返回待办' : '查看已完成'}
          </button>
        }
      >
        {visible.length === 0 ? (
          <Empty icon="checkCircle" text="这里还没有待办。" />
        ) : (
          <div className="space-y-1">
            {visible.map((t, i) => (
              <div
                key={t.id}
                draggable={!showDone}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx !== null) void reorder(dragIdx, i); setDragIdx(null); }}
                className={`group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 hover:border-[var(--line)] hover:bg-[var(--surface-2)] ${t.done ? 'opacity-60' : ''}`}
              >
                <button onClick={() => void toggle(t)} className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${t.done ? 'border-[var(--green)] bg-[var(--green)] text-white' : 'border-[var(--line)]'}`}>
                  {t.done && <Icon name="check" size={12} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${t.done ? 'line-through text-[var(--text-3)]' : ''}`}>{t.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {t.dueDate && (
                      <span className={`text-[11px] ${t.dueDate < today ? 'text-[var(--red)]' : t.dueDate === today ? 'text-[var(--amber)]' : 'text-[var(--text-3)]'}`}>
                        {t.dueDate === today ? '今天' : t.dueDate < today ? `逾期 ${todayStr()} 前` : t.dueDate}
                      </span>
                    )}
                    {t.priority === 1 && <Tag tone="red">高</Tag>}
                    {t.priority === 2 && <Tag tone="amber">中</Tag>}
                    {t.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    {t.goalId && <Tag tone="green">{goalName(t.goalId)}</Tag>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"><Icon name="pencil" size={15} /></button>
                  {!t.done && <button onClick={() => void archive(t)} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"><Icon name="archive" size={15} /></button>}
                  <button onClick={() => void doRemove(t)} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"><Icon name="trash" size={15} /></button>
                </div>
                {!showDone && <span className="hidden cursor-grab text-[var(--text-3)] group-hover:block"><Icon name="more" size={16} /></span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={Boolean(editing) || form.title !== '' || form.dueDate !== ''} onClose={() => { setEditing(null); setForm({ ...EMPTY_FORM }); }} title={editing ? '编辑待办' : '添加待办'}>
        <div className="space-y-3.5">
          <Field label="事项">
            <Input value={form.title} onChange={set('title')} placeholder="要做什么？" autoFocus />
          </Field>
          <Field label="优先级">
            <Seg
              options={[
                { value: 1, label: '高' }, { value: 2, label: '中' }, { value: 3, label: '低' }, { value: 0, label: '无' }
              ]}
              value={form.priority as 0 | 1 | 2 | 3}
              onChange={(v) => setForm((f) => ({ ...f, priority: v }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="截止日期">
              <Input type="date" value={form.dueDate} onChange={set('dueDate')} />
            </Field>
            <Field label="预计耗时（分钟）">
              <Input type="number" inputMode="numeric" value={form.estimatedMinutes} onChange={set('estimatedMinutes')} placeholder="30" />
            </Field>
          </div>
          <Field label="标签（逗号分隔）">
            <Input value={form.tags} onChange={set('tags')} placeholder="学习, 工作" />
          </Field>
          <Field label="关联目标">
            <Select value={form.goalId} onChange={set('goalId')}>
              <option value="">不关联</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          </Field>
          <Field label="备注">
            <Input value={form.note} onChange={set('note')} placeholder="可选" />
          </Field>
          <div className="flex gap-2 pt-1">
            <Btn className="flex-1" onClick={() => void submit()} disabled={!form.title.trim()}>保存</Btn>
            <Btn variant="ghost" onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM }); }}>取消</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
