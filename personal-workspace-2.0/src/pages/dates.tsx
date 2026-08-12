import { useState } from 'react';
import { Btn, Card, Empty, Field, Input, Modal, Select, Tag } from '../components/ui';
import { Icon } from '../components/icons';
import { useRecords } from '../lib/hooks';
import { useWorkspace } from '../store';
import { daysBetween, formatCN, nowIso, todayStr } from '../lib/utils';
import { newId, remove, save } from '../lib/repo';
import { toast } from '../lib/toast';
import { DATE_KIND_LABEL, type DateKind, type ImportantDate } from '../lib/types';

export default function Dates() {
  const { user } = useWorkspace();
  const dates = useRecords<ImportantDate>('importantDate');
  const today = todayStr();
  const [editing, setEditing] = useState<ImportantDate | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', date: today, type: 'other' as DateKind, remindDays: '7,3,1' });

  const openAdd = () => { setEditing(null); setForm({ title: '', date: today, type: 'other', remindDays: '7,3,1' }); setShowAdd(true); };
  const openEdit = (d: ImportantDate) => {
    setEditing(d);
    setForm({ title: d.title, date: d.date, type: d.type, remindDays: d.remindDays.join(',') });
    setShowAdd(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.date) return;
    const ts = nowIso();
    const d: ImportantDate = {
      ...(editing || { id: newId(), createdAt: ts, updatedAt: ts, done: false }),
      title: form.title.trim(),
      date: form.date,
      type: form.type,
      remindDays: form.remindDays.split(/[,，]/).map((s) => Number(s)).filter((n) => n > 0),
      updatedAt: ts
    };
    await save('importantDate', d, user?.id || 'local');
    setShowAdd(false);
    toast(editing ? '已更新' : '已添加', 'ok');
  };

  const sorted = [...dates]
    .filter((d) => !d.done)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = [...dates]
    .filter((d) => d.done || d.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const daysText = (d: ImportantDate) => {
    const n = daysBetween(today, d.date);
    if (n === 0) return '就是今天';
    if (n > 0) return `${n} 天后`;
    return `${-n} 天前`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">重要日期</h2>
        <Btn onClick={openAdd}><Icon name="plus" size={15} />添加</Btn>
      </div>

      <Card title="进行中">
        {sorted.length === 0 ? (
          <Empty icon="calendar" text="还没有进行中的日期。" />
        ) : (
          <div className="space-y-2">
            {sorted.map((d) => {
              const n = daysBetween(today, d.date);
              return (
                <div key={d.id} className="group flex items-center gap-3 rounded-xl border border-[var(--line)] px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{d.title}</span>
                      <Tag>{DATE_KIND_LABEL[d.type]}</Tag>
                      {n <= 7 && n >= 0 && <Tag tone="amber">临近</Tag>}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-3)]">{formatCN(d.date)} · {daysText(d)}</div>
                  </div>
                  <div className="tnum text-xl font-bold" style={{ color: n <= 7 && n >= 0 ? 'var(--amber)' : 'var(--accent)' }}>{n >= 0 ? n : '✓'}</div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"><Icon name="pencil" size={15} /></button>
                    <button onClick={() => void remove('importantDate', d.id)} className="rounded-lg p-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {past.length > 0 && (
        <Card title="已过 / 已完成">
          <div className="space-y-1.5">
            {past.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm opacity-60">
                <span className="flex-1">{d.title}</span>
                <span className="text-xs">{formatCN(d.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editing ? '编辑日期' : '添加日期'}>
        <div className="space-y-3.5">
          <Field label="名称"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="考试 / 纪念日 / 截止日" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="日期"><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="类型">
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DateKind }))}>
                {(Object.keys(DATE_KIND_LABEL) as DateKind[]).map((k) => <option key={k} value={k}>{DATE_KIND_LABEL[k]}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="提前提醒（天，逗号分隔）" hint="例如 7,3,1 表示提前 7/3/1 天提醒">
            <Input value={form.remindDays} onChange={(e) => setForm((f) => ({ ...f, remindDays: e.target.value }))} />
          </Field>
          <Btn className="w-full" onClick={() => void submit()} disabled={!form.title.trim()}>保存</Btn>
        </div>
      </Modal>
    </div>
  );
}
