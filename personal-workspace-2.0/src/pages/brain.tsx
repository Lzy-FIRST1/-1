import { useState } from 'react';
import { Btn, Card, Empty, Field, Seg, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { nowIso, todayStr, timeHM } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { organizeLocally, organizeWithAI, type OrganizeResult } from '../lib/ai';
import { toast } from '../lib/toast';
import type { Thought, Todo } from '../lib/types';

export default function Brain() {
  const { user } = useWorkspace();
  const thoughts = useRecords<Thought>('thought');
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<OrganizeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | Thought['type']>('all');

  const run = async (ai: boolean) => {
    if (!raw.trim()) return;
    setBusy(true);
    const local = organizeLocally(raw);
    const r = ai ? (await organizeWithAI(raw)) || local : local;
    setResult(r);
    setSelected(new Set(r.tasks.map((t) => t.title)));
    setBusy(false);
  };

  const saveThought = async (summary?: string) => {
    const t: Thought = {
      id: newId(), createdAt: nowIso(), updatedAt: nowIso(), type: 'brain',
      content: raw, summary: summary || result?.problem
    };
    await save('thought', t, user?.id || 'local');
    setRaw('');
    setResult(null);
    toast('已存档到思绪记录', 'ok');
  };

  const addToTodos = async () => {
    if (!result) return;
    let n = 0;
    for (const t of result.tasks) {
      if (!selected.has(t.title)) continue;
      const todo: Todo = {
        id: newId(), createdAt: nowIso(), updatedAt: nowIso(),
        title: t.title, done: false, priority: t.priority,
        tags: t.tag ? [t.tag] : [], dueDate: t.priority === 1 ? todayStr() : null,
        estimatedMinutes: null, actualMinutes: null, goalId: null
      };
      await save('todo', todo, user?.id || 'local');
      n++;
    }
    toast(`已加入 ${n} 条待办`, 'ok');
    setResult(null);
    setRaw('');
  };

  const toggleSelect = (title: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const filtered = thoughts
    .filter((t) => filter === 'all' || t.type === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4">
      <Card title="把乱糟糟的想法，整理成可执行的行动">
        <Field label="随便写，越乱越好" hint="支持换行、句号或逗号分隔多件事。">
          <Textarea
            rows={6}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'例如：\n今天好多事情啊\n设计院图纸没画\n基础考试还没学\n晚上想健身\n还要洗衣服'}
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn onClick={() => void run(false)} disabled={busy || !raw.trim()}>
            <Icon name="sparkles" size={15} />整理思绪
          </Btn>
          <Btn variant="ghost" onClick={() => void run(true)} disabled={busy || !raw.trim()}>
            <Icon name="bolt" size={15} />AI 深度整理
          </Btn>
          <Btn variant="soft" onClick={() => void saveThought()} disabled={!raw.trim()}>
            仅保存
          </Btn>
        </div>
        {busy && <p className="mt-3 text-xs text-[var(--text-3)]">整理中…</p>}
      </Card>

      {result && (
        <Card title={result.source === 'ai' ? 'AI 整理结果' : '整理结果'} className="fade-up">
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
              <div className="label mb-1">当前问题</div>
              <p className="text-sm">{result.problem}</p>
            </div>

            <div>
              <div className="label mb-2">优先级排序</div>
              <div className="space-y-1.5">
                {result.priorities.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[11px] font-semibold text-[var(--text-2)]">{i + 1}</span>
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-[var(--text-3)]">{p.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="label mb-2">可执行任务（勾选后一键加入待办）</div>
              <div className="space-y-1.5">
                {result.tasks.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => toggleSelect(t.title)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selected.has(t.title) ? 'border-[rgba(10,132,255,.4)] bg-[rgba(10,132,255,.06)]' : 'border-[var(--line)]'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      selected.has(t.title) ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--line)]'
                    }`}>
                      {selected.has(t.title) && <Icon name="check" size={11} />}
                    </span>
                    <span className="flex-1 text-sm">{t.title}</span>
                    {t.priority === 1 && <Tag tone="red">高</Tag>}
                    {t.priority === 2 && <Tag tone="amber">中</Tag>}
                    {t.tag && <Tag>{t.tag}</Tag>}
                  </button>
                ))}
              </div>
            </div>

            {result.schedule.length > 0 && (
              <div>
                <div className="label mb-2">建议安排</div>
                <ul className="space-y-1 text-sm text-[var(--text-2)]">
                  {result.schedule.map((s, i) => (
                    <li key={i} className="flex gap-2"><span className="text-[var(--accent)]">·</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
              <Btn onClick={() => void addToTodos()}>一键加入待办（{selected.size}）</Btn>
              <Btn variant="ghost" onClick={() => void saveThought()}>保存到思绪记录</Btn>
            </div>
          </div>
        </Card>
      )}

      <Card
        title="思绪记录"
        action={
          <Seg
            options={[
              { value: 'all', label: '全部' },
              { value: 'ritual', label: '开工' },
              { value: 'brain', label: '整理' },
              { value: 'rumination', label: '反刍' }
            ]}
            value={filter}
            onChange={setFilter}
          />
        }
      >
        {filtered.length === 0 ? (
          <Empty icon="bulb" text="还没有思绪记录。" />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-xl border border-[var(--line)] p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="chip">
                    {t.type === 'ritual' ? '开工仪式' : t.type === 'rumination' ? '停止反刍' : '思绪整理'}
                  </span>
                  <span className="text-[11px] text-[var(--text-3)]">{timeHM(t.createdAt)}</span>
                  {t.summary && <span className="text-[11px] text-[var(--text-3)]">· {t.summary}</span>}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)] line-clamp-4">{t.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
