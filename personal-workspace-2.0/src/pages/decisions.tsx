import { useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, Stat, Tag, Textarea } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { addDays, daysBetween, formatCN, nowIso, todayStr } from '../lib/utils';
import { newId, remove, save } from '../lib/repo';
import { toast } from '../lib/toast';
import type { DecisionLog } from '../lib/types';

export default function Decisions() {
  const { user } = useWorkspace();
  const decisions = useRecords<DecisionLog>('decision');
  const today = todayStr();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ decision: '', reason: '', info: '', expected: '' });
  const [reviewing, setReviewing] = useState<DecisionLog | null>(null);
  const [reviewText, setReviewText] = useState('');

  const submit = async () => {
    if (!form.decision.trim()) return;
    const ts = nowIso();
    const d: DecisionLog = {
      id: newId(), createdAt: ts, updatedAt: ts,
      decision: form.decision.trim(),
      reason: form.reason.trim(),
      info: form.info.trim(),
      expected: form.expected.trim(),
      reviewDueAt: addDays(today, 90)
    };
    await save('decision', d, user?.id || 'local');
    setForm({ decision: '', reason: '', info: '', expected: '' });
    setShowAdd(false);
    toast('决策已存入决策库', 'ok');
  };

  const submitReview = async () => {
    if (!reviewing || !reviewText.trim()) return;
    const d = { ...reviewing, review: reviewText.trim(), reviewedAt: nowIso(), updatedAt: nowIso() };
    await save('decision', d, user?.id || 'local');
    setReviewing(null);
    setReviewText('');
    toast('回顾已保存，经验入库', 'ok');
  };

  const sorted = [...decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reviewed = decisions.filter((d) => d.reviewedAt);
  const overdue = decisions.filter((d) => !d.reviewedAt && d.reviewDueAt && d.reviewDueAt <= today);

  const status = (d: DecisionLog) => {
    if (d.reviewedAt) return <Tag tone="green">已回顾</Tag>;
    if (d.reviewDueAt && d.reviewDueAt <= today) return <Tag tone="red">逾期回顾</Tag>;
    return <Tag>待回顾</Tag>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">决策日志</h2>
        <Btn onClick={() => { setForm({ decision: '', reason: '', info: '', expected: '' }); setShowAdd(true); }}>
          <Icon name="plus" size={15} />记录决策
        </Btn>
      </div>

      {overdue.length > 0 && (
        <div className="card-flat flex items-center gap-2 border-[rgba(255,59,48,.3)] p-3.5 text-sm">
          <Icon name="bell" size={16} className="text-[var(--red)]" />
          <span><b>{overdue.length}</b> 条决策已到回顾时间，看看结果是否符合预期。</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat icon="scale" label="决策总数" value={decisions.length} />
        <Stat icon="checkCircle" label="已回顾" value={reviewed.length} />
        <Stat icon="clock" label="待回顾" value={decisions.length - reviewed.length} />
      </div>

      <Card title="决策经验库">
        {sorted.length === 0 ? (
          <Empty icon="scale" text="每次重要决定都记下来，三个月后回顾，你会拥有一套自己的决策经验。" />
        ) : (
          <div className="space-y-2.5">
            {sorted.map((d) => (
              <div key={d.id} className="group rounded-xl border border-[var(--line)] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{d.decision}</span>
                  {status(d)}
                  <span className="text-[11px] text-[var(--text-3)]">{formatCN(d.createdAt.slice(0, 10))}</span>
                </div>
                {d.reason && <p className="mt-1.5 text-xs text-[var(--text-2)]"><span className="text-[var(--accent)]">理由：</span>{d.reason}</p>}
                {d.expected && <p className="mt-0.5 text-xs text-[var(--text-2)]"><span className="text-[var(--amber)]">预期：</span>{d.expected}</p>}
                {d.review && (
                  <p className="mt-2 rounded-lg bg-[var(--surface-2)] p-2.5 text-xs leading-relaxed text-[var(--text-2)]">
                    <span className="text-[var(--green)]">回顾：</span>{d.review}
                  </p>
                )}
                <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!d.reviewedAt && (
                    <Btn size="sm" variant="soft" onClick={() => { setReviewing(d); setReviewText(d.review || ''); }}>
                      回顾
                    </Btn>
                  )}
                  <Btn size="sm" variant="ghost" onClick={() => void remove('decision', d.id)}>删除</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="记录一次重要决策">
        <div className="space-y-3.5">
          <Field label="决策内容"><Input value={form.decision} onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value }))} placeholder="例如：要不要接这个项目" autoFocus /></Field>
          <Field label="为什么这样决定"><Textarea rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="当时的权衡是什么？" /></Field>
          <Field label="当时掌握的信息"><Textarea rows={2} value={form.info} onChange={(e) => setForm((f) => ({ ...f, info: e.target.value }))} placeholder="有哪些事实、数据、别人的经验？" /></Field>
          <Field label="预期结果" hint="90 天后会自动进入回顾期"><Textarea rows={2} value={form.expected} onChange={(e) => setForm((f) => ({ ...f, expected: e.target.value }))} placeholder="希望出现什么结果？" /></Field>
          <Btn className="w-full" onClick={() => void submit()} disabled={!form.decision.trim()}>存入决策库</Btn>
        </div>
      </Modal>

      <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title="三个月后回顾">
        <div className="space-y-3.5">
          {reviewing && (
            <>
              <p className="rounded-xl bg-[var(--surface-2)] p-3 text-sm"><b>{reviewing.decision}</b><br /><span className="text-xs text-[var(--text-2)]">预期：{reviewing.expected}</span></p>
              <Field label="结果与当初的预期一致吗？学到了什么？">
                <Textarea rows={5} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="结果如何？当初的判断哪里对了、哪里错了？下次会怎么调整？" />
              </Field>
              <Btn className="w-full" onClick={() => void submitReview()} disabled={!reviewText.trim()}>保存回顾</Btn>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
