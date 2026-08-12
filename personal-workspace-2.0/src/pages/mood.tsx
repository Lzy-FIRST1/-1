import { useMemo, useState } from 'react';
import { Btn, Card, Empty, Field, Input, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { lastNDays, nowIso, todayStr } from '../lib/utils';
import { save } from '../lib/repo';
import { aiText } from '../lib/ai';
import { toast } from '../lib/toast';
import { MOOD_LABELS, type MoodEntry } from '../lib/types';

const EMOJI: Record<string, string> = {
  开心: '😊', 平静: '😌', 焦虑: '😰', 疲惫: '😪', 兴奋: '🤩', 压力大: '😣', 低落: '😞', 烦躁: '😤', 感恩: '🙏', 期待: '🌟'
};

export default function Mood() {
  const { user } = useWorkspace();
  const moods = useRecords<MoodEntry>('mood');
  const today = todayStr();
  const [score, setScore] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [busy, setBusy] = useState(false);

  const todayEntry = moods.find((m) => m.date === today);

  const saveToday = async () => {
    if (score === null) return;
    const ts = nowIso();
    const m: MoodEntry = {
      ...(todayEntry || { id: today, createdAt: ts, updatedAt: ts, date: today }),
      score, label: label || (score >= 7 ? '开心' : score >= 5 ? '平静' : '疲惫'),
      note: note || undefined,
      updatedAt: ts
    };
    await save('mood', m, user?.id || 'local');
    toast('心情已记录', 'ok');
  };

  const last30 = useMemo(() => {
    const days = lastNDays(30);
    return days.map((d) => {
      const m = moods.find((x) => x.date === d);
      return { date: d, score: m?.score ?? null };
    });
  }, [moods]);

  const avg = (n: number) => {
    const list = last30.filter((x) => x.score !== null).slice(-n).map((x) => x.score as number);
    return list.length ? (list.reduce((a, b) => a + b, 0) / list.length).toFixed(1) : '—';
  };

  const analyze = async () => {
    setBusy(true);
    const days = last30.filter((x) => x.score !== null);
    const low = days.filter((x) => (x.score as number) <= 4);
    let text = '';
    if (low.length) {
      text = `近 30 天有 ${low.length} 天情绪偏低（${low.map((d) => `${d.date.slice(5)}:${d.score}`).join('、')}）。建议回看这些天的日记和反刍记录，找出共同诱因。`;
    } else if (days.length) {
      text = `近 30 天整体情绪稳定（平均 ${avg(30)} 分）。`;
    } else {
      text = '还没有足够的心情数据。';
    }
    const ai = await aiText(`请根据近期心情数据 ${JSON.stringify(last30.filter((x) => x.score))} 分析情绪模式，用 2-3 句话。`);
    setAnalysis(ai ? `${text}\n${ai}` : text);
    setBusy(false);
  };

  const points = last30.filter((x) => x.score !== null).map((x) => x.score as number);

  return (
    <div className="space-y-4">
      <Card title="今天的心情">
        {todayEntry ? (
          <div className="flex items-center gap-4">
            <div className="text-4xl">{EMOJI[todayEntry.label] || '😐'}</div>
            <div>
              <div className="tnum text-2xl font-bold">{todayEntry.score}<span className="text-sm font-normal text-[var(--text-2)]">/10</span></div>
              <div className="text-sm text-[var(--text-2)]">{todayEntry.label}{todayEntry.note ? ` · ${todayEntry.note}` : ''}</div>
            </div>
            <button onClick={() => { setScore(todayEntry.score); setLabel(todayEntry.label); setNote(todayEntry.note || ''); }} className="ml-auto text-xs text-[var(--accent)]">修改</button>
          </div>
        ) : (
          <div>
            <div className="label mb-2">打分（1-10）</div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setScore(s)}
                  className={`tnum h-10 w-10 rounded-xl border text-sm font-semibold transition-colors ${
                    score === s ? 'border-[var(--accent)] bg-[rgba(10,132,255,.1)] text-[var(--accent)]' : 'border-[var(--line)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="label mb-2">情绪标签</div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {MOOD_LABELS.map((l) => (
                <button key={l} onClick={() => setLabel(l)}>
                  <Tag tone={label === l ? 'on' : 'default'} className="!text-[13px] !py-1.5 !px-3">
                    {EMOJI[l]} {l}
                  </Tag>
                </button>
              ))}
            </div>
            <Field label="备注（可选）">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="发生了什么？" />
            </Field>
            <div className="mt-3 flex justify-end">
              <Btn onClick={() => void saveToday()} disabled={score === null}>保存</Btn>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <div className="card-flat p-3.5"><div className="label">近 7 天均值</div><div className="tnum mt-1 text-xl font-semibold">{avg(7)}</div></div>
        <div className="card-flat p-3.5"><div className="label">近 30 天均值</div><div className="tnum mt-1 text-xl font-semibold">{avg(30)}</div></div>
        <div className="card-flat p-3.5"><div className="label">记录天数</div><div className="tnum mt-1 text-xl font-semibold">{points.length}</div></div>
      </div>

      <Card
        title="情绪趋势（30 天）"
        action={<Btn size="sm" variant="soft" onClick={() => void analyze()} disabled={busy}><Icon name="sparkles" size={13} />{busy ? '分析中…' : 'AI 情绪分析'}</Btn>}
      >
        {points.length >= 2 ? (
          <div className="card-flat p-3">
            <svg viewBox="0 0 300 90" className="w-full">
              <line x1="0" y1="45" x2="300" y2="45" stroke="var(--line)" strokeDasharray="4 4" />
              <polyline
                points={points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * 300},${90 - 8 - (p - 1) * 8}`).join(' ')}
                fill="none" stroke="var(--violet)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
              />
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--text-3)]">
              <span>{last30[0]?.date.slice(5)}</span><span>{last30[last30.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        ) : (
          <Empty icon="sparkles" text="记录 2 天以上才能看到趋势。" />
        )}
        {analysis && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed">{analysis}</p>}
      </Card>

      <Card title="历史心情">
        {moods.length === 0 ? (
          <Empty icon="sparkles" text="还没有心情记录。" />
        ) : (
          <div className="space-y-1.5">
            {[...moods].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((m) => (
              <div key={m.date} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
                <span className="text-lg">{EMOJI[m.label] || '😐'}</span>
                <span className="w-24 text-[var(--text-2)]">{m.date}</span>
                <span className="tnum font-semibold">{m.score}/10</span>
                <span className="text-xs text-[var(--text-3)]">{m.label}</span>
                {m.note && <span className="ml-auto hidden truncate text-xs text-[var(--text-3)] sm:block">{m.note}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
