import { useState, type ChangeEvent } from 'react';
import { Btn, Card, Empty, Field, Seg, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { formatCN, monthKey, monthLabel, nowIso, todayStr, weekStart } from '../lib/utils';
import { newId, save } from '../lib/repo';
import { aiText } from '../lib/ai';
import { toast } from '../lib/toast';
import type { Review, ReviewType, Ritual } from '../lib/types';

const EMPTY_REVIEW = { biggestGain: '', biggestWaste: '', efficiencyReason: '', learned: '', tomorrowFirst: '', problems: '', tomorrowPriority: '', aiSummary: '' };

export default function Reviews() {
  const { user } = useWorkspace();
  const reviews = useRecords<Review>('review');
  const rituals = useRecords<Ritual>('ritual');
  const [type, setType] = useState<ReviewType>('daily');
  const [form, setForm] = useState({ ...EMPTY_REVIEW });
  const [aiLoading, setAiLoading] = useState(false);
  const today = todayStr();
  const ws = weekStart();
  const mk = monthKey(today);

  const period = type === 'daily' ? today : type === 'weekly' ? ws : mk;
  const periodLabel = type === 'daily' ? formatCN(today) : type === 'weekly' ? `本周（${formatCN(ws)} 起）` : monthLabel(mk);
  const existing = reviews.find((r) => r.type === type && r.date === period);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const startNew = () => {
    if (existing) {
      setForm({
        biggestGain: existing.biggestGain || '',
        biggestWaste: existing.biggestWaste || '',
        efficiencyReason: existing.efficiencyReason || '',
        learned: existing.learned || '',
        tomorrowFirst: existing.tomorrowFirst || '',
        problems: existing.problems || '',
        tomorrowPriority: existing.tomorrowPriority || '',
        aiSummary: existing.aiSummary || ''
      });
    } else {
      const ritual = rituals.find((r) => r.date === today);
      setForm({
        ...EMPTY_REVIEW,
        tomorrowFirst: ritual?.ifOnlyOne || ritual?.mostImportant || '',
        tomorrowPriority: type === 'weekly' ? ritual?.ifOnlyOne || '' : ''
      });
    }
  };

  const submit = async () => {
    const ts = nowIso();
    const review: Review = {
      ...(existing || { id: type === 'daily' ? `daily:${period}` : `${type}:${period}`, createdAt: ts, updatedAt: ts }),
      type, date: period, ...form, updatedAt: ts
    };
    await save('review', review, user?.id || 'local');
    toast('复盘已保存', 'ok');
  };

  const aiSummarize = async () => {
    setAiLoading(true);
    const recent = reviews
      .filter((r) => r.type === 'daily')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
    const ritual = rituals.find((r) => r.date === today);
    const material = [
      ritual ? `今日最重要：${ritual.mostImportant}；为什么：${ritual.why}；风险：${ritual.risk}` : '',
      ...recent.map((r) => `[${formatCN(r.date)}] 收获：${r.biggestGain || '无'}；浪费：${r.biggestWaste || '无'}；效率原因：${r.efficiencyReason || '无'}；学到：${r.learned || '无'}`)
    ].filter(Boolean).join('\n');
    let summary = '';
    if (material) {
      const ai = await aiText(`请根据以下最近记录，用 3-5 句话帮我总结近期的成长模式、需要注意的浪费点，并给出 1 条下周建议。\n\n${material.slice(0, 3500)}`);
      summary = ai || '';
    }
    if (!summary) {
      const gains = recent.filter((r) => r.biggestGain).length;
      const wastes = recent.filter((r) => r.biggestWaste).length;
      summary = `近 7 天记录了 ${recent.length} 天复盘。有明确收获的有 ${gains} 天；识别出时间浪费的有 ${wastes} 天。建议：把「${ritual?.ifOnlyOne || '明天第一件事'}」设为每日底线，睡前复盘时对照检查。`;
    }
    setForm((f) => ({ ...f, aiSummary: summary }));
    setAiLoading(false);
    toast('已生成成长总结', 'ok');
  };

  const dailyFields = [
    { key: 'biggestGain' as const, label: '今天最大的收获', ph: '做成了什么？学到了什么？' },
    { key: 'biggestWaste' as const, label: '今天最大的浪费', ph: '时间花在了哪里？什么不值得？' },
    { key: 'efficiencyReason' as const, label: '为什么效率高（或低）', ph: '找出原因，明天复制或避开。' },
    { key: 'learned' as const, label: '今天学到了什么', ph: '一个知识点、一句提醒都可以。' },
    { key: 'tomorrowFirst' as const, label: '明天第一件事', ph: '起床后最先做的那件事。' }
  ];
  const weeklyFields = [
    { key: 'biggestGain' as const, label: '本周完成了什么', ph: '挑最重要的 3 件。' },
    { key: 'problems' as const, label: '遇到什么问题', ph: '卡住的地方、没完成的事。' },
    { key: 'tomorrowPriority' as const, label: '下周优先级', ph: '下周最重要的 3 件事。' }
  ];
  const monthlyFields = [
    { key: 'biggestGain' as const, label: '本月完成了什么', ph: '与上月相比，进步在哪里？' },
    { key: 'problems' as const, label: '本月问题', ph: '反复出现的问题是什么？' },
    { key: 'learned' as const, label: '本月学到什么', ph: '认知、技能、习惯。' },
    { key: 'tomorrowPriority' as const, label: '下月优先级', ph: '下个月最重要的目标。' }
  ];
  const fields = type === 'daily' ? dailyFields : type === 'weekly' ? weeklyFields : monthlyFields;

  const list = reviews.filter((r) => r.type === type).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          options={[
            { value: 'daily', label: '每日' },
            { value: 'weekly', label: '每周' },
            { value: 'monthly', label: '每月' }
          ]}
          value={type}
          onChange={(v) => { setType(v); setForm({ ...EMPTY_REVIEW }); }}
        />
        <Btn variant="soft" size="sm" onClick={() => void aiSummarize()} disabled={aiLoading}>
          <Icon name="sparkles" size={13} />{aiLoading ? '总结中…' : 'AI 成长总结'}
        </Btn>
      </div>

      <Card title={`${type === 'daily' ? '今日' : type === 'weekly' ? '本周' : '本月'}复盘 · ${periodLabel}`} action={existing ? <Btn size="sm" variant="ghost" onClick={startNew}>编辑</Btn> : undefined}>
        <div className="space-y-4">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              <Textarea rows={2} value={form[f.key]} onChange={set(f.key)} placeholder={f.ph} />
            </Field>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <p className="text-xs text-[var(--text-3)]">建议晚上固定时间做，5 分钟就够。</p>
            <Btn onClick={() => void submit()}>保存{existing ? '修改' : ''}</Btn>
          </div>
        </div>
      </Card>

      <Card title="历史复盘">
        {list.length === 0 ? (
          <Empty icon="clipboard" text="还没有复盘记录。" />
        ) : (
          <div className="space-y-2.5">
            {list.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--line)] p-3.5">
                <div className="mb-1 text-xs font-semibold text-[var(--text-2)]">
                  {type === 'daily' ? formatCN(r.date) : type === 'weekly' ? `周复盘 ${formatCN(r.date)}` : monthLabel(r.date)}
                </div>
                {r.biggestGain && <p className="text-sm"><span className="text-[var(--green)]">收获：</span>{r.biggestGain}</p>}
                {r.biggestWaste && <p className="mt-0.5 text-sm"><span className="text-[var(--red)]">浪费：</span>{r.biggestWaste}</p>}
                {r.tomorrowFirst && <p className="mt-0.5 text-sm"><span className="text-[var(--accent)]">下一步：</span>{r.tomorrowFirst}</p>}
                {r.aiSummary && <p className="mt-1.5 rounded-lg bg-[var(--surface-2)] p-2.5 text-xs leading-relaxed text-[var(--text-2)]">✦ {r.aiSummary}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
