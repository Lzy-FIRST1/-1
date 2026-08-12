import { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Input, Seg, Tag } from '../components/ui';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { decryptText, PRIVATE_PIN, vaultUnlocked } from '../lib/crypto';
import type { PrivateThought } from '../lib/types';

const MODULES = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待办' },
  { value: 'thought', label: '思绪' },
  { value: 'diary', label: '日记' },
  { value: 'review', label: '复盘' },
  { value: 'wrongQuestion', label: '错题' },
  { value: 'decision', label: '决策' },
  { value: 'rumination', label: '反刍' },
  { value: 'privateThought', label: '私密' }
] as const;

const KIND_META: Record<string, { label: string; to: string }> = {
  todo: { label: '待办', to: '/todos' },
  thought: { label: '思绪', to: '/brain' },
  ritual: { label: '开工仪式', to: '/ritual' },
  diary: { label: '日记', to: '/diary' },
  review: { label: '复盘', to: '/reviews' },
  wrongQuestion: { label: '错题', to: '/exam' },
  study: { label: '学习记录', to: '/exam' },
  studyPlan: { label: '学习计划', to: '/exam' },
  decision: { label: '决策', to: '/decisions' },
  rumination: { label: '停止反刍', to: '/rumination' },
  importantDate: { label: '重要日期', to: '/dates' },
  goal: { label: '目标', to: '/goals' },
  privateThought: { label: '私密想法', to: '/thoughts' }
};

interface Hit {
  kind: string;
  id: string;
  title: string;
  snippet: string;
  date: string;
  to: string;
}

function collectHits(rows: { kind: string; id: string; data: Record<string, unknown> }[], query: string, unlockedPrivate: boolean): Hit[] {
  const q = query.toLowerCase();
  const hits: Hit[] = [];
  const textOf = (obj: Record<string, unknown>) =>
    Object.entries(obj)
      .filter(([k]) => !['id', 'createdAt', 'updatedAt', 'deletedAt', 'contentEnc', 'salt', 'iv'].includes(k))
      .map(([, v]) => (typeof v === 'string' || typeof v === 'number' ? String(v) : Array.isArray(v) ? v.join(' ') : ''))
      .join(' ');
  for (const row of rows) {
    const meta = KIND_META[row.kind];
    if (!meta) continue;
    if (row.kind === 'privateThought' && !unlockedPrivate) continue;
    const text = textOf(row.data);
    if (!text.toLowerCase().includes(q)) continue;
    const d = row.data as Record<string, unknown>;
    const title = typeof d.title === 'string' && d.title ? d.title : typeof d.question === 'string' && d.question ? d.question.slice(0, 40) : (typeof d.plan === 'string' && d.plan) || (typeof d.chapter === 'string' ? `${d.subject}·${d.chapter}` : (typeof d.worry === 'string' && d.worry) || (typeof d.decision === 'string' && d.decision) || (typeof d.mostImportant === 'string' && d.mostImportant) || '');
    const date = typeof d.date === 'string' ? d.date : (row.data.updatedAt as string)?.slice(0, 10) || '';
    hits.push({
      kind: row.kind, id: row.id,
      title: String(title).slice(0, 60),
      snippet: text.replace(/\s+/g, ' ').slice(0, 90),
      date, to: meta.to
    });
  }
  return hits;
}

export default function Search() {
  const todos = useRecords('todo');
  const thoughts = useRecords('thought');
  const rituals = useRecords('ritual');
  const diaries = useRecords('diary');
  const reviews = useRecords('review');
  const wrongs = useRecords('wrongQuestion');
  const studies = useRecords('study');
  const plans = useRecords('studyPlan');
  const decisions = useRecords('decision');
  const ruminations = useRecords('rumination');
  const dates = useRecords('importantDate');
  const goals = useRecords('goal');
  const privateThoughts = useRecords<PrivateThought>('privateThought');
  const unlocked = vaultUnlocked();

  const [query, setQuery] = useState('');
  const [module, setModule] = useState<string>('all');
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const all: { kind: string; id: string; data: Record<string, unknown> }[] = [
      ...todos.map((t) => ({ kind: 'todo', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...thoughts.map((t) => ({ kind: 'thought', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...rituals.map((t) => ({ kind: 'ritual', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...diaries.map((t) => ({ kind: 'diary', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...reviews.map((t) => ({ kind: 'review', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...wrongs.map((t) => ({ kind: 'wrongQuestion', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...studies.map((t) => ({ kind: 'study', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...plans.map((t) => ({ kind: 'studyPlan', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...decisions.map((t) => ({ kind: 'decision', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...ruminations.map((t) => ({ kind: 'rumination', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...dates.map((t) => ({ kind: 'importantDate', id: String(t.id), data: t as unknown as Record<string, unknown> })),
      ...goals.map((t) => ({ kind: 'goal', id: String(t.id), data: t as unknown as Record<string, unknown> }))
    ];
    if (unlocked) {
      privateThoughts.forEach((t) => {
        const content = decrypted[t.id];
        if (content) all.push({ kind: 'privateThought', id: String(t.id), data: { ...t, content } as unknown as Record<string, unknown> });
      });
    }
    return all;
  }, [todos, thoughts, rituals, diaries, reviews, wrongs, studies, plans, decisions, ruminations, dates, goals, unlocked, privateThoughts, decrypted]);

  // 解锁状态下解密私密内容（异步）
  useEffect(() => {
    if (!unlocked) return;
    privateThoughts.forEach((t) => {
      void decryptText(PRIVATE_PIN, { salt: t.salt, iv: t.iv, data: t.contentEnc })
        .then((text) => setDecrypted((prev) => (prev[t.id] === text ? prev : { ...prev, [t.id]: text })))
        .catch(() => undefined);
    });
  }, [unlocked, privateThoughts]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return collectHits(rows.filter((r) => module === 'all' || r.kind === module), query.trim(), unlocked)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
  }, [rows, query, module, unlocked]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">搜索中心</h2>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索所有记录：待办、日记、思绪、复盘、错题、决策……" autoFocus />
      <div className="flex flex-wrap gap-1.5">
        {MODULES.map((m) => (
          <button key={m.value} onClick={() => setModule(m.value)}>
            <Tag tone={module === m.value ? 'on' : 'default'} className="!px-3 !py-1.5">{m.label}</Tag>
          </button>
        ))}
      </div>

      {!unlocked && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--text-3)]">
          私密想法内容已加密，需先在「私密想法」模块解锁后才会出现在搜索结果中。
        </p>
      )}

      {query.trim() === '' ? (
        <Card><Empty icon="search" text="输入关键词开始搜索。" /></Card>
      ) : results.length === 0 ? (
        <Card><Empty icon="search" text="没有找到匹配的记录。" /></Card>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <Link key={`${r.kind}:${r.id}`} to={r.to} className="block">
              <div className="card-flat p-3.5 transition-colors hover:border-[rgba(10,132,255,.35)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={r.kind === 'privateThought' ? 'on' : 'default'}>{KIND_META[r.kind]?.label || r.kind}</Tag>
                  {r.date && <span className="text-[11px] text-[var(--text-3)]">{r.date}</span>}
                  <span className="ml-auto text-[var(--text-3)]"><Icon name="chevronRight" size={13} /></span>
                </div>
                <p className="mt-1 text-sm font-medium">{r.title || '（无标题）'}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--text-3)]">{r.snippet}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
