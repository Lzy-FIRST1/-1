import { useState } from 'react';
import { Btn, Card, Empty, Field, Seg, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { addDays, formatCN, nowIso, todayStr } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { toast } from '../lib/toast';
import type { Rumination, Thought, Todo } from '../lib/types';

export default function Rumination() {
  const { user } = useWorkspace();
  const records = useRecords<Rumination>('rumination');
  const today = todayStr();
  const [form, setForm] = useState({ worry: '', needNow: 'no', minAction: '' });
  const [creatingTodo, setCreatingTodo] = useState(false);

  const submit = async () => {
    if (!form.worry.trim() || !form.minAction.trim()) return;
    setCreatingTodo(true);
    const ts = nowIso();
    const r: Rumination = {
      id: newId(), createdAt: ts, updatedAt: ts,
      worry: form.worry.trim(),
      needNow: form.needNow === 'yes',
      minAction: form.minAction.trim()
    };
    let todoId: string | null = null;
    if (form.needNow === 'yes') {
      const todo: Todo = {
        id: newId(), createdAt: ts, updatedAt: ts,
        title: `【反刍行动】${form.minAction.trim()}`,
        done: false, priority: 1, tags: ['反刍'],
        dueDate: today, estimatedMinutes: null, actualMinutes: null, goalId: null
      };
      await save('todo', todo, user?.id || 'local');
      todoId = todo.id;
    }
    const thought: Thought = {
      id: newId(), createdAt: ts, updatedAt: ts, type: 'rumination',
      content: `担心：${form.worry}\n是否现在解决：${form.needNow === 'yes' ? '是' : '否'}\n最小行动：${form.minAction}`
    };
    await save('thought', thought, user?.id || 'local');
    await save('rumination', { ...r, createdTodoId: todoId }, user?.id || 'local');
    setForm({ worry: '', needNow: 'no', minAction: '' });
    setCreatingTodo(false);
    toast(form.needNow === 'yes' ? '已记录，并生成行动待办' : '已记录。不是现在的问题，就先放下。', 'ok');
  };

  const recent = records.filter((r) => r.createdAt.slice(0, 10) >= addDays(today, -7));
  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4">
      <Card title="停止反刍 · 三问法" className="border-[rgba(10,132,255,.3)]">
        <div className="space-y-4">
          <Field label="① 我现在在担心什么？">
            <Textarea rows={3} value={form.worry} onChange={(e) => setForm((f) => ({ ...f, worry: e.target.value }))} placeholder="把反复出现的念头写下来，写出来它就变具体了。" />
          </Field>
          <Field label="② 这件事是否需要现在解决？">
            <Seg
              options={[
                { value: 'yes', label: '是，现在就要解决' },
                { value: 'no', label: '否，现在无法/无需解决' }
              ]}
              value={form.needNow}
              onChange={(v) => setForm((f) => ({ ...f, needNow: v }))}
            />
          </Field>
          <Field label="③ 下一步最小行动是什么？" hint="选「是」会自动生成一条高优先级待办；选「否」就把担心存档，允许放下。">
            <Textarea rows={2} value={form.minAction} onChange={(e) => setForm((f) => ({ ...f, minAction: e.target.value }))} placeholder="例如：先查报名时间 / 给老师发一条消息 / 写一页草稿" />
          </Field>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-3)]">记录会同步到思绪记录，方便回看。</p>
            <Btn onClick={() => void submit()} disabled={!form.worry.trim() || !form.minAction.trim() || creatingTodo}>
              {creatingTodo ? '处理中…' : '记录并行动'}
            </Btn>
          </div>
        </div>
      </Card>

      {recent.length > 0 && (
        <div className="card-flat flex items-center gap-2 p-3.5 text-sm">
          <Icon name="chat" size={16} className="text-[var(--amber)]" />
          <span>最近 7 天记录了 <b>{recent.length}</b> 次反刍。</span>
          {recent.length >= 3 && <span className="text-xs text-[var(--text-3)]">同一件事反复出现时，建议用「决策日志」做一次完整权衡，然后让它过去。</span>}
        </div>
      )}

      <Card title="反刍记录">
        {sorted.length === 0 ? (
          <Empty icon="chat" text="还没有记录。下次陷入反复思考时，来这里三问。" />
        ) : (
          <div className="space-y-2.5">
            {sorted.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--line)] p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--text-3)]">{formatCN(r.createdAt.slice(0, 10))}</span>
                  <Tag tone={r.needNow ? 'red' : 'default'}>{r.needNow ? '需要解决' : '已放下'}</Tag>
                  {r.createdTodoId && <Tag tone="green">已生成行动</Tag>}
                </div>
                <p className="text-sm font-medium">担心：{r.worry}</p>
                <p className="mt-1 text-sm text-[var(--text-2)]">最小行动：{r.minAction}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
